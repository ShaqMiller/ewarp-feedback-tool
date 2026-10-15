import type { FeatureSort, FeatureView } from "@/lib/api/types";

// The Features page keeps its state in the URL (?view=gap&sort=name&q=sync) so views can be shared.

export const FEATURE_VIEWS: { value: FeatureView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "gap", label: "Gaps" },
  { value: "pain", label: "Pain points" },
];

export const FEATURE_SORTS: { value: FeatureSort; label: string }[] = [
  { value: "mentions", label: "Most discussed" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
];

export type FeaturePageQuery = { view: FeatureView; sort: FeatureSort; q: string };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Unknown values fall back to the defaults instead of erroring.
export function parseFeatureQuery(sp: Record<string, string | string[] | undefined>): FeaturePageQuery {
  const view = first(sp.view);
  const sort = first(sp.sort);
  return {
    view: FEATURE_VIEWS.some((v) => v.value === view) ? (view as FeatureView) : "all",
    sort: FEATURE_SORTS.some((s) => s.value === sort) ? (sort as FeatureSort) : "mentions",
    q: first(sp.q)?.slice(0, 100) ?? "",
  };
}

// Builds a Features URL, dropping params that are at their default.
export function featuresHref(base: string, query: FeaturePageQuery, patch: Partial<FeaturePageQuery>) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.view !== "all") params.set("view", next.view);
  if (next.sort !== "mentions") params.set("sort", next.sort);
  if (next.q) params.set("q", next.q);
  return params.size ? `${base}?${params}` : base;
}
