// Talks to the real backend. Paths and query params match docs/openapi.yaml one to one.

import { ApiError } from "./errors";
import type { FeedbackApi } from "./index";

type Query = Record<string, string | number | undefined>;

// `token`, if set, is sent as "Authorization: Bearer <token>" on every request.
function createHttpApi(baseUrl: string, token?: string): FeedbackApi {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  async function request<T>(method: string, path: string, init: { query?: Query; body?: unknown } = {}): Promise<T> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    const qs = params.size ? `?${params}` : "";
    const res = await fetch(`${baseUrl}${path}${qs}`, {
      method,
      cache: "no-store",
      headers: init.body === undefined ? headers : { ...headers, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.error?.message ?? `${method} ${path} failed with ${res.status}`);
    }
    return res.status === 204 ? (undefined as T) : res.json();
  }
  const get = <T,>(path: string, query?: Query) => request<T>("GET", path, { query });

  const p = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;
  const v = (projectId: string, vendorId: string) => `${p(projectId)}/vendors/${encodeURIComponent(vendorId)}`;
  const f = (projectId: string, featureId: string) => `${p(projectId)}/features/${encodeURIComponent(featureId)}`;

  return {
    getMe: () => get("/me"),
    listProjects: () => get("/projects"),
    getProject: (projectId) => get(p(projectId)),
    createProject: (body) => request("POST", "/projects", { body }),
    getSummary: (projectId, filters) => get(`${p(projectId)}/summary`, filters),
    getResponsesByWeek: (projectId, query) => get(`${p(projectId)}/analytics/responses-by-week`, query),
    getCoverage: (projectId) => get(`${p(projectId)}/analytics/coverage`),
    listFeatures: (projectId, query) => get(`${p(projectId)}/features`, query),
    getFeature: (projectId, featureId) => get(f(projectId, featureId)),
    getFeatureSummary: (projectId, featureId) => get(`${f(projectId, featureId)}/summary`),
    listFeatureResponses: (projectId, featureId, query) => get(`${f(projectId, featureId)}/responses`, query),
    listFeatureVendors: (projectId, featureId) => get(`${f(projectId, featureId)}/vendors`),
    listRelatedFeatures: (projectId, featureId, query) => get(`${f(projectId, featureId)}/related`, query),
    listVendors: (projectId, query) => get(`${p(projectId)}/vendors`, query),
    getVendor: (projectId, vendorId) => get(v(projectId, vendorId)),
    createVendor: (projectId, body) => request("POST", `${p(projectId)}/vendors`, { body }),
    updateVendor: (projectId, vendorId, body) => request("PATCH", v(projectId, vendorId), { body }),
    deleteVendor: (projectId, vendorId) => request("DELETE", v(projectId, vendorId)),
    getVendorSummary: (projectId, vendorId) => get(`${v(projectId, vendorId)}/summary`),
    listVendorRequests: (projectId, vendorId, filters) => get(`${v(projectId, vendorId)}/requests`, filters),
    listVendorFeatures: (projectId, vendorId, filters) => get(`${v(projectId, vendorId)}/features`, filters),
    listVendorResponses: (projectId, vendorId, query) => get(`${v(projectId, vendorId)}/responses`, query),
    listResponses: (projectId, query) => get(`${p(projectId)}/responses`, query),
    getResponse: (projectId, responseId) => get(`${p(projectId)}/responses/${encodeURIComponent(responseId)}`),
    listSurveys: (projectId) => get(`${p(projectId)}/surveys`),
    getGraph: (projectId, filters) => get(`${p(projectId)}/graph`, filters),
    listActivity: (projectId, query) => get(`${p(projectId)}/activity`, query),
  };
}

export { createHttpApi };
