// Answers each endpoint from the demo tables, computing exactly what docs/API.md describes.
// The real backend replaces this file; nothing in the UI imports it directly.

import { ApiError } from "../errors";
import type { FeedbackApi } from "../index";
import type {
  ActivityEvent,
  Coverage,
  FeatureListItem,
  Group,
  Id,
  ProjectFilters,
  SentimentCounts,
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
      return {
        id: v.id,
        name: v.name,
        featureIds,
        responseCount: responses.filter((r) => r.vendorId === v.id).length,
        requestsMet: featureIds.filter((id) => requested.has(id)).length,
        requestsTotal: requested.size,
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

  async listFeatures(projectId, { sort = "mentions", limit, ...filters } = {}) {
    await sleep();
    projectOr404(projectId);
    const all = featureItems(projectId, filters).sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.mentions - a.mentions || a.createdAt.localeCompare(b.createdAt),
    );
    const items = (limit ? all.slice(0, limit) : all).map((f) => omit(f, "createdAt"));
    return { items, total: all.length };
  },

  async getFeature(projectId, featureId) {
    await sleep();
    projectOr404(projectId);
    const feature = featureItems(projectId).find((f) => f.id === featureId);
    if (!feature) throw new ApiError(404, `Feature ${featureId} not found in project ${projectId}`);
    return feature;
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
