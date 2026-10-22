// The one place the UI gets data from. Each function is one backend endpoint (see docs/API.md).
// Set FEEDBACK_API_URL (e.g. https://api.example.com/api/v1) to use the real backend; leave it unset
// to use the demo data in ./demo. With a backend set, Settings → Data source can still switch a
// browser to demo data.

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { demoApi } from "./demo/handlers";
import { isNotFound } from "./errors";
import { createHttpApi } from "./http";
import type {
  ActivityEvent,
  CoverageBreakdown,
  CurrentUser,
  Feature,
  FeatureList,
  FeatureResponse,
  FeatureSort,
  AiSummary,
  FeatureVendor,
  FeatureView,
  Id,
  RelatedFeature,
  Sentiment,
  List,
  Project,
  ProjectFilters,
  ProjectGraph,
  ProjectListItem,
  ProjectSummary,
  ResponsesByWeek,
  Vendor,
  VendorCreate,
  VendorUpdate,
  VendorFeature,
  VendorListItem,
  VendorRequest,
  ResponseDetail,
  ResponseList,
  ResponseSort,
  ResponseStatus,
  ResponseWithMentions,
  Survey,
  VendorSort,
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
};

export type FeedbackApi = {
  getMe(): Promise<CurrentUser>;
  listProjects(): Promise<List<ProjectListItem>>;
  getProject(projectId: Id): Promise<Project>;
  getSummary(projectId: Id, filters?: ProjectFilters): Promise<ProjectSummary>;
  getResponsesByWeek(projectId: Id, query?: ProjectFilters & { weeks?: number }): Promise<ResponsesByWeek>;
  getCoverage(projectId: Id): Promise<CoverageBreakdown>;
  listFeatures(projectId: Id, query?: FeatureQuery): Promise<FeatureList>;
  getFeature(projectId: Id, featureId: Id): Promise<Feature>;
  getFeatureSummary(projectId: Id, featureId: Id): Promise<AiSummary>;
  listFeatureResponses(
    projectId: Id,
    featureId: Id,
    query?: ProjectFilters & { kind?: Sentiment; limit?: number },
  ): Promise<List<FeatureResponse>>;
  listFeatureVendors(projectId: Id, featureId: Id): Promise<List<FeatureVendor>>;
  listRelatedFeatures(projectId: Id, featureId: Id, query?: { limit?: number }): Promise<List<RelatedFeature>>;
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
  listResponses(projectId: Id, query?: ResponseQuery): Promise<ResponseList>;
  getResponse(projectId: Id, responseId: Id): Promise<ResponseDetail>;
  listSurveys(projectId: Id): Promise<List<Survey>>;
  getGraph(projectId: Id, filters?: ProjectFilters): Promise<ProjectGraph>;
  listActivity(projectId: Id, query?: { limit?: number }): Promise<List<ActivityEvent>>;
};

// ---- Which data the app shows: the real backend ("live") or the built-in demo data ----

export type DataSource = "live" | "demo";
export const DATA_SOURCE_COOKIE = "ewarp-data-source";

const BACKEND_URL = process.env.FEEDBACK_API_URL?.replace(/\/$/, "");
const live = BACKEND_URL ? createHttpApi(BACKEND_URL, process.env.FEEDBACK_API_TOKEN) : null;

// For Settings: the backend's host, or null when no backend is configured.
export const backendHost = BACKEND_URL ? new URL(BACKEND_URL).host : null;

// Live when a backend is configured, unless this browser chose demo data in Settings → Data source.
export const getDataSource = cache(async (): Promise<DataSource> => {
  if (!live) return "demo";
  return (await cookies()).get(DATA_SOURCE_COOKIE)?.value === "demo" ? "demo" : "live";
});

// Forwards a call to whichever source this request uses.
function forward<K extends keyof FeedbackApi>(name: K): FeedbackApi[K] {
  const call = async (...args: unknown[]) => {
    const source = (await getDataSource()) === "live" ? live! : demoApi;
    return (source[name] as (...a: unknown[]) => unknown)(...args);
  };
  return call as FeedbackApi[K];
}

// cache() de-duplicates reads with the same arguments within one request,
// so the layout, page and metadata can all ask for the project without extra round trips.
export const api: FeedbackApi = {
  getMe: cache(forward("getMe")),
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
  listVendors: cache(forward("listVendors")),
  getVendor: cache(forward("getVendor")),
  // Writes are never cached.
  createVendor: forward("createVendor"),
  updateVendor: forward("updateVendor"),
  deleteVendor: forward("deleteVendor"),
  getVendorSummary: cache(forward("getVendorSummary")),
  listVendorRequests: cache(forward("listVendorRequests")),
  listVendorFeatures: cache(forward("listVendorFeatures")),
  listVendorResponses: cache(forward("listVendorResponses")),
  listResponses: cache(forward("listResponses")),
  getResponse: cache(forward("getResponse")),
  listSurveys: cache(forward("listSurveys")),
  getGraph: cache(forward("getGraph")),
  listActivity: cache(forward("listActivity")),
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
