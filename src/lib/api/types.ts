// The API contract between this front end and the backend.
// Every type here is the JSON body of one endpoint in docs/API.md.
// IDs are opaque strings: the front end never parses them, so UUIDs or numeric strings both work.
// Dates are ISO 8601 strings in UTC.

export type Id = string;

export type Group = "pm" | "sponsor" | "other";
export type Sentiment = "like" | "dislike" | "want";

// How many of the project's vendors offer a feature.
export type Coverage = "all" | "some" | "none";

export type SentimentCounts = Record<Sentiment, number>;

// Optional filters accepted by the summary, analytics, feature and vendor endpoints.
// Not wired to the UI yet; the demo API already honors them.
export type ProjectFilters = {
  from?: string; // ISO date, inclusive
  to?: string; // ISO date, inclusive
  group?: Group;
};

export type List<T> = {
  items: T[];
  total: number; // total matches before `limit`
};

// GET /me
export type CurrentUser = {
  id: Id;
  name: string;
  role: string;
};

// GET /projects
export type ProjectListItem = {
  id: Id;
  name: string;
  responseCount: number;
  lastResponseAt: string | null;
};

// GET /projects/:projectId
export type Project = {
  id: Id;
  name: string;
  description: string;
  createdAt: string;
  lastResponseAt: string | null;
  counts: {
    features: number;
    vendors: number;
    responses: number;
    surveys: number;
  };
};

// GET /projects/:projectId/summary
export type ProjectSummary = {
  responses: {
    total: number;
    thisWeek: number; // submitted in the last 7 days
  };
  features: {
    total: number;
    mentions: number; // every time AI linked a response to a feature
  };
  requests: {
    total: number; // features at least one response wants
    unmet: number; // of those, features no vendor offers
  };
  sentiment: SentimentCounts;
  analysis: {
    processed: number; // responses AI has read
    total: number;
  };
};

// GET /projects/:projectId/analytics/responses-by-week
export type ResponsesByWeek = {
  weeks: {
    weekStart: string; // Monday, ISO date
    counts: Record<Group, number>;
  }[];
};

// GET /projects/:projectId/analytics/coverage
export type CoverageBreakdown = Record<Coverage, number> & { total: number };

// GET /projects/:projectId/features
export type FeatureListItem = {
  id: Id;
  name: string;
  coverage: Coverage;
  vendorIds: Id[]; // vendors that offer it
  mentions: number;
  sentiment: SentimentCounts;
};

export type FeatureSort = "mentions" | "name";

// GET /projects/:projectId/features/:featureId
export type Feature = FeatureListItem & {
  createdAt: string;
};

// GET /projects/:projectId/vendors
export type VendorListItem = {
  id: Id;
  name: string;
  responseCount: number;
  requestsMet: number; // project requests this vendor offers
  requestsTotal: number;
};

export type VendorSort = "fit" | "name";

// GET /projects/:projectId/vendors/:vendorId
export type Vendor = VendorListItem & {
  featureIds: Id[]; // features it offers
};

// GET /projects/:projectId/activity
export type ActivityEvent =
  | {
      id: Id;
      type: "response.submitted";
      occurredAt: string;
      response: { id: Id; group: Group; vendor: { id: Id; name: string } };
    }
  | {
      id: Id;
      type: "features.linked";
      occurredAt: string;
      responseId: Id;
      features: { id: Id; name: string }[];
    }
  | {
      id: Id;
      type: "gap.detected";
      occurredAt: string;
      feature: { id: Id; name: string };
    };

export const GROUP_LABELS: Record<Group, string> = {
  pm: "Program Manager",
  sponsor: "Sponsor's team",
  other: "Other group",
};
