import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { SENTIMENT_COLORS, SENTIMENT_DASH } from "./colors";
import { coverage } from "./coverage";
import type { Feature, FeedbackData, Sentiment, SurveyResponse } from "./types";

// Node sizes (must match nodes.tsx).
export const RESPONSE_SIZE = 56;
export const FEATURE_W = 180;
export const FEATURE_H = 52;
export const VENDOR_SIZE = 120;
export const PLACEHOLDER_W = 180;
export const PLACEHOLDER_H = 60;

const SPACING = 160; // horizontal room per response diamond
const PENDING_GAP = 260; // space between vendor groups, where a gray "pending AI" box sits
const GROUP_GAP = 140; // space between vendor groups when real features are shown
const FEATURE_STEP = 115; // features alternate high/low, so they can sit closer than their width
const FEATURE_STAGGER = 55;
const LEFT = 240; // room for the row labels

// Each row's center line and the area its label/divider covers.
const ROWS = {
  responses: { y: 0, height: 200, label: "Survey responses" },
  features: { y: 340, height: 300, label: "Features" },
  vendors: { y: 680, height: 240, label: "Vendors" },
};

export type Highlight = {
  ringId: string | null; // node with the dashed focus ring
  litIds: Set<string> | null; // nodes to keep bright; null = no dimming
  focusVendorId: string | null; // color features from this vendor's point of view
};

const LINE_GRAY = "#30363f";
const LINE_DIM = "#1f252e";
const LINE_ACTIVE = "#8b949e"; // focused lines with no sentiment (e.g. feature -> vendor)

// Turn API data into React Flow nodes and edges, laid out in three rows
// like the "feedback map" slide: responses, features, vendors.
//
// Each vendor's responses sit directly above it. When there are features,
// lines run response -> feature -> vendor, and each feature sits near the
// things it connects to. Without features (AI hasn't run yet), responses
// link straight to their vendor and gray "pending AI" boxes fill the gaps.
export function buildGraph(data: FeedbackData, { ringId, litIds, focusVendorId }: Highlight) {
  const hasFeatures = data.features.length > 0;
  const vendorIds = new Set(data.vendors.map((v) => v.id));
  const featureIds = new Set(data.features.map((f) => f.id));
  const dimmed = (id: string) => litIds !== null && !litIds.has(id);

  // 1. Center x of every response and vendor.
  const x = new Map<string, number>();
  const gapXs: number[] = [];
  let width = 0;

  data.vendors.forEach((v, i) => {
    const mine = data.responses.filter((r) => r.vendorId === v.id);
    const groupWidth = Math.max(mine.length, 1) * SPACING;
    mine.forEach((r, j) => x.set(r.id, width + SPACING * (j + 0.5)));
    x.set(v.id, width + groupWidth / 2);
    width += groupWidth;

    const last = i === data.vendors.length - 1;
    if (!last || (!hasFeatures && data.vendors.length === 1)) {
      const gap = hasFeatures ? GROUP_GAP : PENDING_GAP;
      if (!hasFeatures) gapXs.push(width + gap / 2);
      width += gap;
    }
  });

  // Responses pointing at a vendor we don't know about: show them, unlinked.
  for (const r of data.responses.filter((r) => !vendorIds.has(r.vendorId))) {
    x.set(r.id, width + SPACING / 2);
    width += SPACING;
  }

  // 2. Features: order them by the average x of what they connect to,
  //    then space them evenly. If the row is wider, center the rest under it.
  const mentionedBy = new Map<string, SurveyResponse[]>();
  for (const r of data.responses) {
    for (const m of r.mentions ?? []) {
      mentionedBy.set(m.featureId, [...(mentionedBy.get(m.featureId) ?? []), r]);
    }
  }

  const featureX = new Map<string, number>();
  let sorted: Feature[] = [];
  if (hasFeatures) {
    const avgX = (fid: string, vids: string[]) => {
      const xs = [
        ...(mentionedBy.get(fid) ?? []).map((r) => x.get(r.id)!),
        ...vids.filter((v) => vendorIds.has(v)).map((v) => x.get(v)!),
      ];
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : width / 2;
    };
    sorted = [...data.features].sort((a, b) => avgX(a.id, a.vendorIds) - avgX(b.id, b.vendorIds));
    const rowWidth = (sorted.length - 1) * FEATURE_STEP + FEATURE_W;

    if (rowWidth > width) {
      const shift = (rowWidth - width) / 2;
      for (const [id, v] of x) x.set(id, v + shift);
      width = rowWidth;
    }
    const start = (width - rowWidth) / 2 + FEATURE_W / 2;
    sorted.forEach((f, i) => featureX.set(f.id, start + i * FEATURE_STEP));
  }

  // 3. Nodes.
  const nodes: Node[] = [];

  for (const [key, row] of Object.entries(ROWS)) {
    nodes.push({
      id: `band-${key}`,
      type: "band",
      position: { x: 0, y: row.y - row.height / 2 },
      data: { label: row.label, divider: key !== "responses" },
      style: { width: LEFT + width + 40, height: row.height, pointerEvents: "none" },
      selectable: false,
      zIndex: -1,
    });
  }

  for (const r of data.responses) {
    nodes.push({
      id: r.id,
      type: "response",
      position: { x: LEFT + x.get(r.id)! - RESPONSE_SIZE / 2, y: ROWS.responses.y - RESPONSE_SIZE / 2 },
      data: { group: r.group, selected: r.id === ringId, dimmed: dimmed(r.id) },
    });
  }

  sorted.forEach((f, i) => {
    nodes.push({
      id: f.id,
      type: "feature",
      position: {
        x: LEFT + featureX.get(f.id)! - FEATURE_W / 2,
        y: ROWS.features.y + (i % 2 === 0 ? -FEATURE_STAGGER : FEATURE_STAGGER) - FEATURE_H / 2,
      },
      data: {
        name: f.name,
        coverage: coverage(f, [...vendorIds], focusVendorId),
        selected: f.id === ringId,
        dimmed: dimmed(f.id),
      },
      selectable: false,
      zIndex: i, // later boxes overlap earlier ones cleanly
    });
  });

  gapXs.forEach((gx, i) =>
    nodes.push({
      id: `feature-placeholder-${i}`,
      type: "featurePlaceholder",
      position: { x: LEFT + gx - PLACEHOLDER_W / 2, y: ROWS.features.y - PLACEHOLDER_H / 2 },
      data: {},
      selectable: false,
    }),
  );

  for (const v of data.vendors) {
    nodes.push({
      id: v.id,
      type: "vendor",
      position: { x: LEFT + x.get(v.id)! - VENDOR_SIZE / 2, y: ROWS.vendors.y - VENDOR_SIZE / 2 },
      data: { name: v.name, selected: v.id === ringId, dimmed: dimmed(v.id) },
    });
  }

  // 4. Edges. Gray by default, with the pattern showing like / dislike / want.
  //    When both ends are part of what's selected, the line takes its sentiment tint.
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const link = (source: string, target: string, kind?: Sentiment) => {
    const id = `${source}->${target}`;
    if (seen.has(id)) return;
    seen.add(id);
    const active = litIds !== null && litIds.has(source) && litIds.has(target);
    const color = active ? (kind ? SENTIMENT_COLORS[kind] : LINE_ACTIVE) : litIds !== null ? LINE_DIM : LINE_GRAY;
    edges.push({
      id,
      source,
      target,
      type: "straight",
      style: {
        stroke: color,
        strokeWidth: active ? 2 : 1.25,
        strokeDasharray: kind ? SENTIMENT_DASH[kind] : undefined,
        strokeLinecap: "round",
      },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      zIndex: active ? 1 : 0,
    });
  };

  for (const r of data.responses) {
    if (!vendorIds.has(r.vendorId)) continue;
    const mentions = (r.mentions ?? []).filter((m) => featureIds.has(m.featureId));
    // Without features (or before AI has read this one), link straight to the vendor.
    if (!hasFeatures || mentions.length === 0) link(r.id, r.vendorId);
    else for (const m of mentions) link(r.id, m.featureId, m.kind);
  }

  for (const f of data.features) {
    for (const v of f.vendorIds) if (vendorIds.has(v)) link(f.id, v);
  }

  return { nodes, edges };
}
