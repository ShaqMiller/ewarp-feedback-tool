// Shared by the Server Actions that change data. Not a "use server" file itself: it's imported by them.

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { adminOnly } from "@/lib/auth";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string } | null;

// Runs an admin-only write, then refresh() re-renders the current page with fresh data (sidebar counts included).
export async function runAdminWrite(write: () => Promise<unknown>, success: string): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return { ok: false, error: denied };
  try {
    await write();
  } catch (err) {
    unstable_rethrow(err); // an expired session redirects to /login
    // 4xx messages are written for people (e.g. "A vendor named Prism already exists in this project.").
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "That didn't save. Check your connection and try again." };
  }
  refresh();
  return { ok: true, message: success };
}
