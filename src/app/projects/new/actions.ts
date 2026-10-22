"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { tryWrite, type ActionResult } from "@/lib/actions";

// Creates the project with its vendors (each gets its own Google Forms survey), then opens its dashboard.
export async function createProjectAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const names = formData.getAll("vendorName").map((v) => String(v).trim());
  const forms = formData.getAll("vendorForm").map((v) => String(v).trim());
  // Rows left completely empty are ignored; a form name without a vendor name is sent so the API can say what's missing.
  const vendors = names
    .map((name, i) => ({ name, form: forms[i] || undefined }))
    .filter((v) => v.name || v.form);

  const result = await tryWrite(() =>
    api.createProject({ name: text("name"), description: text("description") || undefined, vendors }),
  );
  if (!result.ok) return result;
  redirect(`/projects/${result.value.id}`);
}
