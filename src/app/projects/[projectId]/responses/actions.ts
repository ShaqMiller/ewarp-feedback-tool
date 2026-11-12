"use server";

// "Reread with AI" and "Exclude from analysis". Admins only: runAdminWrite checks the role before calling the API
// (which checks again).

import { api } from "@/lib/api";
import { runAdminWrite, type ActionResult } from "@/lib/actions";
import { plural } from "@/lib/format";

// responseIds omitted = every response in the project with no linked features yet.
export async function rereadAction(projectId: string, responseIds?: string[]): Promise<ActionResult> {
  let queued = 0;
  const result = await runAdminWrite(async () => {
    ({ queued } = await api.rereadResponses(projectId, responseIds ? { responseIds } : {}));
  }, "");
  if (!result?.ok) return result;
  if (queued === 0) {
    return { ok: true, message: responseIds ? "Already in the queue." : "Nothing to queue: every response has linked features or is already in the queue." };
  }
  return {
    ok: true,
    message: `Queued ${plural(queued, "response")}. The AI reads ${queued === 1 ? "it" : "them"} again within about a minute; refresh to see new features.`,
  };
}

// The response stays saved, but stops counting anywhere until it's restored.
export async function excludeResponseAction(projectId: string, responseId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const exclusionReason = String(formData.get("exclusionReason") ?? "").trim();
  if (!exclusionReason) return { ok: false, error: "Say why it shouldn't count, so others know later." };
  return runAdminWrite(
    () => api.updateResponse(projectId, responseId, { includedInAnalysis: false, exclusionReason }),
    "Excluded. It no longer counts anywhere.",
  );
}

export async function restoreResponseAction(projectId: string, responseId: string): Promise<ActionResult> {
  return runAdminWrite(() => api.updateResponse(projectId, responseId, { includedInAnalysis: true }), "Restored. It counts again.");
}
