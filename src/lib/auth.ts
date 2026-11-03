// Who is signed in, and the session cookie. The backend checks every request again; these checks
// only decide what the UI shows and stop a viewer's form from reaching the API.

import { cookies } from "next/headers";
import { api, SESSION_COOKIE } from "@/lib/api";
import type { Session } from "@/lib/api/types";

export async function isAdmin() {
  return (await api.getMe()).role === "admin";
}

// For Server Actions: an error message to show when the signed-in user isn't an admin, else null.
export async function adminOnly(): Promise<string | null> {
  return (await isAdmin()) ? null : "Only admins can change this.";
}

export async function saveSession(session: Session) {
  (await cookies()).set(SESSION_COOKIE, session.token, {
    path: "/",
    expires: new Date(session.expiresAt),
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Only same-site paths, so ?next= can't send someone to another site after signing in.
export const safeNext = (next: unknown) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/projects";
