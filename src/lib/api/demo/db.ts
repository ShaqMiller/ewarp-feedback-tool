// Demo database. Tables are normalized the way the real backend stores them,
// and handlers.ts answers each endpoint from these rows.
// Dates are relative to server start so "this week" and the weekly chart always have data.

import type { Group, Id, Sentiment } from "../types";

export type ProjectRow = { id: Id; name: string; description: string; createdAt: string };
export type SurveyRow = { id: Id; projectId: Id; name: string; createdAt: string };
export type VendorRow = { id: Id; projectId: Id; name: string };
export type FeatureRow = { id: Id; projectId: Id; name: string; createdAt: string };
export type OfferingRow = { featureId: Id; vendorId: Id }; // vendor offers feature
export type ResponseRow = {
  id: Id;
  projectId: Id;
  surveyId: Id;
  vendorId: Id;
  group: Group;
  likes: string;
  dislikes: string;
  wants: string;
  submittedAt: string;
  analyzedAt: string | null; // null until AI has read it
};
export type MentionRow = { id: Id; responseId: Id; featureId: Id; kind: Sentiment };

const now = Date.now();
const DAY = 86_400_000;
const daysAgo = (days: number, minutes = 0) => new Date(now - days * DAY + minutes * 60_000).toISOString();

export const projects: ProjectRow[] = [
  {
    id: "prj_1",
    name: "Collaboration Platform Eval",
    description: "Which collaboration platform best fits program teams.",
    createdAt: daysAgo(30),
  },
  {
    id: "prj_2",
    name: "Field Data Capture",
    description: "Tools for collecting inspection data on site.",
    createdAt: daysAgo(4),
  },
  {
    id: "prj_3",
    name: "Training Records System",
    description: "Replacing the spreadsheet that tracks certifications.",
    createdAt: daysAgo(14),
  },
];

export const surveys: SurveyRow[] = [
  { id: "srv_1", projectId: "prj_1", name: "Platform feedback (Google Form)", createdAt: daysAgo(25) },
  { id: "srv_2", projectId: "prj_2", name: "Field tools feedback (Google Form)", createdAt: daysAgo(3) },
  { id: "srv_3", projectId: "prj_3", name: "Training records feedback (Google Form)", createdAt: daysAgo(12) },
];

export const vendors: VendorRow[] = [
  { id: "vnd_1", projectId: "prj_1", name: "Vendor 1" },
  { id: "vnd_2", projectId: "prj_1", name: "Vendor 2" },
  { id: "vnd_3", projectId: "prj_1", name: "Vendor 3" },
  { id: "vnd_4", projectId: "prj_2", name: "Vendor X" },
  { id: "vnd_5", projectId: "prj_2", name: "Vendor Y" },
  { id: "vnd_6", projectId: "prj_3", name: "Vendor A" },
  { id: "vnd_7", projectId: "prj_3", name: "Vendor B" },
];

// [id, project, name, vendors that offer it]
const featureSeed: [Id, Id, string, Id[]][] = [
  ["ftr_1", "prj_1", "Dashboard", ["vnd_1", "vnd_2", "vnd_3"]],
  ["ftr_2", "prj_1", "PDF export", []],
  ["ftr_3", "prj_1", "Permission controls", ["vnd_1", "vnd_2", "vnd_3"]],
  ["ftr_4", "prj_1", "Search", ["vnd_1", "vnd_2", "vnd_3"]],
  ["ftr_5", "prj_1", "Notifications", ["vnd_1", "vnd_2", "vnd_3"]],
  ["ftr_6", "prj_1", "Single sign-on", ["vnd_2"]],
  ["ftr_7", "prj_1", "Mobile view", ["vnd_1"]],
  ["ftr_8", "prj_1", "Templates", ["vnd_2"]],
  ["ftr_9", "prj_1", "Version history", ["vnd_3"]],
  ["ftr_10", "prj_1", "Offline mode", ["vnd_3"]],
  ["ftr_11", "prj_1", "File sync", ["vnd_3"]],
  ["ftr_12", "prj_1", "Audit log", []],
  ["ftr_13", "prj_1", "Bulk edit", []],
  ["ftr_14", "prj_1", "Timeline view", ["vnd_3"]],
  ["ftr_15", "prj_1", "Cross-project links", []],
  ["ftr_16", "prj_1", "Report sharing", ["vnd_1"]],
  ["ftr_17", "prj_1", "Shared comments", []],
  ["ftr_18", "prj_3", "Course catalog", ["vnd_6", "vnd_7"]],
  ["ftr_19", "prj_3", "Certificate tracking", ["vnd_6"]],
  ["ftr_20", "prj_3", "Expiry reminders", []],
  ["ftr_21", "prj_3", "Compliance reports", ["vnd_7"]],
];

export const offerings: OfferingRow[] = featureSeed.flatMap(([featureId, , , vendorIds]) =>
  vendorIds.map((vendorId) => ({ featureId, vendorId })),
);

type ResponseSeed = Omit<ResponseRow, "projectId" | "surveyId" | "submittedAt" | "analyzedAt"> & {
  daysAgo: number;
  analyzed?: boolean;
  mentions: [Id, Sentiment][];
};

const responseSeed: Record<Id, { surveyId: Id; rows: ResponseSeed[] }> = {
  prj_1: {
    surveyId: "srv_1",
    rows: [
      { id: "rsp_1", group: "pm", vendorId: "vnd_1", daysAgo: 21, likes: "The dashboard is easy to read at a glance.", dislikes: "Setting up a new project takes too many steps.", wants: "A way to export reports to PDF.", mentions: [["ftr_1", "like"], ["ftr_2", "want"]] },
      { id: "rsp_2", group: "pm", vendorId: "vnd_2", daysAgo: 19, likes: "Search finds old documents quickly.", dislikes: "Notifications are noisy.", wants: "Shared comments on documents.", mentions: [["ftr_4", "like"], ["ftr_5", "dislike"], ["ftr_17", "want"]] },
      { id: "rsp_3", group: "sponsor", vendorId: "vnd_1", daysAgo: 18, likes: "Good permission controls.", dislikes: "The mobile view is hard to use.", wants: "Single sign-on with our existing accounts.", mentions: [["ftr_3", "like"], ["ftr_7", "dislike"], ["ftr_6", "want"]] },
      { id: "rsp_4", group: "sponsor", vendorId: "vnd_3", daysAgo: 14, likes: "Support answers fast.", dislikes: "Pricing is unclear.", wants: "A clear audit log of who changed what.", mentions: [["ftr_12", "want"]] },
      { id: "rsp_5", group: "other", vendorId: "vnd_2", daysAgo: 12, likes: "Templates save a lot of time.", dislikes: "Hard to find older versions.", wants: "Version history with a compare view.", mentions: [["ftr_8", "like"], ["ftr_9", "want"]] },
      { id: "rsp_6", group: "other", vendorId: "vnd_3", daysAgo: 8, likes: "Works well offline.", dislikes: "Syncing is slow on large files.", wants: "Notifications only for things I own.", mentions: [["ftr_10", "like"], ["ftr_11", "dislike"], ["ftr_5", "want"]] },
      { id: "rsp_7", group: "pm", vendorId: "vnd_3", daysAgo: 5, likes: "Simple timeline view.", dislikes: "Can't link tasks across projects.", wants: "Cross-project task links.", mentions: [["ftr_14", "like"], ["ftr_15", "want"]] },
      { id: "rsp_8", group: "pm", vendorId: "vnd_1", daysAgo: 1, likes: "Easy to share reports with my team. The dashboard helps too.", dislikes: "No bulk editing.", wants: "Bulk edit for many items at once.", mentions: [["ftr_16", "like"], ["ftr_1", "like"], ["ftr_13", "want"]] },
    ],
  },
  prj_3: {
    surveyId: "srv_3",
    rows: [
      { id: "rsp_9", group: "pm", vendorId: "vnd_6", daysAgo: 10, likes: "The course catalog is well organized.", dislikes: "Hard to see who is about to expire.", wants: "Reminders before a certificate expires.", mentions: [["ftr_18", "like"], ["ftr_19", "dislike"], ["ftr_20", "want"]] },
      { id: "rsp_10", group: "sponsor", vendorId: "vnd_7", daysAgo: 6, likes: "Compliance reports are audit-ready.", dislikes: "Finding a course takes too long.", wants: "Expiry reminders by email.", mentions: [["ftr_21", "like"], ["ftr_18", "dislike"], ["ftr_20", "want"]] },
      { id: "rsp_11", group: "other", vendorId: "vnd_6", daysAgo: 0.5, analyzed: false, likes: "Quick to log a completed course.", dislikes: "No mobile app.", wants: "Bulk import from our old spreadsheet.", mentions: [] },
    ],
  },
};

export const responses: ResponseRow[] = [];
export const mentions: MentionRow[] = [];

for (const [projectId, { surveyId, rows }] of Object.entries(responseSeed)) {
  for (const { daysAgo: days, analyzed = true, mentions: ms, ...row } of rows) {
    responses.push({
      ...row,
      projectId,
      surveyId,
      submittedAt: daysAgo(days),
      analyzedAt: analyzed ? daysAgo(days, 6) : null,
    });
    ms.forEach(([featureId, kind], i) => mentions.push({ id: `mnt_${row.id}_${i}`, responseId: row.id, featureId, kind }));
  }
}

// A feature is created when AI first finds it in a response.
export const features: FeatureRow[] = featureSeed.map(([id, projectId, name]) => {
  const firstSeen = mentions
    .filter((m) => m.featureId === id)
    .map((m) => responses.find((r) => r.id === m.responseId)?.analyzedAt)
    .filter((d): d is string => !!d)
    .sort()[0];
  return { id, projectId, name, createdAt: firstSeen ?? projects.find((p) => p.id === projectId)!.createdAt };
});
