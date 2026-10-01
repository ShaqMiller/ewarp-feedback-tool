// Shape of the data the backend API will return.
// The fake data in mockData.ts follows the same shape.

export type Group = "pm" | "sponsor" | "other";

export type Sentiment = "like" | "dislike" | "want";

export type Vendor = {
  id: string;
  name: string;
};

// A feature pulled out of responses by AI.
export type Feature = {
  id: string;
  name: string;
  vendorIds: string[]; // vendors that already offer it; empty = nobody offers it yet
};

// One thing a response said about a feature (filled in by AI).
export type Mention = {
  featureId: string;
  kind: Sentiment;
};

// One Google Form survey response.
export type SurveyResponse = {
  id: string;
  group: Group;
  vendorId: string;
  likes: string;
  dislikes: string;
  wants: string;
  submittedAt: string; // ISO date
  mentions?: Mention[]; // missing until AI has read the response
};

export type FeedbackData = {
  vendors: Vendor[];
  features: Feature[];
  responses: SurveyResponse[];
};

export const GROUP_LABELS: Record<Group, string> = {
  pm: "Program Manager",
  sponsor: "Sponsor's team",
  other: "Other group",
};
