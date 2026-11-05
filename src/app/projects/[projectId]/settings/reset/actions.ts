"use server";

// Settings → Reset. Admins only: checked here before calling the API (which checks again).

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/actions";
import { adminOnly } from "@/lib/auth";
import { plural } from "@/lib/format";

export async function resetProjectAction(projectId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return { ok: false, error: denied };
  try {
    const { responses, features } = await api.resetProject(projectId, { confirm: String(formData.get("confirm") ?? "") });
    refresh();
    return { ok: true, message: `Done. Deleted ${plural(responses, "response")} and ${plural(features, "feature")}.` };
  } catch (err) {
    unstable_rethrow(err); // an expired session redirects to /login
    // Unlike other writes, show server errors too: the backend says whether anything was deleted.
    if (err instanceof ApiError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "That didn't go through. Nothing was deleted; check your connection and try again." };
  }
}
