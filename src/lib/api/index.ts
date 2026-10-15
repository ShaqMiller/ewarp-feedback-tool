// The one place the UI gets data from. Each function is one backend endpoint (see docs/API.md).
// Set FEEDBACK_API_URL (e.g. https://api.example.com/api/v1) to use the real backend;
// leave it unset to use the demo data in ./demo.

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
  FeatureSummary,
  FeatureVendor,
  FeatureView,
  Id,
  RelatedFeature,
  Sentiment,
  List,
  Project,
  ProjectFilters,
  ProjectListItem,
  ProjectSummary,
  ResponsesByWeek,
  Vendor,
  VendorListItem,
  VendorSort,
} from "./types";

export type FeatureQuery = ProjectFilters & {
  view?: FeatureView;
  q?: string; // case-insensitive name search
  sort?: FeatureSort;
  limit?: number;
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
  getFeatureSummary(projectId: Id, featureId: Id): Promise<FeatureSummary>;
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
  listActivity(projectId: Id, query?: { limit?: number }): Promise<List<ActivityEvent>>;
};

const source: FeedbackApi = process.env.FEEDBACK_API_URL
  ? createHttpApi(process.env.FEEDBACK_API_URL.replace(/\/$/, ""))
  : demoApi;

// cache() de-duplicates calls with the same arguments within one request,
// so the layout, page and metadata can all ask for the project without extra round trips.
export const api: FeedbackApi = {
  getMe: cache(source.getMe),
  listProjects: cache(source.listProjects),
  getProject: cache(source.getProject),
  getSummary: cache(source.getSummary),
  getResponsesByWeek: cache(source.getResponsesByWeek),
  getCoverage: cache(source.getCoverage),
  listFeatures: cache(source.listFeatures),
  getFeature: cache(source.getFeature),
  getFeatureSummary: cache(source.getFeatureSummary),
  listFeatureResponses: cache(source.listFeatureResponses),
  listFeatureVendors: cache(source.listFeatureVendors),
  listRelatedFeatures: cache(source.listRelatedFeatures),
  listVendors: cache(source.listVendors),
  getVendor: cache(source.getVendor),
  listActivity: cache(source.listActivity),
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
