"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/api/demo/db";
import { ApiError } from "@/lib/api/errors";
import { clearSession, safeNext, saveSession } from "@/lib/auth";

export type LoginState = { error: string; email: string } | null;

async function signIn(email: string, password: string, next: unknown): Promise<LoginState> {
  try {
    await saveSession(await api.login({ email, password }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { error: "That email and password don't match.", email };
    if (err instanceof ApiError && err.status < 500) return { error: err.message, email };
    console.error(err);
    return { error: "Couldn't reach the server. Try again in a moment.", email };
  }
  redirect(safeNext(next));
}

export async function loginAction(_prev: LoginState, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };
  return signIn(email, password, formData.get("next"));
}

// One-click sign-in to the demo accounts, shown only while this browser uses demo data.
export async function demoLoginAction(formData: FormData) {
  const role = formData.get("role") === "viewer" ? "viewer" : "admin";
  await signIn(DEMO_ACCOUNTS[role], DEMO_PASSWORD, formData.get("next"));
}

export async function signOutAction() {
  await clearSession();
  redirect("/login");
}
