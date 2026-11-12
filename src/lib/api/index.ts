// The one place the UI gets data from. Each function is one backend endpoint (see docs/API.md).
// Set FEEDBACK_API_URL (e.g. https://api.example.com/api/v1) to use the real backend; leave it unset
// to use the demo data in ./demo. With a backend set, Settings → Data source can still switch a
// browser to demo data.
// Every call goes out as the signed-in user: the session cookie's token is sent as a bearer token.

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { DATA_SOURCE_COOKIE, SESSION_COOKIE } from "./cookies";
import { demoApiFor } from "./demo/handlers";
import { ApiError, isNotFound } from "./errors";
import { createHttpApi } from "./http";
import type {
  ActivityEvent,
  CoverageBreakdown,
  CurrentUser,
  Feature,
  FeatureCreate,
  FeatureList,
  FeatureResponse,
  FeatureSort,
  FeatureUpdate,
  AiSummary,
  FeatureVendor,
  FeatureView,
  FeedbackEntry,
  FeedbackInput,
  Id,
  LoginRequest,
  RelatedFeature,
  ProjectResetRequest,
  ProjectResetResult,
  RereadRequest,
  RereadResult,
  Sentiment,
  Session,
  List,
  Project,
  ProjectFilters,
  ProjectGraph,
  ProjectListItem,
  ProjectSummary,
  ResponsesByWeek,
  User,
  UserCreate,
  UserUpdate,
  Vendor,
  VendorCreate,
  VendorUpdate,
  VendorFeature,
  VendorListItem,
  VendorRequest,
  VendorScoreList,
  ResponseDetail,
  ResponseList,
  ResponseSort,
  ResponseStatus,
  ResponseUpdate,
  ResponseUpdateResult,
  ResponseWithMentions,
  Survey,
  VendorSort,
  Weights,
  WeightsUpdate,
} from "./types";

export type FeatureQuery = ProjectFilters & {
  view?: FeatureView;
  q?: string; // case-insensitive name search
  sort?: FeatureSort;
  limit?: number;
};

export type ResponseQuery = ProjectFilters & {
  vendorId?: Id;
  surveyId?: Id;
  status?: ResponseStatus;
  q?: string; // case-insensitive search across the three answers
  sort?: ResponseSort;
  limit?: number;
  offset?: number;
  includeExcluded?: boolean; // also list responses an admin excluded from analysis
};

export type FeedbackApi = {
  login(body: LoginRequest): Promise<Session>;
  getMe(): Promise<CurrentUser>;
  listUsers(): Promise<List<User>>;
  createUser(body: UserCreate): Promise<User>;
  updateUser(userId: Id, body: UserUpdate): Promise<User>;
  deleteUser(userId: Id): Promise<void>;
  listProjects(): Promise<List<ProjectListItem>>;
  getProject(projectId: Id): Promise<Project>;
  getSummary(projectId: Id, filters?: ProjectFilters): Promise<ProjectSummary>;
  getResponsesByWeek(projectId: Id, query?: ProjectFilters & { weeks?: number }): Promise<ResponsesByWeek>;
  getCoverage(projectId: Id): Promise<CoverageBreakdown>;
  listFeatures(projectId: Id, query?: FeatureQuery): Promise<FeatureList>;
  getFeature(projectId: Id, featureId: Id): Promise<Feature>;
  createFeature(projectId: Id, body: FeatureCreate): Promise<Feature>;
  updateFeature(projectId: Id, featureId: Id, body: FeatureUpdate): Promise<Feature>;
  deleteFeature(projectId: Id, featureId: Id): Promise<void>;
  getFeatureSummary(projectId: Id, featureId: Id): Promise<AiSummary>;
  listFeatureResponses(
    projectId: Id,
    featureId: Id,
    query?: ProjectFilters & { kind?: Sentiment; limit?: number },
  ): Promise<List<FeatureResponse>>;
  listFeatureVendors(projectId: Id, featureId: Id): Promise<List<FeatureVendor>>;
  listRelatedFeatures(projectId: Id, featureId: Id, query?: { limit?: number }): Promise<List<RelatedFeature>>;
  listFeatureFeedback(projectId: Id, featureId: Id): Promise<List<FeedbackEntry>>;
  addFeatureFeedback(projectId: Id, featureId: Id, body: FeedbackInput): Promise<FeedbackEntry>;
  deleteFeatureFeedback(projectId: Id, featureId: Id, entryId: Id): Promise<void>;
  listVendors(
    projectId: Id,
    query?: ProjectFilters & { sort?: VendorSort; limit?: number },
  ): Promise<List<VendorListItem>>;
  getVendor(projectId: Id, vendorId: Id): Promise<Vendor>;
  createVendor(projectId: Id, body: VendorCreate): Promise<Vendor>;
  updateVendor(projectId: Id, vendorId: Id, body: VendorUpdate): Promise<Vendor>;
  deleteVendor(projectId: Id, vendorId: Id): Promise<void>;
  getVendorSummary(projectId: Id, vendorId: Id): Promise<AiSummary>;
  listVendorRequests(projectId: Id, vendorId: Id, filters?: ProjectFilters): Promise<List<VendorRequest>>;
  listVendorFeatures(projectId: Id, vendorId: Id, filters?: ProjectFilters): Promise<List<VendorFeature>>;
  listVendorResponses(
    projectId: Id,
    vendorId: Id,
    query?: ProjectFilters & { limit?: number },
  ): Promise<List<ResponseWithMentions>>;
  getWeights(projectId: Id): Promise<Weights>;
  updateWeights(projectId: Id, body: WeightsUpdate): Promise<Weights>;
  getScores(projectId: Id): Promise<VendorScoreList>;
  listResponses(projectId: Id, query?: ResponseQuery): Promise<ResponseList>;
  getResponse(projectId: Id, responseId: Id, query?: { includeExcluded?: boolean }): Promise<ResponseDetail>;
  updateResponse(projectId: Id, responseId: Id, body: ResponseUpdate): Promise<ResponseUpdateResult>;
  rereadResponses(projectId: Id, body?: RereadRequest): Promise<RereadResult>;
  resetProject(projectId: Id, body: ProjectResetRequest): Promise<ProjectResetResult>;
  listSurveys(projectId: Id): Promise<List<Survey>>;
  getGraph(projectId: Id, filters?: ProjectFilters): Promise<ProjectGraph>;
  listActivity(projectId: Id, query?: { limit?: number }): Promise<List<ActivityEvent>>;
};

// ---- Which data the app shows: the real backend ("live") or the built-in demo data ----

export type DataSource = "live" | "demo";
export { DATA_SOURCE_COOKIE, SESSION_COOKIE };

const BACKEND_URL = process.env.FEEDBACK_API_URL?.replace(/\/$/, "");
const live = BACKEND_URL ? createHttpApi(BACKEND_URL) : null;

// For Settings: the backend's host, or null when no backend is configured.
export const backendHost = BACKEND_URL ? new URL(BACKEND_URL).host : null;

// Live when a backend is configured, unless this browser chose demo data in Settings → Data source.
export const getDataSource = cache(async (): Promise<DataSource> => {
  if (!live) return "demo";
  return (await cookies()).get(DATA_SOURCE_COOKIE)?.value === "demo" ? "demo" : "live";
});

const getSessionToken = cache(async () => (await cookies()).get(SESSION_COOKIE)?.value);

// Forwards a call to whichever source this request uses, as the signed-in user.
// A 401 (no session, or it expired) sends the person to the login page.
function forward<K extends keyof FeedbackApi>(name: K): FeedbackApi[K] {
  const call = async (...args: unknown[]) => {
    const token = await getSessionToken();
    const source = (await getDataSource()) === "live" ? live!(token) : demoApiFor(token);
    try {
      return await (source[name] as (...a: unknown[]) => unknown)(...args);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && name !== "login") redirect("/login?expired=1");
      throw err;
    }
  };
  return call as FeedbackApi[K];
}

// cache() de-duplicates reads with the same arguments within one request,
// so the layout, page and metadata can all ask for the project without extra round trips.
export const api: FeedbackApi = {
  login: forward("login"),
  getMe: cache(forward("getMe")),
  listUsers: cache(forward("listUsers")),
  listProjects: cache(forward("listProjects")),
  getProject: cache(forward("getProject")),
  getSummary: cache(forward("getSummary")),
  getResponsesByWeek: cache(forward("getResponsesByWeek")),
  getCoverage: cache(forward("getCoverage")),
  listFeatures: cache(forward("listFeatures")),
  getFeature: cache(forward("getFeature")),
  getFeatureSummary: cache(forward("getFeatureSummary")),
  listFeatureResponses: cache(forward("listFeatureResponses")),
  listFeatureVendors: cache(forward("listFeatureVendors")),
  listRelatedFeatures: cache(forward("listRelatedFeatures")),
  listFeatureFeedback: cache(forward("listFeatureFeedback")),
  listVendors: cache(forward("listVendors")),
  getVendor: cache(forward("getVendor")),
  getVendorSummary: cache(forward("getVendorSummary")),
  listVendorRequests: cache(forward("listVendorRequests")),
  listVendorFeatures: cache(forward("listVendorFeatures")),
  listVendorResponses: cache(forward("listVendorResponses")),
  getWeights: cache(forward("getWeights")),
  getScores: cache(forward("getScores")),
  listResponses: cache(forward("listResponses")),
  getResponse: cache(forward("getResponse")),
  listSurveys: cache(forward("listSurveys")),
  getGraph: cache(forward("getGraph")),
  listActivity: cache(forward("listActivity")),
  // Writes are never cached.
  createUser: forward("createUser"),
  updateUser: forward("updateUser"),
  deleteUser: forward("deleteUser"),
  createFeature: forward("createFeature"),
  updateFeature: forward("updateFeature"),
  deleteFeature: forward("deleteFeature"),
  addFeatureFeedback: forward("addFeatureFeedback"),
  deleteFeatureFeedback: forward("deleteFeatureFeedback"),
  createVendor: forward("createVendor"),
  updateVendor: forward("updateVendor"),
  deleteVendor: forward("deleteVendor"),
  updateWeights: forward("updateWeights"),
  updateResponse: forward("updateResponse"),
  rereadResponses: forward("rereadResponses"),
  resetProject: forward("resetProject"),
};

// Turns a 404 from the API into the route's not-found page.
export async function orNotFound<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (err) {
    if (isNotFound(err)) notFound();
    throw err;
  }
}
