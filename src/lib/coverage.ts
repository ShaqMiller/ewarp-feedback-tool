import type { Feature } from "./types";

// How well a feature is covered by vendors, which drives its color.
//   all  = green  (every vendor has it, or the focused vendor has it)
//   some = sky blue (not everyone has it; with a focused vendor: it doesn't, but a competitor does)
//   none = red    (no vendor has it)
export type Coverage = "all" | "some" | "none";

export function coverage(feature: Feature, vendorIds: string[], focusVendorId: string | null): Coverage {
  const offeredBy = feature.vendorIds.filter((v) => vendorIds.includes(v));
  if (offeredBy.length === 0) return "none";
  if (focusVendorId) return offeredBy.includes(focusVendorId) ? "all" : "some";
  return offeredBy.length === vendorIds.length ? "all" : "some";
}
