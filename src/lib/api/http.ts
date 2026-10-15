// Talks to the real backend. Paths and query params match docs/API.md one to one.

import { ApiError } from "./errors";
import type { FeedbackApi } from "./index";

type Query = Record<string, string | number | undefined>;

function createHttpApi(baseUrl: string): FeedbackApi {
  async function get<T>(path: string, query: Query = {}): Promise<T> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const qs = params.size ? `?${params}` : "";
    const res = await fetch(`${baseUrl}${path}${qs}`, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.error?.message ?? `GET ${path} failed with ${res.status}`);
    }
    return res.json();
  }

  const p = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;

  return {
    getMe: () => get("/me"),
    listProjects: () => get("/projects"),
    getProject: (projectId) => get(p(projectId)),
    getSummary: (projectId, filters) => get(`${p(projectId)}/summary`, filters),
    getResponsesByWeek: (projectId, query) => get(`${p(projectId)}/analytics/responses-by-week`, query),
    getCoverage: (projectId) => get(`${p(projectId)}/analytics/coverage`),
    listFeatures: (projectId, query) => get(`${p(projectId)}/features`, query),
    getFeature: (projectId, featureId) => get(`${p(projectId)}/features/${encodeURIComponent(featureId)}`),
    listVendors: (projectId, query) => get(`${p(projectId)}/vendors`, query),
    getVendor: (projectId, vendorId) => get(`${p(projectId)}/vendors/${encodeURIComponent(vendorId)}`),
    listActivity: (projectId, query) => get(`${p(projectId)}/activity`, query),
  };
}

export { createHttpApi };
