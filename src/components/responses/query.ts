import type { Group, ResponseSort, ResponseStatus } from "@/lib/api/types";

// The Responses page keeps its filters in the URL (?group=pm&vendor=vnd_2&status=pending&q=sync&page=2).

export const PAGE_SIZE = 10;
const GROUPS: Group[] = ["pm", "sponsor", "other"];

export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "analyzed", label: "Read by AI" },
  { value: "pending", label: "Waiting for AI" },
];
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

export type ResponsePageQuery = {
  group?: Group;
  vendor?: string;
  survey?: string;
  status?: ResponseStatus;
  q: string;
  sort: ResponseSort;
  page: number;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseResponseQuery(sp: Record<string, string | string[] | undefined>): ResponsePageQuery {
  const group = first(sp.group);
  const status = first(sp.status);
  const page = Number(first(sp.page));
  return {
    group: GROUPS.find((g) => g === group),
    vendor: first(sp.vendor) || undefined,
    survey: first(sp.survey) || undefined,
    status: status === "analyzed" || status === "pending" ? status : undefined,
    q: first(sp.q)?.slice(0, 100) ?? "",
    sort: first(sp.sort) === "oldest" ? "oldest" : "newest",
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

// Builds a Responses URL from the current query plus changes; any filter change goes back to page 1.
export function responsesHref(base: string, query: ResponsePageQuery, patch: Partial<ResponsePageQuery>) {
  const next = { ...query, ...("page" in patch ? {} : { page: 1 }), ...patch };
  const params = new URLSearchParams();
  if (next.group) params.set("group", next.group);
  if (next.vendor) params.set("vendor", next.vendor);
  if (next.survey) params.set("survey", next.survey);
  if (next.status) params.set("status", next.status);
  if (next.q) params.set("q", next.q);
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  return params.size ? `${base}?${params}` : base;
}
