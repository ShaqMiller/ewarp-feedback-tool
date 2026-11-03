import type { Edge, Node } from "@xyflow/react";
import { GROUP_LABELS, type Id, type ProjectGraph, type Sentiment } from "@/lib/api/types";

// Lays the project out in three rows (responses, features, vendors) as React Flow nodes and edges.
// Each vendor's responses sit above it; each feature sits near what it connects to.
// Feedback admins entered by hand, and features they added, hang off one "Admins" node at the left of the responses row.

export const SIZES = {
  response: { w: 80, h: 44 },
  feature: { w: 150, h: 36 },
  vendor: { w: 140, h: 52 },
};

const SPACING = 96; // horizontal room per response
const GROUP_GAP = 120; // between vendor groups
const FEATURE_STEP = 64; // features cycle through three heights, so neighbors can sit closer than their width
const FEATURE_LEVELS = [-46, 0, 46];
const LEFT = 120; // room for the row labels
const ROWS = {
  responses: { y: 0, height: 150, label: "Responses" },
  features: { y: 240, height: 210, label: "Features" },
  vendors: { y: 470, height: 150, label: "Vendors" },
};

export type Selection = { kind: "response" | "feature" | "vendor" | "admin"; id: Id } | null;

export const ADMIN_ID = "admins"; // the one node every manual entry and manual feature comes from

// Features linked to the Admins node: ones with manual feedback, plus manual features (so they don't float alone).
export function adminFeatureIds(graph: ProjectGraph): Set<Id> {
  return new Set([...graph.manual.map((e) => e.featureId), ...graph.features.filter((f) => f.source === "manual").map((f) => f.id)]);
}

// Which nodes stay bright for a selection; null when nothing is selected.
export function litIds(graph: ProjectGraph, selection: Selection): Set<Id> | null {
  if (!selection) return null;
  const offeredBy = (fid: Id) => graph.features.find((f) => f.id === fid)?.vendorIds ?? [];
  const { kind, id } = selection;
  const adminFeatures = adminFeatureIds(graph);

  if (kind === "admin") {
    const fids = [...adminFeatures];
    return new Set([ADMIN_ID, ...fids, ...fids.flatMap(offeredBy)]);
  }
  if (kind === "response") {
    const r = graph.responses.find((r) => r.id === id);
    const fids = graph.links.filter((l) => l.responseId === id).map((l) => l.featureId);
    return new Set([id, r?.vendor.id ?? "", ...fids, ...fids.flatMap(offeredBy)]);
  }
  if (kind === "vendor") {
    const rids = graph.responses.filter((r) => r.vendor.id === id).map((r) => r.id);
    const mentioned = graph.links.filter((l) => rids.includes(l.responseId)).map((l) => l.featureId);
    const offered = graph.features.filter((f) => f.vendorIds.includes(id)).map((f) => f.id);
    const manual = graph.manual.filter((e) => e.vendor?.id === id).map((e) => e.featureId);
    return new Set([id, ...rids, ...mentioned, ...offered, ...(manual.length ? [ADMIN_ID, ...manual] : [])]);
  }
  const rids = graph.links.filter((l) => l.featureId === id).map((l) => l.responseId);
  return new Set([id, ...rids, ...offeredBy(id), ...(adminFeatures.has(id) ? [ADMIN_ID] : [])]);
}

const STROKE: Record<Sentiment, string> = {
  like: "var(--color-like)",
  dislike: "var(--color-dislike)",
  want: "var(--color-want)",
};
const DASH: Record<Sentiment, string | undefined> = { like: undefined, dislike: "6 5", want: "1 5" };

export function layoutGraph(graph: ProjectGraph, selection: Selection) {
  const lit = litIds(graph, selection);
  const dimmed = (id: Id) => lit !== null && !lit.has(id);
  const vendorIds = new Set(graph.vendors.map((v) => v.id));
  const adminFeatures = adminFeatureIds(graph);
  const hasAdmin = adminFeatures.size > 0;

  // 1. x of every response and vendor: responses grouped above their vendor, the Admins node first.
  const x = new Map<Id, number>();
  let width = 0;
  if (hasAdmin) {
    x.set(ADMIN_ID, SPACING / 2);
    width = SPACING + GROUP_GAP;
  }
  graph.vendors.forEach((v, i) => {
    const mine = graph.responses.filter((r) => r.vendor.id === v.id);
    const groupWidth = Math.max(mine.length, 1) * SPACING;
    mine.forEach((r, j) => x.set(r.id, width + SPACING * (j + 0.5)));
    x.set(v.id, width + groupWidth / 2);
    width += groupWidth + (i < graph.vendors.length - 1 ? GROUP_GAP : 0);
  });

  // 2. Features ordered by the average x of what they connect to, then spaced evenly.
  //    Features nobody mentioned and no vendor offers are left off the map.
  const avgX = (fid: Id, vids: Id[]) => {
    const xs = [
      ...graph.links.filter((l) => l.featureId === fid).map((l) => x.get(l.responseId)),
      ...vids.filter((v) => vendorIds.has(v)).map((v) => x.get(v)),
      adminFeatures.has(fid) ? x.get(ADMIN_ID) : undefined,
    ].filter((n): n is number => n !== undefined);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const placed = graph.features
    .map((f) => ({ f, at: avgX(f.id, f.vendorIds) }))
    .filter((p): p is { f: (typeof graph.features)[number]; at: number } => p.at !== null)
    .sort((a, b) => a.at - b.at)
    .map((p) => p.f);

  const rowWidth = placed.length ? (placed.length - 1) * FEATURE_STEP + SIZES.feature.w : 0;
  if (rowWidth > width) {
    const shift = (rowWidth - width) / 2;
    for (const [id, v] of x) x.set(id, v + shift);
    width = rowWidth;
  }
  const featureX = new Map<Id, number>();
  const start = (width - rowWidth) / 2 + SIZES.feature.w / 2;
  placed.forEach((f, i) => featureX.set(f.id, start + i * FEATURE_STEP));

  // 3. Nodes.
  const nodes: Node[] = Object.entries(ROWS).map(([key, row]) => ({
    id: `band-${key}`,
    type: "band",
    position: { x: 0, y: row.y - row.height / 2 },
    data: { label: row.label, divider: key !== "responses" },
    style: { width: LEFT + width + 40, height: row.height, pointerEvents: "none" as const },
    selectable: false,
    focusable: false,
    zIndex: -1,
  }));

  for (const r of graph.responses) {
    nodes.push({
      id: r.id,
      type: "response",
      position: { x: LEFT + x.get(r.id)! - SIZES.response.w / 2, y: ROWS.responses.y - SIZES.response.h / 2 },
      data: { response: r, selected: selection?.id === r.id, dimmed: dimmed(r.id) },
      ariaLabel: `Response from ${GROUP_LABELS[r.group]}, ${r.vendor.name}`,
    });
  }
  if (hasAdmin) {
    nodes.push({
      id: ADMIN_ID,
      type: "admin",
      position: { x: LEFT + x.get(ADMIN_ID)! - SIZES.response.w / 2, y: ROWS.responses.y - SIZES.response.h / 2 },
      data: { entries: graph.manual.length, selected: selection?.id === ADMIN_ID, dimmed: dimmed(ADMIN_ID) },
      ariaLabel: `Added by admins: ${graph.manual.length} feedback entries`,
    });
  }
  placed.forEach((f, i) => {
    nodes.push({
      id: f.id,
      type: "feature",
      position: {
        x: LEFT + featureX.get(f.id)! - SIZES.feature.w / 2,
        y: ROWS.features.y + FEATURE_LEVELS[i % FEATURE_LEVELS.length] - SIZES.feature.h / 2,
      },
      data: { feature: f, selected: selection?.id === f.id, dimmed: dimmed(f.id) },
      ariaLabel: `Feature ${f.name}`,
      zIndex: i,
    });
  });
  for (const v of graph.vendors) {
    nodes.push({
      id: v.id,
      type: "vendor",
      position: { x: LEFT + x.get(v.id)! - SIZES.vendor.w / 2, y: ROWS.vendors.y - SIZES.vendor.h / 2 },
      data: {
        vendor: v,
        responseCount: graph.responses.filter((r) => r.vendor.id === v.id).length,
        selected: selection?.id === v.id,
        dimmed: dimmed(v.id),
      },
      ariaLabel: `Vendor ${v.name}`,
    });
  }

  // 4. Edges: response -> feature (pattern shows like / dislike / want), feature -> vendor (offers).
  //    Responses AI hasn't read yet link straight to their vendor with a faint dashed line.
  const edges: Edge[] = [];
  const featureIds = new Set(placed.map((f) => f.id));
  const active = (a: Id, b: Id) => lit !== null && lit.has(a) && lit.has(b);
  const quiet = lit !== null; // something is selected, so unrelated lines fade back

  for (const l of graph.links) {
    if (!featureIds.has(l.featureId)) continue;
    const on = active(l.responseId, l.featureId);
    edges.push({
      id: `${l.responseId}->${l.featureId}-${l.kind}`,
      source: l.responseId,
      target: l.featureId,
      style: {
        stroke: on ? STROKE[l.kind] : quiet ? "var(--color-line)" : "var(--color-cov-some)",
        strokeWidth: on ? 2 : 1.25,
        strokeDasharray: DASH[l.kind],
        strokeLinecap: "round",
      },
      zIndex: on ? 1 : 0,
    });
  }
  // Admins -> feature: one line per feature and kind they entered, and a faint dashed one to manual features with none.
  const adminKinds = new Map<Id, Set<Sentiment>>();
  for (const e of graph.manual) adminKinds.set(e.featureId, (adminKinds.get(e.featureId) ?? new Set()).add(e.kind));
  for (const fid of adminFeatures) {
    if (!featureIds.has(fid)) continue;
    const on = active(ADMIN_ID, fid);
    const kinds = adminKinds.get(fid);
    if (!kinds) {
      edges.push({
        id: `${ADMIN_ID}->${fid}`,
        source: ADMIN_ID,
        target: fid,
        style: { stroke: on ? "var(--color-faint)" : "var(--color-line)", strokeWidth: 1.25, strokeDasharray: "2 4" },
      });
      continue;
    }
    for (const kind of kinds) {
      edges.push({
        id: `${ADMIN_ID}->${fid}-${kind}`,
        source: ADMIN_ID,
        target: fid,
        style: {
          stroke: on ? STROKE[kind] : quiet ? "var(--color-line)" : "var(--color-cov-some)",
          strokeWidth: on ? 2 : 1.25,
          strokeDasharray: DASH[kind],
          strokeLinecap: "round",
        },
        zIndex: on ? 1 : 0,
      });
    }
  }
  for (const r of graph.responses) {
    if (graph.links.some((l) => l.responseId === r.id) || !vendorIds.has(r.vendor.id)) continue;
    const on = active(r.id, r.vendor.id);
    edges.push({
      id: `${r.id}->${r.vendor.id}`,
      source: r.id,
      target: r.vendor.id,
      style: { stroke: on ? "var(--color-faint)" : "var(--color-line)", strokeWidth: 1.25, strokeDasharray: "2 4" },
    });
  }
  for (const f of placed) {
    for (const v of f.vendorIds) {
      if (!vendorIds.has(v)) continue;
      const on = active(f.id, v);
      edges.push({
        id: `${f.id}->${v}`,
        source: f.id,
        target: v,
        style: {
          stroke: on ? "var(--color-cov-all)" : quiet ? "var(--color-line)" : "var(--color-cov-some)",
          strokeWidth: on ? 1.75 : 1,
          opacity: on || !quiet ? 1 : 0.8,
        },
        zIndex: on ? 1 : 0,
      });
    }
  }

  return { nodes, edges };
}
