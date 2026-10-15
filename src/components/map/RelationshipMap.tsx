"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Id, ProjectGraph } from "@/lib/api/types";
import { MinusIcon, PlusIcon, ScanIcon } from "@/components/ui/icons";
import { layoutGraph, type Selection } from "./layout";
import { MapDrawer } from "./MapDrawer";
import { nodeTypes } from "./nodes";

type Props = { graph: ProjectGraph; projectId: string };

// The selected node lives in the URL (?focus=ftr_5) so other pages can link to it.
function selectionFor(graph: ProjectGraph, id: Id | null): Selection {
  if (!id) return null;
  if (graph.responses.some((r) => r.id === id)) return { kind: "response", id };
  if (graph.features.some((f) => f.id === id)) return { kind: "feature", id };
  if (graph.vendors.some((v) => v.id === id)) return { kind: "vendor", id };
  return null;
}

function Legend() {
  const line = (label: string, className: string) => (
    <span className="flex items-center gap-1.5">
      <span className={`h-0 w-4 border-t-2 ${className}`} />
      {label}
    </span>
  );
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-lg border border-line bg-surface/95 px-3 py-2 text-[11px] text-muted shadow-sm"
    >
      {line("Like", "border-like")}
      {line("Dislike", "border-dashed border-dislike")}
      {line("Want", "border-dotted border-want")}
      {line("Offered by", "border-cov-some")}
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-gap" />
        Gap
      </span>
    </div>
  );
}

function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const button = "grid size-8 place-items-center text-muted transition-colors hover:bg-chip hover:text-ink";
  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <button type="button" onClick={() => zoomIn({ duration: 200 })} aria-label="Zoom in" className={button}>
        <PlusIcon className="size-4" />
      </button>
      <button type="button" onClick={() => zoomOut({ duration: 200 })} aria-label="Zoom out" className={`${button} border-t border-line`}>
        <MinusIcon className="size-4" />
      </button>
      <button type="button" onClick={() => fitView({ duration: 300, padding: 0.12 })} aria-label="Fit map to screen" className={`${button} border-t border-line`}>
        <ScanIcon className="size-4" />
      </button>
    </div>
  );
}

function MapCanvas({ graph, projectId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const selection = useMemo(() => selectionFor(graph, focusId), [graph, focusId]);
  const { nodes, edges } = useMemo(() => layoutGraph(graph, selection), [graph, selection]);
  const { getNode, getZoom, setCenter } = useReactFlow();

  const pan = (id: Id) => {
    const node = getNode(id);
    if (!node) return;
    const x = node.position.x + (node.measured?.width ?? 0) / 2;
    const y = node.position.y + (node.measured?.height ?? 0) / 2;
    setCenter(x, y, { zoom: Math.max(getZoom(), 0.9), duration: 400 });
  };

  // Shallow URL update: no server round trip, but useSearchParams sees the change.
  const select = (next: Selection) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("focus", next.id);
    else params.delete("focus");
    window.history.replaceState(null, "", params.size ? `${pathname}?${params}` : pathname);
    if (next) pan(next.id);
  };

  const onNodeClick: NodeMouseHandler = (_, node) => {
    if (node.type === "response" || node.type === "feature" || node.type === "vendor") {
      select({ kind: node.type, id: node.id });
    }
  };

  const drawer = <MapDrawer graph={graph} selection={selection} projectId={projectId} onSelect={select} />;

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[10px] border border-line bg-surface">
      <div className="relative min-w-0 flex-1 bg-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => selection && select(null)}
          onInit={() => selection && setTimeout(() => pan(selection.id), 60)}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.08, minZoom: 0.62 }}
          minZoom={0.2}
          maxZoom={1.75}
          colorMode="light"
          style={{ background: "transparent" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-cov-some)" />
        </ReactFlow>
        <ZoomControls />
        <Legend />
      </div>

      {/* Desktop: a side panel that always explains the current selection. */}
      <aside aria-label="Details" className="hidden w-80 shrink-0 overflow-y-auto border-l border-line p-4 lg:block">
        {drawer}
      </aside>

      {/* Phones and tablets: a bottom sheet, only while something is selected. */}
      {selection && (
        <aside
          aria-label="Details"
          className="absolute inset-x-0 bottom-0 z-20 max-h-[65%] overflow-y-auto rounded-t-xl border-t border-line bg-surface p-4 shadow-[0_-12px_32px_-16px_rgba(20,24,33,0.3)] lg:hidden"
        >
          {drawer}
        </aside>
      )}
    </div>
  );
}

export function RelationshipMap(props: Props) {
  return (
    <ReactFlowProvider>
      <MapCanvas {...props} />
    </ReactFlowProvider>
  );
}
