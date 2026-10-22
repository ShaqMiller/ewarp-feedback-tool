// Shared plumbing for Server Actions that write through the API.

import { ApiError } from "./api/errors";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string } | null;

// Runs a write and turns API errors into a message the form can show.
// 4xx messages are written for people (e.g. "A vendor named Prism already exists in this project.").
export async function tryWrite<T>(write: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await write() };
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "That didn't save. Check your connection and try again." };
  }
}
