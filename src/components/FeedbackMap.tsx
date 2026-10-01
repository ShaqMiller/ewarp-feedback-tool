"use client";

import { useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useFeedbackMap, type DataSource } from "@/hooks/useFeedbackMap";
import { buildGraph, type Highlight } from "@/lib/buildGraph";
import { featureMentions } from "@/lib/selectors";
import type { FeedbackData } from "@/lib/types";
import { Legend } from "./Legend";
import { nodeTypes } from "./nodes";
import { DetailPanel, type PanelView, type VendorTab } from "./panel/DetailPanel";

// Which node gets the focus ring, and which nodes stay bright, for the open panel view.
// Lines light up when both of their ends are bright.
function highlightFor(data: FeedbackData, view: PanelView | null): Highlight {
  const focusVendorId = focusVendorFor(data, view);
  return { ...litFor(data, view), focusVendorId };
}

// The vendor whose point of view colors the features, if any.
function focusVendorFor(data: FeedbackData, view: PanelView | null): string | null {
  if (!view) return null;
  if (view.kind === "vendor") return view.id;
  if (view.kind === "feature") return view.vendorId;
  return data.responses.find((r) => r.id === view.id)?.vendorId ?? null;
}

function litFor(data: FeedbackData, view: PanelView | null): Omit<Highlight, "focusVendorId"> {
  if (!view) return { ringId: null, litIds: null };
  const offeredBy = (fid: string) => data.features.find((f) => f.id === fid)?.vendorIds ?? [];

  if (view.kind === "response") {
    const r = data.responses.find((r) => r.id === view.id);
    const fids = (r?.mentions ?? []).map((m) => m.featureId);
    const lit = [view.id, r?.vendorId ?? "", ...fids, ...fids.flatMap(offeredBy)];
    return { ringId: view.id, litIds: new Set(lit) };
  }

  if (view.kind === "vendor") {
    const mine = data.responses.filter((r) => r.vendorId === view.id);
    const mentioned = mine.flatMap((r) => (r.mentions ?? []).map((m) => m.featureId));
    const offered = data.features.filter((f) => f.vendorIds.includes(view.id)).map((f) => f.id);
    const lit = [view.id, ...mine.map((r) => r.id), ...mentioned, ...offered];
    return { ringId: view.id, litIds: new Set(lit) };
  }

  // Feature: from a vendor panel, just that vendor; from the map, every vendor offering it.
  const grouped = featureMentions(data, view.id, view.vendorId);
  const rids = [...grouped.like, ...grouped.dislike, ...grouped.want].map((r) => r.id);
  const vids = view.vendorId ? [view.vendorId] : offeredBy(view.id);
  return { ringId: view.id, litIds: new Set([view.id, ...vids, ...rids]) };
}

// useReactFlow only works inside a ReactFlowProvider, so wrap the map in one.
export function FeedbackMap({ source }: { source: DataSource }) {
  return (
    <ReactFlowProvider>
      <FeedbackMapInner source={source} />
    </ReactFlowProvider>
  );
}

function FeedbackMapInner({ source }: { source: DataSource }) {
  const { data, loading, error } = useFeedbackMap(source);
  // Panel history: the last entry is what's showing, earlier ones are for Back.
  const [stack, setStack] = useState<PanelView[]>([]);
  const { setCenter, getZoom, getNode } = useReactFlow();

  const view = stack.at(-1) ?? null;
  const previous = stack.at(-2) ?? null;

  const highlight = useMemo(() => (data ? highlightFor(data, view) : null), [data, view]);
  const graph = useMemo(
    () => (data && highlight ? buildGraph(data, highlight) : { nodes: [], edges: [] }),
    [data, highlight],
  );
  const focusVendorName = data?.vendors.find((v) => v.id === highlight?.focusVendorId)?.name ?? null;

  // Slide a node to the middle of the view, keeping the current zoom.
  const focus = (id: string) => {
    const node = getNode(id);
    if (!node) return;
    const x = node.position.x + (node.measured?.width ?? 0) / 2;
    const y = node.position.y + (node.measured?.height ?? 0) / 2;
    setCenter(x, y, { zoom: getZoom(), duration: 500 });
  };

  // Clicking the map starts a fresh panel history.
  const onNodeClick: NodeMouseHandler = (_, node) => {
    if (node.type === "response") setStack([{ kind: "response", id: node.id }]);
    else if (node.type === "vendor") setStack([{ kind: "vendor", id: node.id, tab: "features" }]);
    else if (node.type === "feature") setStack([{ kind: "feature", id: node.id, vendorId: null }]);
    else return;
    focus(node.id);
  };

  // Clicking inside the panel adds to the history so Back can return.
  const open = (next: PanelView) => {
    setStack((s) => [...s, next]);
    focus(next.id);
  };

  const back = () => setStack((s) => s.slice(0, -1));

  const setTab = (tab: VendorTab) =>
    setStack((s) => s.map((v, i) => (i === s.length - 1 && v.kind === "vendor" ? { ...v, tab } : v)));

  if (loading) return <p className="p-10 text-[#8b949e]">Loading feedback…</p>;
  if (error) {
    return (
      <div className="flex min-h-[560px] flex-1 items-center justify-center rounded-2xl border border-dashed border-[#262d38]">
        <div className="max-w-md text-center">
          <p className="font-semibold text-[#e6e8eb]">Couldn&apos;t load {source} data</p>
          <p className="mt-2 text-sm text-[#8b949e]">{error}</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex h-[calc(100vh-16rem)] min-h-[560px] gap-6">
        <div className="h-full flex-1 overflow-hidden rounded-2xl">
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={() => setStack([])}
            nodesDraggable={false}
            nodesConnectable={false}
            colorMode="dark"
            fitView
            minZoom={0.2}
            style={{ background: "transparent" }}
          />
        </div>
        <DetailPanel
          data={data}
          view={view}
          previous={previous}
          onOpen={open}
          onBack={back}
          onTab={setTab}
        />
      </div>

      <Legend hasFeatures={data.features.length > 0} focusVendorName={focusVendorName} />
    </div>
  );
}
