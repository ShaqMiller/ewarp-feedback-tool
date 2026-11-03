"use server";

// Vendor writes for Settings → Vendors. They run on the server, so the backend URL and token stay private.
// Admins only: runAdminWrite checks the role before calling the API (which checks again).

import { api } from "@/lib/api";
import { runAdminWrite as run, type ActionResult } from "@/lib/actions";

export type { ActionResult };

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
