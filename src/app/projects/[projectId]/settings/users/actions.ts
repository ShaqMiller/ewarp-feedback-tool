"use server";

import { api } from "@/lib/api";
import { runAdminWrite, type ActionResult } from "@/lib/actions";
import type { Role } from "@/lib/api/types";

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const roleFrom = (formData: FormData): Role => (formData.get("role") === "admin" ? "admin" : "viewer");

export async function createUserAction(_prev: ActionResult, formData: FormData) {
  const name = field(formData, "name");
  const body = { name, email: field(formData, "email"), password: String(formData.get("password") ?? ""), role: roleFrom(formData) };
  return runAdminWrite(() => api.createUser(body), `Added ${name}. Send them their email and password to sign in.`);
}

export async function setUserRoleAction(userId: string, _prev: ActionResult, formData: FormData) {
  const role = roleFrom(formData);
  return runAdminWrite(() => api.updateUser(userId, { role }), role === "admin" ? "Now an admin." : "Now a viewer.");
}

export async function resetPasswordAction(userId: string, _prev: ActionResult, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  return runAdminWrite(() => api.updateUser(userId, { password }), "Password changed.");
}

export async function deleteUserAction(userId: string) {
  return runAdminWrite(() => api.deleteUser(userId), "User removed.");
}
