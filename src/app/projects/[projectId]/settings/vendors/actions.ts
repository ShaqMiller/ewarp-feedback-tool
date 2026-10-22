"use server";

// Vendor writes for Settings → Vendors. They run on the server, so the backend URL and token stay private,
// then refresh() re-renders the current page with fresh data (sidebar counts included).

import { refresh } from "next/cache";
import { api } from "@/lib/api";
import { tryWrite, type ActionResult } from "@/lib/actions";

async function run(write: () => Promise<unknown>, success: string): Promise<ActionResult> {
  const result = await tryWrite(write);
  if (!result.ok) return result;
  refresh();
  return { ok: true, message: success };
}

const field = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

// form is optional: left blank, the backend uses the vendor name.
export async function createVendorAction(projectId: string, _prev: ActionResult, formData: FormData) {
  const name = field(formData, "name");
  const form = field(formData, "form") || undefined;
  return run(() => api.createVendor(projectId, { name, form }), `Added ${name}.`);
}

// Saves the name, and the Google Form name if one was entered (blank keeps the current form).
export async function editVendorAction(projectId: string, vendorId: string, _prev: ActionResult, formData: FormData) {
  const name = field(formData, "name");
  const form = field(formData, "form") || undefined;
  return run(() => api.updateVendor(projectId, vendorId, { name, form }), "Saved.");
}

export async function setVendorFeaturesAction(projectId: string, vendorId: string, _prev: ActionResult, formData: FormData) {
  const featureIds = formData.getAll("featureIds").map(String);
  return run(() => api.updateVendor(projectId, vendorId, { featureIds }), "Features saved.");
}

export async function deleteVendorAction(projectId: string, vendorId: string) {
  return run(() => api.deleteVendor(projectId, vendorId), "Vendor deleted.");
}
