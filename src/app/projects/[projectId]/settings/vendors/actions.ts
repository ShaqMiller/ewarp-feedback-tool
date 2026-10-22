"use server";

// Vendor writes for Settings → Vendors. They run on the server, so the backend URL and token stay private,
// then refresh() re-renders the current page with fresh data (sidebar counts included).

import { refresh } from "next/cache";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string } | null;

async function run(write: () => Promise<unknown>, success: string): Promise<ActionResult> {
  try {
    await write();
  } catch (err) {
    // 4xx messages are written for people (e.g. "A vendor named Prism already exists in this project.").
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "That didn't save. Check your connection and try again." };
  }
  refresh();
  return { ok: true, message: success };
}

const nameFrom = (formData: FormData) => String(formData.get("name") ?? "").trim();

export async function createVendorAction(projectId: string, _prev: ActionResult, formData: FormData) {
  const name = nameFrom(formData);
  return run(() => api.createVendor(projectId, { name }), `Added ${name}.`);
}

export async function renameVendorAction(projectId: string, vendorId: string, _prev: ActionResult, formData: FormData) {
  const name = nameFrom(formData);
  return run(() => api.updateVendor(projectId, vendorId, { name }), `Renamed to ${name}.`);
}

export async function setVendorFeaturesAction(projectId: string, vendorId: string, _prev: ActionResult, formData: FormData) {
  const featureIds = formData.getAll("featureIds").map(String);
  return run(() => api.updateVendor(projectId, vendorId, { featureIds }), "Features saved.");
}

export async function deleteVendorAction(projectId: string, vendorId: string) {
  return run(() => api.deleteVendor(projectId, vendorId), "Vendor deleted.");
}
