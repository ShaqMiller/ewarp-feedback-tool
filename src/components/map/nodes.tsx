"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Group, ProjectGraph, SurveyResponse } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/format";
import { SIZES } from "./layout";

type NodeState = { selected: boolean; dimmed: boolean };

const GROUP_SHORT: Record<Group, string> = { pm: "PM", sponsor: "Sponsor", other: "Other" };
const GROUP_DOT: Record<Group, string> = { pm: "bg-group-pm", sponsor: "bg-group-sponsor", other: "bg-group-other" };

// Edges need handles to attach to, but they aren't interactive here.
const hidden = { opacity: 0, pointerEvents: "none" as const, border: 0, minWidth: 0, minHeight: 0 };

const stateClass = ({ selected, dimmed }: NodeState) =>
  cn(
    "transition-[opacity,box-shadow] duration-200",
    dimmed && "opacity-30",
    selected && "ring-2 ring-accent ring-offset-2 ring-offset-canvas",
  );

// A row label at the left, with a divider above every row but the first.
function BandNode({ data }: NodeProps) {
  const { label, divider } = data as { label: string; divider: boolean };
  return (
    <div className={cn("pointer-events-none relative h-full w-full", divider && "border-t border-line")}>
      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[10.5px] font-semibold tracking-[0.08em] text-faint uppercase">
        {label}
      </span>
    </div>
  );
}

function ResponseNode({ data }: NodeProps) {
  const { response, ...state } = data as { response: SurveyResponse } & NodeState;
  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col justify-center rounded-lg border bg-surface px-2.5 hover:border-cov-some",
        response.analyzed ? "border-line" : "border-dashed border-cov-some",
        stateClass(state),
      )}
      style={{ width: SIZES.response.w, height: SIZES.response.h }}
    >
      <span className="flex items-center gap-1.5 text-[11px] leading-tight font-semibold">
        <span className={cn("size-1.5 shrink-0 rounded-full", GROUP_DOT[response.group])} />
        {GROUP_SHORT[response.group]}
      </span>
      <span className="text-[10.5px] leading-tight text-muted">
        {response.analyzed ? formatDate(response.submittedAt) : "Pending AI"}
      </span>
      <Handle type="source" position={Position.Bottom} style={hidden} />
    </div>
  );
}

function FeatureNode({ data }: NodeProps) {
  const { feature, ...state } = data as { feature: ProjectGraph["features"][number] } & NodeState;
  const gap = feature.coverage === "none";
  return (
    <div
      className={cn(
        "flex cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-[12px] font-medium",
        gap ? "border-gap/50 bg-gap-soft text-ink hover:border-gap" : "border-line bg-surface hover:border-cov-some",
        stateClass(state),
      )}
      style={{ width: SIZES.feature.w, height: SIZES.feature.h }}
    >
      {gap && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-gap" />}
      <span className="truncate">{feature.name}</span>
      <Handle type="target" position={Position.Top} style={hidden} />
      <Handle type="source" position={Position.Bottom} style={hidden} />
    </div>
  );
}

function VendorNode({ data }: NodeProps) {
  const { vendor, responseCount, ...state } = data as {
    vendor: { id: string; name: string };
    responseCount: number;
  } & NodeState;
  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-[1.5px] border-cov-some bg-surface hover:border-cov-all",
        stateClass(state),
      )}
      style={{ width: SIZES.vendor.w, height: SIZES.vendor.h }}
    >
      <span className="max-w-full truncate px-2 text-[13px] font-semibold">{vendor.name}</span>
      <span className="text-[10.5px] text-muted">
        {responseCount} {responseCount === 1 ? "response" : "responses"}
      </span>
      <Handle type="target" position={Position.Top} style={hidden} />
    </div>
  );
}

export const nodeTypes = { band: BandNode, response: ResponseNode, feature: FeatureNode, vendor: VendorNode };
