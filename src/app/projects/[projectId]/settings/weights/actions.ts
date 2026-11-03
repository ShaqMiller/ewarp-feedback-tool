"use server";

import { api } from "@/lib/api";
import { runAdminWrite, type ActionResult } from "@/lib/actions";
import type { RespondentGroup } from "@/lib/api/types";

// The form sends one "weight:<id>" field per row; only those rows change.
function rows(formData: FormData) {
  return [...formData.entries()]
    .filter(([name]) => name.startsWith("weight:"))
    .map(([name, value]) => ({ id: name.slice("weight:".length), weight: Number(value) }));
}

export async function saveGroupWeightsAction(projectId: string, _prev: ActionResult, formData: FormData) {
  const groups = rows(formData).map(({ id, weight }) => ({ key: id as RespondentGroup, weight }));
  return runAdminWrite(() => api.updateWeights(projectId, { groups }), "Group weights saved. Vendor scores are updated.");
}

export async function saveFeatureWeightsAction(projectId: string, _prev: ActionResult, formData: FormData) {
  const features = rows(formData);
  return runAdminWrite(() => api.updateWeights(projectId, { features }), "Feature weights saved. Vendor scores are updated.");
}
