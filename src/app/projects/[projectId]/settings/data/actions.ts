"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendHost, DATA_SOURCE_COOKIE } from "@/lib/api";
import { clearSession } from "@/lib/auth";

// Switches this browser between the live backend and the demo data, then signs out: the two sources
// have different accounts and projects, so the session and the current page don't carry over.
export async function setDataSourceAction(formData: FormData) {
  const choice = formData.get("source");
  if (choice !== "live" && choice !== "demo") return;
  if (choice === "live" && !backendHost) return;

  (await cookies()).set(DATA_SOURCE_COOKIE, choice, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  await clearSession();
  redirect("/login");
}
