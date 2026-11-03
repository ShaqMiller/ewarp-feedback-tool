// Answers each endpoint from the demo tables, computing exactly what docs/API.md describes.
// The real backend replaces this file; nothing in the UI imports it directly.

import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "../errors";
import type { FeedbackApi } from "../index";
import {
  RESPONDENT_GROUP_LABELS,
  RESPONDENT_GROUPS,
  type ActivityEvent,
  type Coverage,
  type CurrentUser,
  type FeatureListItem,
  type FeatureView,
  type FeedbackEntry,
  type FeedbackInput,
  type Group,
  type Id,
  type ProjectFilters,
  type RespondentGroup,
  type ResponseStatus,
  type ResponseWithMentions,
  type Role,
  type Sentiment,
  type SentimentCounts,
  type SurveyResponse,
  type User,
  type Feature,
  type FeatureCreate,
  type VendorListItem,
  type VendorScore,
} from "../types";
import * as db from "./db";

const LATENCY = Number(process.env.DEMO_API_LATENCY_MS ?? 0);
const sleep = () => (LATENCY > 0 ? new Promise((r) => setTimeout(r, LATENCY)) : Promise.resolve());

const DAY = 86_400_000;
// List endpoints return a slimmer shape than the detail endpoints.
function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

const emptyCounts = (): SentimentCounts => ({ like: 0, dislike: 0, want: 0 });
const emptyGroups = (): Record<Group, number> => ({ pm: 0, sponsor: 0, other: 0 });

function projectOr404(projectId: Id) {
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new ApiError(404, `Project ${projectId} not found`);
  return project;
}

function featureOr404(projectId: Id, featureId: Id) {
  projectOr404(projectId);
  const feature = db.features.find((f) => f.id === featureId && f.projectId === projectId);
  if (!feature) throw new ApiError(404, `Feature ${featureId} not found in project ${projectId}`);
  return feature;
}

function vendorOr404(projectId: Id, vendorId: Id) {
  projectOr404(projectId);
  const vendor = db.vendors.find((v) => v.id === vendorId && v.projectId === projectId);
  if (!vendor) throw new ApiError(404, `Vendor ${vendorId} not found in project ${projectId}`);
  return vendor;
}

// Write validation. The rules match docs/openapi.yaml; messages are shown to people as-is.
const NAME_MAX = 80;
const NOTE_MAX = 1000;
const WEIGHT_MAX = 10;
const normalize = (name: string) => name.trim().replace(/\s+/g, " ");

function validFeatureName(projectId: Id, input: unknown, exceptId?: Id): string {
  if (typeof input !== "string" || input.trim() === "") throw new ApiError(400, "Enter a feature name.");
  const name = normalize(input);
  if (name.length > NAME_MAX) throw new ApiError(400, `Feature names can be at most ${NAME_MAX} characters.`);
  const taken = db.features.some(
    (f) => f.projectId === projectId && f.id !== exceptId && f.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw new ApiError(409, `A feature named "${name}" already exists in this project.`);
  return name;
}

function validVendorIds(projectId: Id, input: unknown): Id[] {
  if (!Array.isArray(input) || input.some((id) => typeof id !== "string")) {
    throw new ApiError(400, "vendorIds must be a list of vendor IDs.");
  }
  const ids = [...new Set(input as string[])];
  const unknown = ids.filter((id) => !db.vendors.some((v) => v.id === id && v.projectId === projectId));
  if (unknown.length > 0) throw new ApiError(400, `Unknown vendor ${unknown.length === 1 ? "ID" : "IDs"}: ${unknown.join(", ")}`);
  return ids;
}

function validFeedback(projectId: Id, input: unknown): Required<FeedbackInput> {
  const e = (input ?? {}) as Record<string, unknown>;
  if (!["like", "dislike", "want"].includes(e.kind as string)) throw new ApiError(400, "Choose like, dislike or want.");
  if (!RESPONDENT_GROUPS.includes(e.group as RespondentGroup)) throw new ApiError(400, "Choose which group said it.");
  const vendorId = e.vendorId === undefined || e.vendorId === null || e.vendorId === "" ? null : e.vendorId;
  if (vendorId !== null) validVendorIds(projectId, [vendorId]);
  if (e.note !== undefined && typeof e.note !== "string") throw new ApiError(400, "note must be text.");
  const note = ((e.note as string | undefined) ?? "").trim();
  if (note.length > NOTE_MAX) throw new ApiError(400, `Notes can be at most ${NOTE_MAX} characters.`);
  return { kind: e.kind as Sentiment, group: e.group as RespondentGroup, vendorId: vendorId as Id | null, note };
}

function validWeight(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input) || input < 0 || input > WEIGHT_MAX) {
    throw new ApiError(400, `Weights must be numbers from 0 to ${WEIGHT_MAX}.`);
  }
  return input;
}

// A vendor offers a feature, added once.
function addOffering(vendorId: Id, featureId: Id) {
  if (!db.offerings.some((o) => o.vendorId === vendorId && o.featureId === featureId)) db.offerings.push({ featureId, vendorId });
}

// A manual like or dislike about a vendor means the vendor has the feature (the classifier's rule for surveys).
function insertFeedback(projectId: Id, featureId: Id, f: Required<FeedbackInput>, userId: Id | null): FeedbackEntry {
  const row: db.FeedbackRow = {
    id: `fbk_${crypto.randomUUID().slice(0, 8)}`,
    projectId,
    featureId,
    vendorId: f.vendorId,
    kind: f.kind,
    group: f.group,
    note: f.note,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };
  db.feedback.push(row);
  if (row.vendorId && row.kind !== "want") addOffering(row.vendorId, featureId);
  return toFeedbackEntry(row);
}

function toFeedbackEntry(e: db.FeedbackRow): FeedbackEntry {
  const vendor = e.vendorId ? db.vendors.find((v) => v.id === e.vendorId) : undefined;
  const author = e.createdBy ? db.users.find((u) => u.id === e.createdBy) : undefined;
  return {
    id: e.id,
    kind: e.kind,
    group: e.group,
    vendor: vendor ? { id: vendor.id, name: vendor.name } : null,
    note: e.note,
    createdBy: author ? { id: author.id, name: author.name } : null,
    createdAt: e.createdAt,
  };
}

const toUser = (u: db.UserRow): User => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });
const toMe = (u: db.UserRow): CurrentUser => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const ROLES: Role[] = ["admin", "viewer"];
const PASSWORD_RULE = "Passwords must be 8 to 128 characters.";
const validPassword = (input: unknown) => typeof input === "string" && input.length >= 8 && input.length <= 128;

function validUserName(input: unknown) {
  if (typeof input !== "string" || input.trim() === "") throw new ApiError(400, "Enter a name.");
  const name = normalize(input);
  if (name.length > NAME_MAX) throw new ApiError(400, `Names can be at most ${NAME_MAX} characters.`);
  return name;
}

function userOr404(userId: Id) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new ApiError(404, `User ${userId} not found`);
  return user;
}

const adminCount = () => db.users.filter((u) => u.role === "admin").length;
const SESSION_HOURS = 12;

// Demo sign-in tokens are signed and carry the user, like a JWT, so any server instance can check them.
// (On Vercel each request can land on a different instance, so a session kept in memory would be lost.)
// Demo data only; set DEMO_SESSION_SECRET to keep the fallback secret out of play.
const SESSION_SECRET = process.env.DEMO_SESSION_SECRET ?? "ewarp-demo-session";
type TokenClaims = CurrentUser & { exp: number };
const sign = (payload: string) => createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");

function createToken(user: db.UserRow, exp: number) {
  const payload = Buffer.from(JSON.stringify({ ...toMe(user), exp } satisfies TokenClaims)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): TokenClaims | null {
  const [payload, signature] = token?.split(".") ?? [];
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as TokenClaims;
  return claims.exp > Date.now() ? claims : null;
}

function validVendorName(projectId: Id, input: unknown, exceptId?: Id): string {
  if (typeof input !== "string" || input.trim() === "") throw new ApiError(400, "Enter a vendor name.");
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length > NAME_MAX) throw new ApiError(400, `Vendor names can be at most ${NAME_MAX} characters.`);
  const taken = db.vendors.some(
    (v) => v.projectId === projectId && v.id !== exceptId && v.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw new ApiError(409, `A vendor named "${name}" already exists in this project.`);
  return name;
}

function validFeatureIds(projectId: Id, input: unknown): Id[] {
  if (!Array.isArray(input) || input.some((id) => typeof id !== "string")) {
    throw new ApiError(400, "featureIds must be a list of feature IDs.");
  }
  const ids = [...new Set(input as string[])];
  const unknown = ids.filter((id) => !db.features.some((f) => f.id === id && f.projectId === projectId));
  if (unknown.length > 0) throw new ApiError(400, `Unknown feature ${unknown.length === 1 ? "ID" : "IDs"}: ${unknown.join(", ")}`);
  return ids;
}

function responsesMentioning(featureId: Id) {
  const ids = new Set(db.mentions.filter((m) => m.featureId === featureId).map((m) => m.responseId));
  return db.responses.filter((r) => ids.has(r.id));
}

function toSurveyResponse(r: db.ResponseRow): SurveyResponse {
  const vendor = db.vendors.find((v) => v.id === r.vendorId)!;
  return {
    id: r.id,
    surveyId: r.surveyId,
    group: r.group,
    vendor: { id: vendor.id, name: vendor.name },
    submittedAt: r.submittedAt,
    likes: r.likes,
    dislikes: r.dislikes,
    wants: r.wants,
    analyzed: r.analyzedAt !== null,
  };
}

function withMentions(r: db.ResponseRow): ResponseWithMentions {
  return {
    ...toSurveyResponse(r),
    mentions: db.mentions
      .filter((m) => m.responseId === r.id)
      .map((m) => ({ feature: { id: m.featureId, name: db.features.find((f) => f.id === m.featureId)!.name }, kind: m.kind })),
  };
}

function responsesFor(projectId: Id, filters: ProjectFilters = {}) {
  const from = filters.from ? Date.parse(filters.from) : -Infinity;
  const to = filters.to ? Date.parse(filters.to) + DAY : Infinity; // `to` is inclusive
  return db.responses.filter((r) => {
    const t = Date.parse(r.submittedAt);
    return r.projectId === projectId && t >= from && t < to && (!filters.group || r.group === filters.group);
  });
}

function mentionsFor(responseIds: Set<Id>) {
  return db.mentions.filter((m) => responseIds.has(m.responseId));
}

// The three groups filters and charts use. pm and sponsor match a respondent group of the same name.
const broadGroup = (g: RespondentGroup): Group => (g === "pm" || g === "sponsor" ? g : "other");

// Every like / dislike / want: survey mentions plus manual feedback, after filters
// (the backend's feedback_mentions view). Counts and scores read these; response lists don't.
type Signal = { featureId: Id; kind: Sentiment; vendorId: Id | null; group: RespondentGroup };
function signalsFor(projectId: Id, filters: ProjectFilters = {}): Signal[] {
  const responses = new Map(responsesFor(projectId, filters).map((r) => [r.id, r]));
  const survey = db.mentions.flatMap((m) => {
    const r = responses.get(m.responseId);
    return r ? [{ featureId: m.featureId, kind: m.kind, vendorId: r.vendorId, group: r.group as RespondentGroup }] : [];
  });
  const manual = manualFor(projectId, filters).map((e) => ({ featureId: e.featureId, kind: e.kind, vendorId: e.vendorId, group: e.group }));
  return [...survey, ...manual];
}

// Manual feedback entries in the project, after filters.
function manualFor(projectId: Id, filters: ProjectFilters = {}) {
  const from = filters.from ? Date.parse(filters.from) : -Infinity;
  const to = filters.to ? Date.parse(filters.to) + DAY : Infinity;
  return db.feedback.filter((e) => {
    const t = Date.parse(e.createdAt);
    return e.projectId === projectId && t >= from && t < to && (!filters.group || broadGroup(e.group) === filters.group);
  });
}

const vendorIdsOf = (projectId: Id) => db.vendors.filter((v) => v.projectId === projectId).map((v) => v.id);
const offeredBy = (featureId: Id) => db.offerings.filter((o) => o.featureId === featureId).map((o) => o.vendorId);

// Responses an admin asked to reread, with when. Kept per server instance: it's only a demo of the "In queue" state.
const DEMO_REREAD_MS = 60_000;
const rereadQueue = new Map<Id, number>();
const isQueued = (responseId: Id) => Date.now() - (rereadQueue.get(responseId) ?? 0) < DEMO_REREAD_MS;

function coverageOf(featureId: Id, projectVendorIds: Id[]): Coverage {
  const count = offeredBy(featureId).filter((v) => projectVendorIds.includes(v)).length;
  if (count === 0) return "none";
  return count === projectVendorIds.length ? "all" : "some";
}

// Features at least one (filtered) response wants.
function requestedFeatureIds(projectId: Id, filters?: ProjectFilters) {
  return new Set(signalsFor(projectId, filters).filter((m) => m.kind === "want").map((m) => m.featureId));
}

function featureItems(projectId: Id, filters?: ProjectFilters): (FeatureListItem & { createdAt: string })[] {
  const vendorIds = vendorIdsOf(projectId);
  const ms = signalsFor(projectId, filters);
  return db.features
    .filter((f) => f.projectId === projectId)
    .map((f) => {
      const sentiment = emptyCounts();
      for (const m of ms) if (m.featureId === f.id) sentiment[m.kind] += 1;
      return {
        id: f.id,
        name: f.name,
        createdAt: f.createdAt,
        coverage: coverageOf(f.id, vendorIds),
        vendorIds: offeredBy(f.id),
        mentions: sentiment.like + sentiment.dislike + sentiment.want,
        sentiment,
        source: f.source,
        weight: f.weight,
      };
    });
}

function vendorItems(projectId: Id, filters?: ProjectFilters): (VendorListItem & { featureIds: Id[] })[] {
  const responses = responsesFor(projectId, filters);
  const requested = requestedFeatureIds(projectId, filters);
  const signals = signalsFor(projectId, filters);
  const scores = new Map(scoresFor(projectId).map((s) => [s.vendor.id, s.score])); // scores ignore filters
  return db.vendors
    .filter((v) => v.projectId === projectId)
    .map((v) => {
      const featureIds = db.offerings.filter((o) => o.vendorId === v.id).map((o) => o.featureId);
      const own = responses.filter((r) => r.vendorId === v.id);
      const sentiment = emptyCounts();
      for (const m of signals) if (m.vendorId === v.id) sentiment[m.kind] += 1;
      return {
        id: v.id,
        name: v.name,
        featureIds,
        responseCount: own.length,
        requestsMet: featureIds.filter((id) => requested.has(id)).length,
        requestsTotal: requested.size,
        featureCount: featureIds.length,
        exclusiveCount: featureIds.filter((id) => offeredBy(id).length === 1).length,
        sentiment,
        score: scores.get(v.id) ?? 0,
      };
    });
}

// Vendor scores, the same formula as the backend's ScoringRepository (see VendorScore in types.ts).
export const SCORE_MIX = { coverage: 0.7, satisfaction: 0.3 };
const groupWeight = (projectId: Id, group: RespondentGroup) =>
  db.groupWeights.find((w) => w.projectId === projectId && w.group === group)?.weight ?? 1;

function scoresFor(projectId: Id): VendorScore[] {
  const features = db.features.filter((f) => f.projectId === projectId);
  const signals = signalsFor(projectId);
  const sum = (kind: Sentiment, featureId: Id, vendorId?: Id) =>
    signals
      .filter((m) => m.kind === kind && m.featureId === featureId && (vendorId === undefined || m.vendorId === vendorId))
      .reduce((total, m) => total + groupWeight(projectId, m.group), 0);
  const demand = new Map(features.map((f) => [f.id, sum("want", f.id)]));

  return db.vendors
    .filter((v) => v.projectId === projectId)
    .map((v) => {
      const rows = features.map((f) => {
        const offers = db.offerings.some((o) => o.vendorId === v.id && o.featureId === f.id);
        return {
          f,
          offers,
          want: demand.get(f.id)!,
          like: offers ? sum("like", f.id, v.id) : 0,
          dislike: offers ? sum("dislike", f.id, v.id) : 0,
        };
      });
      const totalDemand = rows.reduce((t, r) => t + r.f.weight * r.want, 0);
      const metDemand = rows.reduce((t, r) => t + (r.offers ? r.f.weight * r.want : 0), 0);
      const net = rows.reduce((t, r) => t + r.f.weight * (r.like - r.dislike), 0);
      const volume = rows.reduce((t, r) => t + r.f.weight * (r.like + r.dislike), 0);
      const coverage = totalDemand > 0 ? metDemand / totalDemand : 1;
      const satisfaction = volume > 0 ? net / volume : 0;
      // Points each feature adds on top of the neutral baseline.
      const points = (r: (typeof rows)[number]) =>
        (totalDemand > 0 && r.offers ? (100 * SCORE_MIX.coverage * r.f.weight * r.want) / totalDemand : 0) +
        (volume > 0 ? (100 * (SCORE_MIX.satisfaction / 2) * r.f.weight * (r.like - r.dislike)) / volume : 0);
      const breakdown = rows
        .filter((r) => r.want > 0 || r.like > 0 || r.dislike > 0)
        .map((r) => ({
          feature: { id: r.f.id, name: r.f.name },
          weight: r.f.weight,
          demand: r.want,
          offers: r.offers,
          likes: r.like,
          dislikes: r.dislike,
          contribution: Math.round(points(r) * 10) / 10,
        }))
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
      return {
        vendor: { id: v.id, name: v.name },
        score: Math.round(100 * (SCORE_MIX.coverage * coverage + (SCORE_MIX.satisfaction * (satisfaction + 1)) / 2)),
        coverage: Math.round(coverage * 1000) / 1000,
        satisfaction: Math.round(satisfaction * 1000) / 1000,
        breakdown,
      };
    })
    .sort((a, b) => b.score - a.score || a.vendor.name.localeCompare(b.vendor.name));
}

// Monday 00:00 UTC of the week containing `t`.
function weekStart(t: number) {
  const d = new Date(t);
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY;
}

// The demo API without sign-in checks. demoApiFor (bottom of the file) adds them.
// The writes that need to know who is asking take the user's ID as an extra argument.
type DemoApi = Omit<FeedbackApi, "getMe" | "createFeature" | "addFeatureFeedback" | "deleteUser"> & {
  createFeature(projectId: Id, body: FeatureCreate, userId: Id | null): Promise<Feature>;
  addFeatureFeedback(projectId: Id, featureId: Id, body: FeedbackInput, userId: Id | null): Promise<FeedbackEntry>;
  deleteUser(userId: Id, currentUserId: Id): Promise<void>;
};

export const demoApi: DemoApi = {
  async login(body) {
    await sleep();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const user = db.users.find((u) => u.email === email);
    if (!user || user.password !== body?.password) throw new ApiError(401, "That email and password don't match.");
    const expiresAt = Date.now() + SESSION_HOURS * 3_600_000;
    return { token: createToken(user, expiresAt), expiresAt: new Date(expiresAt).toISOString(), user: toMe(user) };
  },

  async listUsers() {
    await sleep();
    const items = [...db.users].sort((a, b) => a.name.localeCompare(b.name)).map(toUser);
    return { items, total: items.length };
  },

  async createUser(body) {
    await sleep();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new ApiError(400, "Enter a valid email.");
    const name = validUserName(body?.name);
    if (!validPassword(body?.password)) throw new ApiError(400, PASSWORD_RULE);
    if (!ROLES.includes(body?.role)) throw new ApiError(400, "role must be admin or viewer.");
    if (db.users.some((u) => u.email === email)) throw new ApiError(409, `A user with the email ${email} already exists.`);
    const user: db.UserRow = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      email,
      name,
      role: body.role,
      password: body.password,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return toUser(user);
  },

  async updateUser(userId, body) {
    await sleep();
    const user = userOr404(userId);
    if (body?.name === undefined && body?.role === undefined && body?.password === undefined) {
      throw new ApiError(400, "Send at least one of name, role or password.");
    }
    const name = body.name === undefined ? undefined : validUserName(body.name);
    if (body.role !== undefined && !ROLES.includes(body.role)) throw new ApiError(400, "role must be admin or viewer.");
    if (body.password !== undefined && !validPassword(body.password)) throw new ApiError(400, PASSWORD_RULE);
    if (user.role === "admin" && body.role === "viewer" && adminCount() <= 1) {
      throw new ApiError(409, "This is the only admin. Make someone else an admin first.");
    }
    if (name !== undefined) user.name = name;
    if (body.role !== undefined) user.role = body.role;
    if (body.password !== undefined) user.password = body.password;
    return toUser(user);
  },

  async deleteUser(userId, currentUserId) {
    await sleep();
    if (userId === currentUserId) throw new ApiError(409, "You can't delete your own account.");
    const user = userOr404(userId);
    if (user.role === "admin" && adminCount() <= 1) throw new ApiError(409, "This is the only admin, so it can't be deleted.");
    db.users.splice(db.users.indexOf(user), 1);
  },

  async listProjects() {
    await sleep();
    const items = db.projects.map((p) => {
      const rs = responsesFor(p.id);
      return {
        id: p.id,
        name: p.name,
        responseCount: rs.length,
        lastResponseAt: rs.map((r) => r.submittedAt).sort().at(-1) ?? null,
      };
    });
    return { items, total: items.length };
  },

  async getProject(projectId) {
    await sleep();
    const p = projectOr404(projectId);
    const rs = responsesFor(projectId);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      lastResponseAt: rs.map((r) => r.submittedAt).sort().at(-1) ?? null,
      counts: {
        features: db.features.filter((f) => f.projectId === projectId).length,
        vendors: vendorIdsOf(projectId).length,
        responses: rs.length,
        surveys: db.surveys.filter((s) => s.projectId === projectId).length,
      },
    };
  },

  async getSummary(projectId, filters) {
    await sleep();
    projectOr404(projectId);
    const rs = responsesFor(projectId, filters);
    const ms = signalsFor(projectId, filters);
    const sentiment = emptyCounts();
    for (const m of ms) sentiment[m.kind] += 1;
    const requested = requestedFeatureIds(projectId, filters);
    const weekAgo = Date.now() - 7 * DAY;
    return {
      responses: {
        total: rs.length,
        thisWeek: rs.filter((r) => Date.parse(r.submittedAt) >= weekAgo).length,
      },
      features: {
        total: db.features.filter((f) => f.projectId === projectId).length,
        mentions: ms.length,
      },
      requests: {
        total: requested.size,
        unmet: [...requested].filter((id) => offeredBy(id).length === 0).length,
      },
      sentiment,
      analysis: { processed: rs.filter((r) => r.analyzedAt).length, total: rs.length },
    };
  },

  async getResponsesByWeek(projectId, { weeks = 6, ...filters } = {}) {
    await sleep();
    projectOr404(projectId);
    const current = weekStart(Date.now());
    const buckets = Array.from({ length: weeks }, (_, i) => ({
      start: current - (weeks - 1 - i) * 7 * DAY,
      counts: emptyGroups(),
    }));
    for (const r of responsesFor(projectId, filters)) {
      const bucket = buckets.find((b) => b.start === weekStart(Date.parse(r.submittedAt)));
      if (bucket) bucket.counts[r.group] += 1;
    }
    return {
      weeks: buckets.map((b) => ({ weekStart: new Date(b.start).toISOString().slice(0, 10), counts: b.counts })),
    };
  },

  async getCoverage(projectId) {
    await sleep();
    projectOr404(projectId);
    const result = { all: 0, some: 0, none: 0, total: 0 };
    for (const f of featureItems(projectId)) {
      result[f.coverage] += 1;
      result.total += 1;
    }
    return result;
  },

  async listFeatures(projectId, { view = "all", q, sort = "mentions", limit, ...filters } = {}) {
    await sleep();
    projectOr404(projectId);
    const term = q?.trim().toLowerCase();
    const searched = featureItems(projectId, filters).filter((f) => !term || f.name.toLowerCase().includes(term));

    const inView: Record<FeatureView, (f: FeatureListItem) => boolean> = {
      all: () => true,
      requested: (f) => f.sentiment.want > 0,
      gap: (f) => f.coverage === "none",
      pain: (f) => f.sentiment.dislike > 0,
    };
    const facets = { all: 0, requested: 0, gap: 0, pain: 0 };
    for (const f of searched) {
      for (const v of Object.keys(facets) as FeatureView[]) if (inView[v](f)) facets[v] += 1;
    }

    const matches = searched.filter(inView[view]).sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name);
      return b.mentions - a.mentions || a.createdAt.localeCompare(b.createdAt);
    });
    const items = (limit ? matches.slice(0, limit) : matches).map((f) => omit(f, "createdAt"));
    return { items, total: matches.length, facets };
  },

  async getFeature(projectId, featureId) {
    await sleep();
    projectOr404(projectId);
    const feature = featureItems(projectId).find((f) => f.id === featureId);
    if (!feature) throw new ApiError(404, `Feature ${featureId} not found in project ${projectId}`);
    return feature;
  },

  async createFeature(projectId, body, userId) {
    await sleep();
    projectOr404(projectId);
    const name = validFeatureName(projectId, body?.name);
    const vendorIds = body?.vendorIds === undefined ? [] : validVendorIds(projectId, body.vendorIds);
    if (body?.feedback !== undefined && (!Array.isArray(body.feedback) || body.feedback.length > 50)) {
      throw new ApiError(400, "feedback must be a list of up to 50 entries.");
    }
    const feedback = (body?.feedback ?? []).map((e) => validFeedback(projectId, e));
    const id = `ftr_${crypto.randomUUID().slice(0, 8)}`;
    db.features.push({ id, projectId, name, createdAt: new Date().toISOString(), source: "manual", weight: 1 });
    for (const vendorId of vendorIds) addOffering(vendorId, id);
    for (const e of feedback) insertFeedback(projectId, id, e, userId);
    return demoApi.getFeature(projectId, id);
  },

  async updateFeature(projectId, featureId, body) {
    await sleep();
    const feature = featureOr404(projectId, featureId);
    if (body?.name === undefined && body?.vendorIds === undefined) throw new ApiError(400, "Send a name, vendorIds, or both.");
    const name = body.name === undefined ? undefined : validFeatureName(projectId, body.name, featureId);
    const vendorIds = body.vendorIds === undefined ? undefined : validVendorIds(projectId, body.vendorIds);
    if (name !== undefined) feature.name = name;
    if (vendorIds !== undefined) {
      // Replace the vendors that offer this feature with exactly the given list.
      for (let i = db.offerings.length - 1; i >= 0; i--) if (db.offerings[i].featureId === featureId) db.offerings.splice(i, 1);
      for (const vendorId of vendorIds) addOffering(vendorId, featureId);
    }
    return demoApi.getFeature(projectId, featureId);
  },

  async deleteFeature(projectId, featureId) {
    await sleep();
    const feature = featureOr404(projectId, featureId);
    if (feature.source !== "manual") throw new ApiError(409, "This feature came from survey answers, so it can't be deleted.");
    const mentions = db.mentions.filter((m) => m.featureId === featureId).length;
    if (mentions > 0) throw new ApiError(409, `Survey answers mention this feature ${mentions} times, so it can't be deleted.`);
    db.features.splice(db.features.indexOf(feature), 1);
    for (let i = db.offerings.length - 1; i >= 0; i--) if (db.offerings[i].featureId === featureId) db.offerings.splice(i, 1);
    for (let i = db.feedback.length - 1; i >= 0; i--) if (db.feedback[i].featureId === featureId) db.feedback.splice(i, 1);
  },

  async listFeatureFeedback(projectId, featureId) {
    await sleep();
    featureOr404(projectId, featureId);
    const items = db.feedback
      .filter((e) => e.featureId === featureId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toFeedbackEntry);
    return { items, total: items.length };
  },

  async addFeatureFeedback(projectId, featureId, body, userId) {
    await sleep();
    featureOr404(projectId, featureId);
    return insertFeedback(projectId, featureId, validFeedback(projectId, body), userId);
  },

  async deleteFeatureFeedback(projectId, featureId, entryId) {
    await sleep();
    featureOr404(projectId, featureId);
    const i = db.feedback.findIndex((e) => e.id === entryId && e.featureId === featureId);
    if (i === -1) throw new ApiError(404, `Feedback ${entryId} not found`);
    db.feedback.splice(i, 1);
  },

  async getFeatureSummary(projectId, featureId) {
    await sleep();
    featureOr404(projectId, featureId);
    const rs = responsesMentioning(featureId);
    const text = db.featureSummaries[featureId] ?? null;
    return {
      text,
      basedOn: text ? rs.length : 0,
      generatedAt: text ? (rs.map((r) => r.analyzedAt ?? "").sort().at(-1) ?? null) : null,
    };
  },

  async listFeatureResponses(projectId, featureId, { kind, limit, ...filters } = {}) {
    await sleep();
    featureOr404(projectId, featureId);
    const inScope = new Set(responsesFor(projectId, filters).map((r) => r.id));
    const all = responsesMentioning(featureId)
      .filter((r) => inScope.has(r.id))
      .map((r) => ({
        ...toSurveyResponse(r),
        kinds: [...new Set(db.mentions.filter((m) => m.responseId === r.id && m.featureId === featureId).map((m) => m.kind))],
      }))
      .filter((r) => !kind || r.kinds.includes(kind))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return { items: limit ? all.slice(0, limit) : all, total: all.length };
  },

  async listFeatureVendors(projectId, featureId) {
    await sleep();
    featureOr404(projectId, featureId);
    const offering = offeredBy(featureId);
    const items = db.vendors
      .filter((v) => v.projectId === projectId)
      .map((v) => {
        const sentiment = emptyCounts();
        for (const m of signalsFor(projectId)) if (m.featureId === featureId && m.vendorId === v.id) sentiment[m.kind] += 1;
        return { vendor: { id: v.id, name: v.name }, offers: offering.includes(v.id), sentiment };
      })
      .sort((a, b) => Number(b.offers) - Number(a.offers) || a.vendor.name.localeCompare(b.vendor.name));
    return { items, total: items.length };
  },

  async listRelatedFeatures(projectId, featureId, { limit } = {}) {
    await sleep();
    featureOr404(projectId, featureId);
    const shared = new Map<Id, Set<Id>>(); // related feature -> responses it shares with this one
    for (const r of responsesMentioning(featureId)) {
      for (const m of db.mentions) {
        if (m.responseId !== r.id || m.featureId === featureId) continue;
        shared.set(m.featureId, (shared.get(m.featureId) ?? new Set()).add(r.id));
      }
    }
    const vendorIds = vendorIdsOf(projectId);
    const all = [...shared.entries()]
      .map(([id, rs]) => ({
        id,
        name: db.features.find((f) => f.id === id)!.name,
        coverage: coverageOf(id, vendorIds),
        sharedResponses: rs.size,
      }))
      .sort((a, b) => b.sharedResponses - a.sharedResponses || a.name.localeCompare(b.name));
    return { items: limit ? all.slice(0, limit) : all, total: all.length };
  },

  async listVendors(projectId, { sort = "score", limit, ...filters } = {}) {
    await sleep();
    projectOr404(projectId);
    const fit = (a: VendorListItem, b: VendorListItem) =>
      b.requestsMet - a.requestsMet || b.responseCount - a.responseCount || a.name.localeCompare(b.name);
    const all = vendorItems(projectId, filters).sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : sort === "fit" ? fit(a, b) : b.score - a.score || fit(a, b),
    );
    const items = (limit ? all.slice(0, limit) : all).map((v) => omit(v, "featureIds"));
    return { items, total: all.length };
  },

  async getVendor(projectId, vendorId) {
    await sleep();
    projectOr404(projectId);
    const vendor = vendorItems(projectId).find((v) => v.id === vendorId);
    if (!vendor) throw new ApiError(404, `Vendor ${vendorId} not found in project ${projectId}`);
    return vendor;
  },

  // Demo writes change the in-memory tables, so they reset when the server restarts.
  async createVendor(projectId, body) {
    await sleep();
    projectOr404(projectId);
    const name = validVendorName(projectId, body?.name);
    const id = `vnd_${crypto.randomUUID().slice(0, 8)}`;
    db.vendors.push({ id, projectId, name });
    return demoApi.getVendor(projectId, id);
  },

  async updateVendor(projectId, vendorId, body) {
    await sleep();
    const vendor = vendorOr404(projectId, vendorId);
    if (body?.name === undefined && body?.featureIds === undefined) {
      throw new ApiError(400, "Send a name, featureIds, or both.");
    }
    const name = body.name === undefined ? undefined : validVendorName(projectId, body.name, vendorId);
    const featureIds = body.featureIds === undefined ? undefined : validFeatureIds(projectId, body.featureIds);
    if (name !== undefined) vendor.name = name;
    if (featureIds !== undefined) {
      // Replace this vendor's offerings with exactly the given list.
      for (let i = db.offerings.length - 1; i >= 0; i--) if (db.offerings[i].vendorId === vendorId) db.offerings.splice(i, 1);
      db.offerings.push(...featureIds.map((featureId) => ({ featureId, vendorId })));
    }
    return demoApi.getVendor(projectId, vendorId);
  },

  async deleteVendor(projectId, vendorId) {
    await sleep();
    const vendor = vendorOr404(projectId, vendorId);
    const responses = db.responses.filter((r) => r.vendorId === vendorId).length;
    if (responses > 0) {
      throw new ApiError(
        409,
        `${vendor.name} has ${responses} ${responses === 1 ? "response" : "responses"}, so it can't be deleted. Move or remove them first.`,
      );
    }
    db.vendors.splice(db.vendors.indexOf(vendor), 1);
    for (let i = db.offerings.length - 1; i >= 0; i--) if (db.offerings[i].vendorId === vendorId) db.offerings.splice(i, 1);
    for (const e of db.feedback) if (e.vendorId === vendorId) e.vendorId = null;
  },

  async getWeights(projectId) {
    await sleep();
    projectOr404(projectId);
    return {
      groups: RESPONDENT_GROUPS.map((key) => ({ key, label: RESPONDENT_GROUP_LABELS[key], weight: groupWeight(projectId, key) })),
      features: db.features
        .filter((f) => f.projectId === projectId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => ({ id: f.id, name: f.name, source: f.source, weight: f.weight })),
    };
  },

  async updateWeights(projectId, body) {
    await sleep();
    projectOr404(projectId);
    if (body?.groups === undefined && body?.features === undefined) throw new ApiError(400, "Send groups and/or features.");
    if (body.groups !== undefined && !Array.isArray(body.groups)) throw new ApiError(400, "groups must be a list.");
    if (body.features !== undefined && !Array.isArray(body.features)) throw new ApiError(400, "features must be a list.");
    // Check everything first, so a bad row changes nothing.
    const groups = (body.groups ?? []).map((g) => {
      if (!RESPONDENT_GROUPS.includes(g?.key)) throw new ApiError(400, `Unknown group: ${g?.key}`);
      return { key: g.key, weight: validWeight(g.weight) };
    });
    const features = (body.features ?? []).map((f) => {
      const row = db.features.find((x) => x.id === f?.id && x.projectId === projectId);
      if (!row) throw new ApiError(400, `Unknown feature ID: ${f?.id}`);
      return { row, weight: validWeight(f.weight) };
    });
    for (const { key, weight } of groups) {
      const existing = db.groupWeights.find((w) => w.projectId === projectId && w.group === key);
      if (existing) existing.weight = weight;
      else db.groupWeights.push({ projectId, group: key, weight });
    }
    for (const { row, weight } of features) row.weight = weight;
    return demoApi.getWeights(projectId);
  },

  async getScores(projectId) {
    await sleep();
    projectOr404(projectId);
    const items = scoresFor(projectId);
    return { items, total: items.length, mix: SCORE_MIX };
  },

  async getVendorSummary(projectId, vendorId) {
    await sleep();
    vendorOr404(projectId, vendorId);
    const rs = responsesFor(projectId).filter((r) => r.vendorId === vendorId);
    const text = db.vendorSummaries[vendorId] ?? null;
    return {
      text,
      basedOn: text ? rs.length : 0,
      generatedAt: text ? (rs.map((r) => r.analyzedAt ?? "").sort().at(-1) ?? null) : null,
    };
  },

  async listVendorRequests(projectId, vendorId, filters) {
    await sleep();
    vendorOr404(projectId, vendorId);
    const ms = signalsFor(projectId, filters);
    const wants = new Map<Id, number>();
    for (const m of ms) if (m.kind === "want") wants.set(m.featureId, (wants.get(m.featureId) ?? 0) + 1);
    const items = [...wants.entries()]
      .map(([featureId, count]) => ({
        feature: { id: featureId, name: db.features.find((f) => f.id === featureId)!.name },
        offers: offeredBy(featureId).includes(vendorId),
        wants: count,
      }))
      // Met requests first, then the most wanted.
      .sort((a, b) => Number(b.offers) - Number(a.offers) || b.wants - a.wants || a.feature.name.localeCompare(b.feature.name));
    return { items, total: items.length };
  },

  async listVendorFeatures(projectId, vendorId, filters) {
    await sleep();
    vendorOr404(projectId, vendorId);
    const own = signalsFor(projectId, filters).filter((m) => m.vendorId === vendorId);
    const items = db.offerings
      .filter((o) => o.vendorId === vendorId)
      .map((o) => {
        const sentiment = emptyCounts();
        for (const m of own) if (m.featureId === o.featureId) sentiment[m.kind] += 1;
        return {
          id: o.featureId,
          name: db.features.find((f) => f.id === o.featureId)!.name,
          exclusive: offeredBy(o.featureId).length === 1,
          sentiment,
        };
      })
      .sort((a, b) => {
        const total = (f: typeof a) => f.sentiment.like + f.sentiment.dislike + f.sentiment.want;
        return total(b) - total(a) || Number(b.exclusive) - Number(a.exclusive) || a.name.localeCompare(b.name);
      });
    return { items, total: items.length };
  },

  async listVendorResponses(projectId, vendorId, { limit, ...filters } = {}) {
    await sleep();
    vendorOr404(projectId, vendorId);
    const all = responsesFor(projectId, filters)
      .filter((r) => r.vendorId === vendorId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map(withMentions);
    return { items: limit ? all.slice(0, limit) : all, total: all.length };
  },

  async listResponses(projectId, { vendorId, surveyId, status, q, sort = "newest", limit, offset = 0, group, ...filters } = {}) {
    await sleep();
    projectOr404(projectId);
    const term = q?.trim().toLowerCase();
    // Everything except group and status, so the chips can count each option.
    const base = responsesFor(projectId, filters).filter(
      (r) =>
        (!vendorId || r.vendorId === vendorId) &&
        (!surveyId || r.surveyId === surveyId) &&
        (!term || [r.likes, r.dislikes, r.wants].some((t) => t.toLowerCase().includes(term))),
    );
    const statusOf = (r: db.ResponseRow): ResponseStatus => (r.analyzedAt ? "analyzed" : "pending");
    const facets = {
      group: { pm: 0, sponsor: 0, other: 0 },
      status: { analyzed: 0, pending: 0 },
    };
    for (const r of base) {
      if (!status || statusOf(r) === status) facets.group[r.group] += 1;
      if (!group || r.group === group) facets.status[statusOf(r)] += 1;
    }

    const matches = base
      .filter((r) => (!group || r.group === group) && (!status || statusOf(r) === status))
      .sort((a, b) => (sort === "oldest" ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt)));
    const page = matches.slice(offset, limit ? offset + limit : undefined);
    return { items: page.map(withMentions), total: matches.length, facets };
  },

  async getResponse(projectId, responseId) {
    await sleep();
    projectOr404(projectId);
    const r = db.responses.find((r) => r.id === responseId && r.projectId === projectId);
    if (!r) throw new ApiError(404, `Response ${responseId} not found in project ${projectId}`);
    const survey = db.surveys.find((s) => s.id === r.surveyId)!;
    const vendorIds = vendorIdsOf(projectId);
    const { mentions, ...rest } = withMentions(r);
    return {
      ...rest,
      survey: { id: survey.id, name: survey.name },
      mentions: mentions.map((m) => ({ ...m, coverage: coverageOf(m.feature.id, vendorIds) })),
      rereadQueued: isQueued(r.id),
    };
  },

  // The demo has no AI, so a queued response just leaves the queue after DEMO_REREAD_MS, with nothing new found.
  async rereadResponses(projectId, body = {}) {
    await sleep();
    projectOr404(projectId);
    const rs = db.responses.filter((r) => r.projectId === projectId);
    const ids = body?.responseIds;
    const queue = (list: Id[]) => {
      const fresh = list.filter((id) => !isQueued(id));
      for (const id of fresh) rereadQueue.set(id, Date.now());
      return { queued: fresh.length };
    };
    if (ids === undefined) return queue(rs.filter((r) => !db.mentions.some((m) => m.responseId === r.id)).map((r) => r.id));
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || ids.some((id) => typeof id !== "string")) {
      throw new ApiError(400, "responseIds must have 1 to 500 response IDs.");
    }
    const unknown = ids.find((id) => !rs.some((r) => r.id === id));
    if (unknown) throw new ApiError(404, `Response ${unknown} not found in project ${projectId}`);
    return queue([...new Set(ids)]);
  },

  async listSurveys(projectId) {
    await sleep();
    projectOr404(projectId);
    const items = db.surveys
      .filter((s) => s.projectId === projectId)
      .map((s) => {
        const rs = db.responses.filter((r) => r.surveyId === s.id);
        const groups = emptyGroups();
        for (const r of rs) groups[r.group] += 1;
        return {
          id: s.id,
          name: s.name,
          source: s.source,
          status: s.status,
          createdAt: s.createdAt,
          responseCount: rs.length,
          analyzedCount: rs.filter((r) => r.analyzedAt).length,
          vendorCount: new Set(rs.map((r) => r.vendorId)).size,
          lastResponseAt: rs.map((r) => r.submittedAt).sort().at(-1) ?? null,
          groups,
        };
      });
    return { items, total: items.length };
  },

  async getGraph(projectId, filters) {
    await sleep();
    projectOr404(projectId);
    const rs = responsesFor(projectId, filters);
    const vendorIds = vendorIdsOf(projectId);
    return {
      responses: rs.map(toSurveyResponse),
      features: db.features
        .filter((f) => f.projectId === projectId)
        .map((f) => ({ id: f.id, name: f.name, coverage: coverageOf(f.id, vendorIds), vendorIds: offeredBy(f.id), source: f.source })),
      vendors: db.vendors.filter((v) => v.projectId === projectId).map((v) => ({ id: v.id, name: v.name })),
      links: mentionsFor(new Set(rs.map((r) => r.id))).map((m) => ({
        responseId: m.responseId,
        featureId: m.featureId,
        kind: m.kind,
      })),
      manual: manualFor(projectId, filters)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((e) => ({ ...toFeedbackEntry(e), featureId: e.featureId })),
    };
  },

  async listActivity(projectId, { limit = 10 } = {}) {
    await sleep();
    projectOr404(projectId);
    const events: ActivityEvent[] = [];
    const featureName = (id: Id) => db.features.find((f) => f.id === id)?.name ?? "Unknown feature";

    for (const r of responsesFor(projectId)) {
      const vendor = db.vendors.find((v) => v.id === r.vendorId)!;
      events.push({
        id: `evt_sub_${r.id}`,
        type: "response.submitted",
        occurredAt: r.submittedAt,
        response: { id: r.id, group: r.group, vendor: { id: vendor.id, name: vendor.name } },
      });
      const linked = [...new Set(db.mentions.filter((m) => m.responseId === r.id).map((m) => m.featureId))];
      if (r.analyzedAt && linked.length > 0) {
        events.push({
          id: `evt_link_${r.id}`,
          type: "features.linked",
          occurredAt: r.analyzedAt,
          responseId: r.id,
          features: linked.map((id) => ({ id, name: featureName(id) })),
        });
      }
    }
    for (const f of db.features) {
      if (f.projectId === projectId && offeredBy(f.id).length === 0) {
        events.push({ id: `evt_gap_${f.id}`, type: "gap.detected", occurredAt: f.createdAt, feature: { id: f.id, name: f.name } });
      }
    }

    const sorted = events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return { items: sorted.slice(0, limit), total: sorted.length };
  },
};

// The demo API as one signed-in user sees it: 401 without a valid session, 403 when a viewer tries to change something.
// `token` comes from the session cookie (app pages) or the Authorization header (the /api/v1 reference API).
const ADMIN_ONLY = new Set<string>([
  "createVendor",
  "updateVendor",
  "deleteVendor",
  "listUsers",
  "createUser",
  "updateUser",
  "deleteUser",
  "createFeature",
  "updateFeature",
  "deleteFeature",
  "addFeatureFeedback",
  "deleteFeatureFeedback",
  "updateWeights",
  "rereadResponses",
]);

export function demoApiFor(token: string | undefined): FeedbackApi {
  // The user's current row when this instance has it (so role changes apply), else what the token says.
  const signedIn = (): CurrentUser => {
    const claims = readToken(token);
    if (!claims) throw new ApiError(401, "Sign in to continue.");
    const user = db.users.find((u) => u.id === claims.id);
    return user ? toMe(user) : { id: claims.id, name: claims.name, email: claims.email, role: claims.role };
  };
  const allowed = (name: string) => {
    const user = signedIn();
    if (ADMIN_ONLY.has(name) && user.role !== "admin") throw new ApiError(403, "Only admins can do that.");
    return user;
  };
  const guarded = Object.fromEntries(
    Object.entries(demoApi).map(([name, fn]) => [
      name,
      async (...args: unknown[]) => {
        allowed(name);
        return (fn as (...a: unknown[]) => unknown)(...args);
      },
    ]),
  ) as unknown as FeedbackApi;
  return {
    ...guarded,
    login: demoApi.login,
    async getMe() {
      await sleep();
      return signedIn();
    },
    createFeature: async (projectId, body) => demoApi.createFeature(projectId, body, allowed("createFeature").id),
    addFeatureFeedback: async (projectId, featureId, body) =>
      demoApi.addFeatureFeedback(projectId, featureId, body, allowed("addFeatureFeedback").id),
    deleteUser: async (userId) => demoApi.deleteUser(userId, allowed("deleteUser").id),
  };
}
