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

// admin = can change things (Settings, vendors, features, weights); viewer = read only.
export type Role = "admin" | "viewer";

// GET /me: the signed-in user.
export type CurrentUser = {
  id: Id;
  name: string;
  email: string;
  role: Role;
};

// POST /auth/login (body). Every other route needs the returned token as "Authorization: Bearer <token>".
export type LoginRequest = { email: string; password: string };

// POST /auth/login
export type Session = {
  token: string;
  expiresAt: string;
  user: CurrentUser;
};

// GET /users (admin)
export type User = CurrentUser & { createdAt: string };

// POST /users (admin, body)
export type UserCreate = { email: string; name: string; password: string; role: Role };

// PATCH /users/:userId (admin, body). Send only what changes.
export type UserUpdate = { name?: string; role?: Role; password?: string };

// The respondent groups surveys record (a person's role), each with its own weight in vendor scores.
// Filters and charts still use the three broad Groups above; pm and sponsor are the same in both.
export type RespondentGroup = "pm" | "pd" | "pa" | "congo" | "acquisition" | "data_cell" | "comops" | "wit" | "sponsor" | "other";

export const RESPONDENT_GROUP_LABELS: Record<RespondentGroup, string> = {
  pm: "Project Manager",
  pd: "Portfolio Director",
  pa: "Portfolio Analyst",
  congo: "Congressional",
  acquisition: "Acquisition",
  data_cell: "Data Cell",
  comops: "ComOps",
  wit: "Warfighter",
  sponsor: "Sponsor's team",
  other: "Other",
};

export const RESPONDENT_GROUPS = Object.keys(RESPONDENT_GROUP_LABELS) as RespondentGroup[];

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

// survey = found in survey answers by AI; manual = added by an admin.
export type FeatureSource = "survey" | "manual";

// GET /projects/:projectId/features
// mentions and sentiment count survey answers and manual feedback together.
export type FeatureListItem = {
  id: Id;
  name: string;
  coverage: Coverage;
  vendorIds: Id[]; // vendors that offer it
  mentions: number;
  sentiment: SentimentCounts;
  source: FeatureSource;
  weight: number; // how much it counts in vendor scores, 0-10 (default 1)
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

// One manual like / dislike / want, as sent in a create or add request.
export type FeedbackInput = { kind: Sentiment; group: RespondentGroup; vendorId?: Id | null; note?: string };

// POST /projects/:projectId/features (admin, body). Adds a manual feature.
export type FeatureCreate = { name: string; vendorIds?: Id[]; feedback?: FeedbackInput[] };

// PATCH /projects/:projectId/features/:featureId (admin, body). vendorIds replaces the vendors that offer it.
export type FeatureUpdate = { name?: string; vendorIds?: Id[] };

// GET /projects/:projectId/features/:featureId/feedback: manual likes / dislikes / wants, newest first.
export type FeedbackEntry = {
  id: Id;
  kind: Sentiment;
  group: RespondentGroup;
  vendor: { id: Id; name: string } | null;
  note: string;
  createdBy: { id: Id; name: string } | null;
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
  score: number; // 0-100, see VendorScore
};

export type VendorSort = "score" | "fit" | "name";

// GET /projects/:projectId/vendors/:vendorId
export type Vendor = VendorListItem & {
  featureIds: Id[]; // features it offers
};

// POST /projects/:projectId/vendors (body)
export type VendorCreate = { name: string };

// PATCH /projects/:projectId/vendors/:vendorId (body). Send only what changes.
// featureIds replaces the full list of features the vendor offers.
export type VendorUpdate = { name?: string; featureIds?: Id[] };

// GET /projects/:projectId/weights
export type Weights = {
  groups: { key: RespondentGroup; label: string; weight: number }[];
  features: { id: Id; name: string; source: FeatureSource; weight: number }[];
};

// PUT /projects/:projectId/weights (admin, body). Only the rows sent change. Weights are 0-10.
export type WeightsUpdate = {
  groups?: { key: RespondentGroup; weight: number }[];
  features?: { id: Id; weight: number }[];
};

// POST /projects/:projectId/responses/reread (admin): ask the AI to read responses again.
// Omit responseIds to queue every response that has no linked features yet.
export type RereadRequest = { responseIds?: Id[] };
export type RereadResult = { queued: number }; // read again on the AI's next pass, within about a minute

// GET /projects/:projectId/scores: vendors ranked by score.
// Each like / dislike / want counts its group's weight; each feature counts its own weight.
//   demand(f) = weighted wants for f;  coverage = share of weighted demand the vendor offers (0-1)
//   satisfaction = (likes - dislikes) / (likes + dislikes + 3 neutral votes) over its own feedback on features it offers (-1..1)
//   score = round(100 * (mix.coverage * coverage + mix.satisfaction * (satisfaction + 1) / 2))
export type VendorScore = {
  vendor: { id: Id; name: string };
  score: number;
  coverage: number;
  satisfaction: number;
  // Points each feature adds to the score; biggest effect first.
  breakdown: {
    feature: { id: Id; name: string };
    weight: number;
    demand: number;
    offers: boolean;
    likes: number;
    dislikes: number;
    contribution: number;
  }[];
};

export type VendorScoreList = List<VendorScore> & { mix: { coverage: number; satisfaction: number } };

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
  rereadQueued: boolean; // an admin asked the AI to read it again (POST /responses/reread) and it hasn't yet
  // The survey's other written answers, beyond likes / dislikes / wants (e.g. "If you rated X low, why?").
  // Newer surveys keep most feedback here, and AI reads these too. Names and contact details are left out.
  answers: { question: string; answer: string }[];
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
  features: { id: Id; name: string; coverage: Coverage; vendorIds: Id[]; source: FeatureSource }[];
  vendors: { id: Id; name: string }[];
  links: { responseId: Id; featureId: Id; kind: Sentiment }[]; // one per mention
  manual: (FeedbackEntry & { featureId: Id })[]; // likes / dislikes / wants admins entered by hand, after filters
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
