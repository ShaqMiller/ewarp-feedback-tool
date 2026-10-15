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

export type FeatureSort = "mentions" | "newest" | "name";

// Tabs on the Features page.
//   requested = at least one want, gap = no vendor offers it, pain = at least one dislike
export type FeatureView = "all" | "requested" | "gap" | "pain";

// GET /projects/:projectId/features
export type FeatureList = List<FeatureListItem> & {
  facets: Record<FeatureView, number>; // matches per view, after `q` and filters but before `view`
};

// GET /projects/:projectId/features/:featureId
export type Feature = FeatureListItem & {
  createdAt: string;
};

// GET /projects/:projectId/features/:featureId/summary and /vendors/:vendorId/summary
export type AiSummary = {
  text: string | null; // null until AI has written one
  basedOn: number; // responses the summary was written from
  generatedAt: string | null;
};

// One survey response. Reused by the Responses section later.
export type SurveyResponse = {
  id: Id;
  surveyId: Id;
  group: Group;
  vendor: { id: Id; name: string };
  submittedAt: string;
  likes: string;
  dislikes: string;
  wants: string;
  analyzed: boolean;
};

// GET /projects/:projectId/features/:featureId/responses
// A response that mentions the feature, and how (usually one kind, occasionally more).
export type FeatureResponse = SurveyResponse & { kinds: Sentiment[] };

// GET /projects/:projectId/features/:featureId/vendors
// Every project vendor, whether it offers the feature, and what its own users said about it.
export type FeatureVendor = {
  vendor: { id: Id; name: string };
  offers: boolean;
  sentiment: SentimentCounts;
};

// GET /projects/:projectId/features/:featureId/related
// Features mentioned in the same responses, most shared responses first.
export type RelatedFeature = {
  id: Id;
  name: string;
  coverage: Coverage;
  sharedResponses: number;
};

// GET /projects/:projectId/vendors
export type VendorListItem = {
  id: Id;
  name: string;
  responseCount: number;
  requestsMet: number; // project requests this vendor offers
  requestsTotal: number;
  featureCount: number; // features it offers
  exclusiveCount: number; // of those, features no other vendor offers
  sentiment: SentimentCounts; // feedback from its own users
};

export type VendorSort = "fit" | "name";

// GET /projects/:projectId/vendors/:vendorId
export type Vendor = VendorListItem & {
  featureIds: Id[]; // features it offers
};

// GET /projects/:projectId/vendors/:vendorId/requests
// Every requested feature in the project, and whether this vendor offers it.
export type VendorRequest = {
  feature: { id: Id; name: string };
  offers: boolean;
  wants: number; // want mentions across the whole project
};

// GET /projects/:projectId/vendors/:vendorId/features
// Features this vendor offers, with what its own users said about each.
export type VendorFeature = {
  id: Id;
  name: string;
  exclusive: boolean; // no other vendor in the project offers it
  sentiment: SentimentCounts;
};

// A feature AI linked to a response, and how.
export type ResponseMention = { feature: { id: Id; name: string }; kind: Sentiment };

// GET /projects/:projectId/vendors/:vendorId/responses
export type ResponseWithMentions = SurveyResponse & { mentions: ResponseMention[] };

export type ResponseStatus = "analyzed" | "pending"; // pending = AI hasn't read it yet
export type ResponseSort = "newest" | "oldest";

// GET /projects/:projectId/responses
export type ResponseList = List<ResponseWithMentions> & {
  // Counts for the filter chips, after every filter except the one being counted.
  facets: { group: Record<Group, number>; status: Record<ResponseStatus, number> };
};

// GET /projects/:projectId/responses/:responseId
export type ResponseDetail = Omit<ResponseWithMentions, "mentions"> & {
  survey: { id: Id; name: string };
  mentions: (ResponseMention & { coverage: Coverage })[];
};

// GET /projects/:projectId/surveys
export type Survey = {
  id: Id;
  name: string;
  source: "google_forms";
  status: "collecting" | "closed";
  createdAt: string;
  responseCount: number;
  analyzedCount: number; // responses AI has read
  vendorCount: number; // vendors the responses are about
  lastResponseAt: string | null;
  groups: Record<Group, number>;
};

// GET /projects/:projectId/graph
// Everything the relationship map draws, in one request: it's the one view that needs every node at once.
export type ProjectGraph = {
  responses: SurveyResponse[];
  features: { id: Id; name: string; coverage: Coverage; vendorIds: Id[] }[];
  vendors: { id: Id; name: string }[];
  links: { responseId: Id; featureId: Id; kind: Sentiment }[]; // one per mention
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
