// Reference API: serves the demo data at the exact paths in docs/openapi.yaml, so the backend team
// can call any route (e.g. GET /api/v1/projects/prj_1/summary) and see the response the UI expects.
// Sign in first with POST /api/v1/auth/login, then send "Authorization: Bearer <token>" on every call;
// viewers get 403 on the write routes. Turned off once FEEDBACK_API_URL points the app at the real backend.

import { NextResponse, type NextRequest } from "next/server";
import type { FeedbackApi } from "@/lib/api";
import { demoApiFor } from "@/lib/api/demo/handlers";
import { ApiError, ERROR_CODES } from "@/lib/api/errors";
import type {
  FeatureCreate,
  FeatureUpdate,
  FeedbackInput,
  LoginRequest,
  ProjectFilters,
  ProjectResetRequest,
  RereadRequest,
  UserCreate,
  UserUpdate,
  VendorCreate,
  VendorUpdate,
  ResponseUpdate,
  WeightsUpdate,
} from "@/lib/api/types";

class BadRequest extends Error {}

type Params = Record<string, string>;
type Handler = (api: FeedbackApi, params: Params, q: Query) => Promise<unknown>;

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
  bool(name: string) {
    const v = this.str(name);
    if (v === undefined) return undefined;
    if (v !== "true" && v !== "false") throw new BadRequest(`${name} must be true or false`);
    return v === "true";
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
  ["me", (api) => api.getMe()],
  ["users", (api) => api.listUsers()],
  ["projects", (api) => api.listProjects()],
  ["projects/:projectId", (api, p) => api.getProject(p.projectId)],
  ["projects/:projectId/summary", (api, p, q) => api.getSummary(p.projectId, q.filters())],
  [
    "projects/:projectId/analytics/responses-by-week",
    (api, p, q) => api.getResponsesByWeek(p.projectId, { weeks: q.int("weeks", 1, 52), ...q.filters() }),
  ],
  ["projects/:projectId/analytics/coverage", (api, p) => api.getCoverage(p.projectId)],
  [
    "projects/:projectId/features",
    (api, p, q) =>
      api.listFeatures(p.projectId, {
        view: q.oneOf("view", ["all", "requested", "gap", "pain"] as const),
        q: q.str("q"),
        sort: q.oneOf("sort", ["mentions", "newest", "name"] as const),
        limit: q.int("limit", 1, 500),
        ...q.filters(),
      }),
  ],
  ["projects/:projectId/features/:featureId", (api, p) => api.getFeature(p.projectId, p.featureId)],
  ["projects/:projectId/features/:featureId/summary", (api, p) => api.getFeatureSummary(p.projectId, p.featureId)],
  [
    "projects/:projectId/features/:featureId/responses",
    (api, p, q) =>
      api.listFeatureResponses(p.projectId, p.featureId, {
        kind: q.oneOf("kind", SENTIMENTS),
        limit: q.int("limit", 1, 500),
        ...q.filters(),
      }),
  ],
  ["projects/:projectId/features/:featureId/feedback", (api, p) => api.listFeatureFeedback(p.projectId, p.featureId)],
  ["projects/:projectId/features/:featureId/vendors", (api, p) => api.listFeatureVendors(p.projectId, p.featureId)],
  [
    "projects/:projectId/features/:featureId/related",
    (api, p, q) => api.listRelatedFeatures(p.projectId, p.featureId, { limit: q.int("limit", 1, 500) }),
  ],
  [
    "projects/:projectId/vendors",
    (api, p, q) =>
      api.listVendors(p.projectId, {
        sort: q.oneOf("sort", ["score", "fit", "name"] as const),
        limit: q.int("limit", 1, 500),
        ...q.filters(),
      }),
  ],
  ["projects/:projectId/vendors/:vendorId", (api, p) => api.getVendor(p.projectId, p.vendorId)],
  ["projects/:projectId/vendors/:vendorId/summary", (api, p) => api.getVendorSummary(p.projectId, p.vendorId)],
  ["projects/:projectId/vendors/:vendorId/requests", (api, p, q) => api.listVendorRequests(p.projectId, p.vendorId, q.filters())],
  ["projects/:projectId/vendors/:vendorId/features", (api, p, q) => api.listVendorFeatures(p.projectId, p.vendorId, q.filters())],
  [
    "projects/:projectId/vendors/:vendorId/responses",
    (api, p, q) => api.listVendorResponses(p.projectId, p.vendorId, { limit: q.int("limit", 1, 500), ...q.filters() }),
  ],
  [
    "projects/:projectId/responses",
    (api, p, q) =>
      api.listResponses(p.projectId, {
        vendorId: q.str("vendorId"),
        surveyId: q.str("surveyId"),
        status: q.oneOf("status", ["analyzed", "pending"] as const),
        q: q.str("q"),
        sort: q.oneOf("sort", ["newest", "oldest"] as const),
        limit: q.int("limit", 1, 500),
        offset: q.int("offset", 0, Number.MAX_SAFE_INTEGER),
        includeExcluded: q.bool("includeExcluded"),
        ...q.filters(),
      }),
  ],
  ["projects/:projectId/weights", (api, p) => api.getWeights(p.projectId)],
  ["projects/:projectId/scores", (api, p) => api.getScores(p.projectId)],
  ["projects/:projectId/responses/:responseId", (api, p, q) => api.getResponse(p.projectId, p.responseId, { includeExcluded: q.bool("includeExcluded") })],
  ["projects/:projectId/surveys", (api, p) => api.listSurveys(p.projectId)],
  ["projects/:projectId/graph", (api, p, q) => api.getGraph(p.projectId, q.filters())],
  ["projects/:projectId/activity", (api, p, q) => api.listActivity(p.projectId, { limit: q.int("limit", 1, 100) })],
];

// Write routes. The body arrives as parsed JSON; the demo handlers validate it (400 / 409).
type WriteHandler = (api: FeedbackApi, params: Params, body: unknown) => Promise<unknown>;
const WRITE_ROUTES: [method: string, pattern: string, status: number, handler: WriteHandler][] = [
  ["POST", "auth/login", 200, (api, _, body) => api.login(body as LoginRequest)],
  ["POST", "users", 201, (api, _, body) => api.createUser(body as UserCreate)],
  ["PATCH", "users/:userId", 200, (api, p, body) => api.updateUser(p.userId, body as UserUpdate)],
  ["DELETE", "users/:userId", 204, (api, p) => api.deleteUser(p.userId)],
  ["POST", "projects/:projectId/vendors", 201, (api, p, body) => api.createVendor(p.projectId, body as VendorCreate)],
  ["PATCH", "projects/:projectId/vendors/:vendorId", 200, (api, p, body) => api.updateVendor(p.projectId, p.vendorId, body as VendorUpdate)],
  ["PATCH", "projects/:projectId/responses/:responseId", 200, (api, p, body) => api.updateResponse(p.projectId, p.responseId, body as ResponseUpdate)],
  ["DELETE", "projects/:projectId/vendors/:vendorId", 204, (api, p) => api.deleteVendor(p.projectId, p.vendorId)],
  ["POST", "projects/:projectId/features", 201, (api, p, body) => api.createFeature(p.projectId, body as FeatureCreate)],
  ["PATCH", "projects/:projectId/features/:featureId", 200, (api, p, body) => api.updateFeature(p.projectId, p.featureId, body as FeatureUpdate)],
  ["DELETE", "projects/:projectId/features/:featureId", 204, (api, p) => api.deleteFeature(p.projectId, p.featureId)],
  [
    "POST",
    "projects/:projectId/features/:featureId/feedback",
    201,
    (api, p, body) => api.addFeatureFeedback(p.projectId, p.featureId, body as FeedbackInput),
  ],
  [
    "DELETE",
    "projects/:projectId/features/:featureId/feedback/:entryId",
    204,
    (api, p) => api.deleteFeatureFeedback(p.projectId, p.featureId, p.entryId),
  ],
  ["PUT", "projects/:projectId/weights", 200, (api, p, body) => api.updateWeights(p.projectId, body as WeightsUpdate)],
  ["POST", "projects/:projectId/responses/reread", 202, (api, p, body) => api.rereadResponses(p.projectId, body as RereadRequest)],
  ["POST", "projects/:projectId/reset", 200, (api, p, body) => api.resetProject(p.projectId, body as ProjectResetRequest)],
];

// The caller's demo session, from "Authorization: Bearer <token>".
const apiFor = (request: NextRequest) =>
  demoApiFor(request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1]);

function matchPattern(pattern: string, segments: string[]): Params | null {
  const parts = pattern.split("/");
  if (parts.length !== segments.length) return null;
  const params: Params = {};
  const ok = parts.every((part, i) => {
    if (part.startsWith(":")) {
      params[part.slice(1)] = segments[i];
      return true;
    }
    return part === segments[i];
  });
  return ok ? params : null;
}

function match(segments: string[]): [Handler, Params] | null {
  for (const [pattern, handler] of ROUTES) {
    const params = matchPattern(pattern, segments);
    if (params) return [handler, params];
  }
  return null;
}

const error = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

function toErrorResponse(err: unknown) {
  if (err instanceof BadRequest) return error(400, "bad_request", err.message);
  if (err instanceof ApiError && ERROR_CODES[err.status]) return error(err.status, ERROR_CODES[err.status], err.message);
  console.error(err);
  return error(500, "internal", "Something went wrong.");
}

const OFF = "The reference API is off because FEEDBACK_API_URL points at the real backend.";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/v1/[...path]">) {
  if (process.env.FEEDBACK_API_URL) return error(404, "not_found", OFF);
  const { path } = await ctx.params;
  const route = match(path);
  if (!route) return error(404, "not_found", `No route GET /api/v1/${path.join("/")}`);

  try {
    const [handler, params] = route;
    return NextResponse.json(await handler(apiFor(request), params, new Query(request.nextUrl.searchParams)));
  } catch (err) {
    return toErrorResponse(err);
  }
}

async function write(method: string, request: NextRequest, ctx: RouteContext<"/api/v1/[...path]">) {
  if (process.env.FEEDBACK_API_URL) return error(404, "not_found", OFF);
  const { path } = await ctx.params;
  for (const [m, pattern, status, handler] of WRITE_ROUTES) {
    const params = m === method ? matchPattern(pattern, path) : null;
    if (!params) continue;
    try {
      let body: unknown = undefined;
      if (method !== "DELETE") {
        try {
          body = await request.json();
        } catch {
          throw new BadRequest("The request body must be JSON.");
        }
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          throw new BadRequest("The request body must be a JSON object.");
        }
      }
      const result = await handler(apiFor(request), params, body);
      return status === 204 ? new NextResponse(null, { status }) : NextResponse.json(result, { status });
    } catch (err) {
      return toErrorResponse(err);
    }
  }
  return error(404, "not_found", `No route ${method} /api/v1/${path.join("/")}`);
}

export const POST = (request: NextRequest, ctx: RouteContext<"/api/v1/[...path]">) => write("POST", request, ctx);
export const PATCH = (request: NextRequest, ctx: RouteContext<"/api/v1/[...path]">) => write("PATCH", request, ctx);
export const PUT = (request: NextRequest, ctx: RouteContext<"/api/v1/[...path]">) => write("PUT", request, ctx);
export const DELETE = (request: NextRequest, ctx: RouteContext<"/api/v1/[...path]">) => write("DELETE", request, ctx);
