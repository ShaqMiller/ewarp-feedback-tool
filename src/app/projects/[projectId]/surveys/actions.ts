"use server";

import { api } from "@/lib/api";
import { runAdminWrite, type ActionResult } from "@/lib/actions";

export async function excludeSurveyAction(projectId: string, surveyId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const exclusionReason = String(formData.get("exclusionReason") ?? "").trim();
  if (!exclusionReason) return { ok: false, error: "Enter a reason for excluding this survey." };
  return runAdminWrite(
    () => api.updateSurvey(projectId, surveyId, { includedInAnalysis: false, exclusionReason }),
    "Survey excluded from analysis.",
  );
}

export async function restoreSurveyAction(projectId: string, surveyId: string): Promise<ActionResult> {
  return runAdminWrite(() => api.updateSurvey(projectId, surveyId, { includedInAnalysis: true }), "Survey restored to analysis.");
}
