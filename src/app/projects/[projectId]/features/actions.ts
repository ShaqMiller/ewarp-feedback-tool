"use server";

// Manual features and feedback. Admins only: runAdminWrite checks the role before calling the API (which checks again).

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { runAdminWrite, type ActionResult } from "@/lib/actions";
import type { FeedbackInput, RespondentGroup, Sentiment } from "@/lib/api/types";

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// One feedback entry from fields named kind / group / vendorId / note, or several from fb.kind[] … fb.note[] in order.
function feedbackFrom(formData: FormData, prefix = ""): FeedbackInput[] {
  const kinds = formData.getAll(`${prefix}kind`).map(String);
  const groups = formData.getAll(`${prefix}group`).map(String);
  const vendors = formData.getAll(`${prefix}vendorId`).map(String);
  const notes = formData.getAll(`${prefix}note`).map(String);
  return kinds.map((kind, i) => ({
    kind: kind as Sentiment,
    group: groups[i] as RespondentGroup,
    vendorId: vendors[i] || null,
    note: notes[i]?.trim() ?? "",
  }));
}

export async function createFeatureAction(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  let createdId: string | undefined;
  const result = await runAdminWrite(async () => {
    const feature = await api.createFeature(projectId, {
      name,
      vendorIds: formData.getAll("vendorIds").map(String),
      feedback: feedbackFrom(formData, "fb."),
    });
    createdId = feature.id;
  }, `Added ${name}.`);
  if (result?.ok && createdId) redirect(`/projects/${projectId}/features/${createdId}`);
  return result;
}

export async function renameFeatureAction(projectId: string, featureId: string, _prev: ActionResult, formData: FormData) {
  const name = text(formData, "name");
  return runAdminWrite(() => api.updateFeature(projectId, featureId, { name }), `Renamed to ${name}.`);
}

export async function setFeatureVendorsAction(projectId: string, featureId: string, _prev: ActionResult, formData: FormData) {
  const vendorIds = formData.getAll("vendorIds").map(String);
  return runAdminWrite(() => api.updateFeature(projectId, featureId, { vendorIds }), "Vendors saved.");
}

export async function deleteFeatureAction(projectId: string, featureId: string): Promise<ActionResult> {
  const result = await runAdminWrite(() => api.deleteFeature(projectId, featureId), "Feature deleted.");
  if (result?.ok) redirect(`/projects/${projectId}/features`);
  return result;
}

export async function addFeedbackAction(projectId: string, featureId: string, _prev: ActionResult, formData: FormData) {
  const [entry] = feedbackFrom(formData);
  return runAdminWrite(() => api.addFeatureFeedback(projectId, featureId, entry), "Feedback added.");
}

export async function deleteFeedbackAction(projectId: string, featureId: string, entryId: string) {
  return runAdminWrite(() => api.deleteFeatureFeedback(projectId, featureId, entryId), "Feedback removed.");
}
