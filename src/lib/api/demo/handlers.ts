// Answers each endpoint from the demo tables, computing exactly what docs/API.md describes.
// The real backend replaces this file; nothing in the UI imports it directly.

import { ApiError } from "../errors";
import type { FeedbackApi } from "../index";
import type {
  ActivityEvent,
  Coverage,
  FeatureListItem,
  FeatureView,
  Group,
  Id,
  ProjectFilters,
  ResponseStatus,
  ResponseWithMentions,
  SentimentCounts,
  SurveyResponse,
  VendorListItem,
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

const vendorIdsOf = (projectId: Id) => db.vendors.filter((v) => v.projectId === projectId).map((v) => v.id);
const offeredBy = (featureId: Id) => db.offerings.filter((o) => o.featureId === featureId).map((o) => o.vendorId);

function coverageOf(featureId: Id, projectVendorIds: Id[]): Coverage {
  const count = offeredBy(featureId).filter((v) => projectVendorIds.includes(v)).length;
  if (count === 0) return "none";
  return count === projectVendorIds.length ? "all" : "some";
}

// Features at least one (filtered) response wants.
function requestedFeatureIds(projectId: Id, filters?: ProjectFilters) {
  const ids = new Set(responsesFor(projectId, filters).map((r) => r.id));
  return new Set(mentionsFor(ids).filter((m) => m.kind === "want").map((m) => m.featureId));
}

function featureItems(projectId: Id, filters?: ProjectFilters): (FeatureListItem & { createdAt: string })[] {
  const vendorIds = vendorIdsOf(projectId);
  const ms = mentionsFor(new Set(responsesFor(projectId, filters).map((r) => r.id)));
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
      };
    });
}

function vendorItems(projectId: Id, filters?: ProjectFilters): (VendorListItem & { featureIds: Id[] })[] {
  const responses = responsesFor(projectId, filters);
  const requested = requestedFeatureIds(projectId, filters);
  return db.vendors
    .filter((v) => v.projectId === projectId)
    .map((v) => {
      const featureIds = db.offerings.filter((o) => o.vendorId === v.id).map((o) => o.featureId);
      const own = responses.filter((r) => r.vendorId === v.id);
      const sentiment = emptyCounts();
      for (const m of mentionsFor(new Set(own.map((r) => r.id)))) sentiment[m.kind] += 1;
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
      };
    });
}

// Monday 00:00 UTC of the week containing `t`.
function weekStart(t: number) {
  const d = new Date(t);
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY;
}

export const demoApi: FeedbackApi = {
  async getMe() {
    await sleep();
    return { id: "usr_1", name: "Program office", role: "Admin" };
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
    const ms = mentionsFor(new Set(rs.map((r) => r.id)));
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
        for (const m of db.mentions) {
          if (m.featureId !== featureId) continue;
          if (db.responses.find((r) => r.id === m.responseId)?.vendorId === v.id) sentiment[m.kind] += 1;
        }
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

  async listVendors(projectId, { sort = "fit", limit, ...filters } = {}) {
    await sleep();
    projectOr404(projectId);
    const all = vendorItems(projectId, filters).sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.requestsMet - a.requestsMet || b.responseCount - a.responseCount || a.name.localeCompare(b.name),
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
    const ms = mentionsFor(new Set(responsesFor(projectId, filters).map((r) => r.id)));
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
    const own = new Set(responsesFor(projectId, filters).filter((r) => r.vendorId === vendorId).map((r) => r.id));
    const items = db.offerings
      .filter((o) => o.vendorId === vendorId)
      .map((o) => {
        const sentiment = emptyCounts();
        for (const m of db.mentions) if (m.featureId === o.featureId && own.has(m.responseId)) sentiment[m.kind] += 1;
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
    };
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
        .map((f) => ({ id: f.id, name: f.name, coverage: coverageOf(f.id, vendorIds), vendorIds: offeredBy(f.id) })),
      vendors: db.vendors.filter((v) => v.projectId === projectId).map((v) => ({ id: v.id, name: v.name })),
      links: mentionsFor(new Set(rs.map((r) => r.id))).map((m) => ({
        responseId: m.responseId,
        featureId: m.featureId,
        kind: m.kind,
      })),
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
