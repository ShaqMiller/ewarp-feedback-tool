"use server";

// "Reread with AI". Admins only: runAdminWrite checks the role before calling the API (which checks again).

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
  if (queued === 0) return { ok: true, message: "Every response already has linked features." };
  return {
    ok: true,
    message: `Queued ${plural(queued, "response")}. The AI reads ${queued === 1 ? "it" : "them"} again within about a minute; refresh to see new features.`,
  };
}
