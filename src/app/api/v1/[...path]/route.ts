// Reference API: serves the demo data at the exact paths in docs/openapi.yaml, so the backend team
// can call any route (e.g. GET /api/v1/projects/prj_1/summary) and see the response the UI expects.
// Turned off once FEEDBACK_API_URL points the app at the real backend.

import { NextResponse, type NextRequest } from "next/server";
import { demoApi } from "@/lib/api/demo/handlers";
import { ApiError } from "@/lib/api/errors";
import type { ProjectFilters } from "@/lib/api/types";

class BadRequest extends Error {}

type Params = Record<string, string>;
type Handler = (params: Params, q: Query) => Promise<unknown>;

// Typed readers for query params. Invalid values are a 400, like the real API should do.
class Query {
  constructor(private search: URLSearchParams) {}
  str(name: string, max = 100) {
    const v = this.search.get(name);
    if (v === null || v === "") return undefined;
    if (v.length > max) throw new BadRequest(`${name} must be at most ${max} characters`);
    return v;
  }
  int(name: string, min: number, max: number) {
    const v = this.str(name);
    if (v === undefined) return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new BadRequest(`${name} must be an integer from ${min} to ${max}`);
    return n;
  }
  oneOf<T extends string>(name: string, values: readonly T[]) {
    const v = this.str(name);
    if (v === undefined) return undefined;
    if (!values.includes(v as T)) throw new BadRequest(`${name} must be one of: ${values.join(", ")}`);
    return v as T;
  }
  date(name: string) {
    const v = this.str(name);
    if (v === undefined) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new BadRequest(`${name} must be a date like 2026-10-01`);
    return v;
  }
  filters(): ProjectFilters {
    return { from: this.date("from"), to: this.date("to"), group: this.oneOf("group", ["pm", "sponsor", "other"] as const) };
  }
}

const SENTIMENTS = ["like", "dislike", "want"] as const;

// One entry per route in docs/openapi.yaml.
const ROUTES: [string, Handler][] = [
  ["me", () => demoApi.getMe()],
  ["projects", () => demoApi.listProjects()],
  ["projects/:projectId", (p) => demoApi.getProject(p.projectId)],
  ["projects/:projectId/summary", (p, q) => demoApi.getSummary(p.projectId, q.filters())],
  [
    "projects/:projectId/analytics/responses-by-week",
    (p, q) => demoApi.getResponsesByWeek(p.projectId, { weeks: q.int("weeks", 1, 52), ...q.filters() }),
  ],
  ["projects/:projectId/analytics/coverage", (p) => demoApi.getCoverage(p.projectId)],
  [
    "projects/:projectId/features",
    (p, q) =>
      demoApi.listFeatures(p.projectId, {
        view: q.oneOf("view", ["all", "requested", "gap", "pain"] as const),
        q: q.str("q"),
        sort: q.oneOf("sort", ["mentions", "newest", "name"] as const),
        limit: q.int("limit", 1, 500),
        ...q.filters(),
      }),
  ],
  ["projects/:projectId/features/:featureId", (p) => demoApi.getFeature(p.projectId, p.featureId)],
  ["projects/:projectId/features/:featureId/summary", (p) => demoApi.getFeatureSummary(p.projectId, p.featureId)],
  [
    "projects/:projectId/features/:featureId/responses",
    (p, q) =>
      demoApi.listFeatureResponses(p.projectId, p.featureId, {
        kind: q.oneOf("kind", SENTIMENTS),
        limit: q.int("limit", 1, 500),
        ...q.filters(),
      }),
  ],
  ["projects/:projectId/features/:featureId/vendors", (p) => demoApi.listFeatureVendors(p.projectId, p.featureId)],
  [
    "projects/:projectId/features/:featureId/related",
    (p, q) => demoApi.listRelatedFeatures(p.projectId, p.featureId, { limit: q.int("limit", 1, 500) }),
  ],
  [
    "projects/:projectId/vendors",
    (p, q) =>
      demoApi.listVendors(p.projectId, {
        sort: q.oneOf("sort", ["fit", "name"] as const),
        limit: q.int("limit", 1, 500),
        ...q.filters(),
      }),
  ],
  ["projects/:projectId/vendors/:vendorId", (p) => demoApi.getVendor(p.projectId, p.vendorId)],
  ["projects/:projectId/vendors/:vendorId/summary", (p) => demoApi.getVendorSummary(p.projectId, p.vendorId)],
  ["projects/:projectId/vendors/:vendorId/requests", (p, q) => demoApi.listVendorRequests(p.projectId, p.vendorId, q.filters())],
  ["projects/:projectId/vendors/:vendorId/features", (p, q) => demoApi.listVendorFeatures(p.projectId, p.vendorId, q.filters())],
  [
    "projects/:projectId/vendors/:vendorId/responses",
    (p, q) => demoApi.listVendorResponses(p.projectId, p.vendorId, { limit: q.int("limit", 1, 500), ...q.filters() }),
  ],
  [
    "projects/:projectId/responses",
    (p, q) =>
      demoApi.listResponses(p.projectId, {
        vendorId: q.str("vendorId"),
        surveyId: q.str("surveyId"),
        status: q.oneOf("status", ["analyzed", "pending"] as const),
        q: q.str("q"),
        sort: q.oneOf("sort", ["newest", "oldest"] as const),
        limit: q.int("limit", 1, 500),
        offset: q.int("offset", 0, Number.MAX_SAFE_INTEGER),
        ...q.filters(),
      }),
  ],
  ["projects/:projectId/responses/:responseId", (p) => demoApi.getResponse(p.projectId, p.responseId)],
  ["projects/:projectId/surveys", (p) => demoApi.listSurveys(p.projectId)],
  ["projects/:projectId/graph", (p, q) => demoApi.getGraph(p.projectId, q.filters())],
  ["projects/:projectId/activity", (p, q) => demoApi.listActivity(p.projectId, { limit: q.int("limit", 1, 100) })],
];

function match(segments: string[]): [Handler, Params] | null {
  for (const [pattern, handler] of ROUTES) {
    const parts = pattern.split("/");
    if (parts.length !== segments.length) continue;
    const params: Params = {};
    const ok = parts.every((part, i) => {
      if (part.startsWith(":")) {
        params[part.slice(1)] = segments[i];
        return true;
      }
      return part === segments[i];
    });
    if (ok) return [handler, params];
  }
  return null;
}

const error = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function GET(request: NextRequest, ctx: RouteContext<"/api/v1/[...path]">) {
  if (process.env.FEEDBACK_API_URL) {
    return error(404, "not_found", "The reference API is off because FEEDBACK_API_URL points at the real backend.");
  }
  const { path } = await ctx.params;
  const route = match(path);
  if (!route) return error(404, "not_found", `No route GET /api/v1/${path.join("/")}`);

  try {
    const [handler, params] = route;
    return NextResponse.json(await handler(params, new Query(request.nextUrl.searchParams)));
  } catch (err) {
    if (err instanceof BadRequest) return error(400, "bad_request", err.message);
    if (err instanceof ApiError && err.status === 404) return error(404, "not_found", err.message);
    console.error(err);
    return error(500, "internal", "Something went wrong.");
  }
}
