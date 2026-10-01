"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FEATURE_H,
  FEATURE_W,
  PLACEHOLDER_H,
  PLACEHOLDER_W,
  RESPONSE_SIZE,
  VENDOR_SIZE,
} from "@/lib/buildGraph";
import { COVERAGE_COLORS } from "@/lib/colors";
import type { Coverage } from "@/lib/coverage";
import type { Group } from "@/lib/types";

export const GROUP_COLORS: Record<Group, string> = {
  pm: "#3b82f6",
  sponsor: "#f0b429",
  other: "#a78bfa",
};

// Handles are needed for edges to attach, but we don't show them.
const hidden = { opacity: 0, pointerEvents: "none" } as const;

// A row label on the left, with a thin divider above every row but the first.
function BandNode({ data }: NodeProps) {
  return (
    <div className={`pointer-events-none h-full w-full ${data.divider ? "border-t border-[#1f252e]" : ""}`}>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xl font-semibold text-[#c9d1d9]">
        {data.label as string}
      </span>
    </div>
  );
}

function ResponseNode({ data }: NodeProps) {
  const color = GROUP_COLORS[data.group as Group];
  return (
    <div
      className="relative flex cursor-pointer items-center justify-center transition-opacity"
      style={{ width: RESPONSE_SIZE, height: RESPONSE_SIZE, opacity: data.dimmed ? 0.25 : 1 }}
    >
      {Boolean(data.selected) && (
        <div className="absolute -inset-3 rounded-full border-2 border-dashed border-[#3b82f6]" />
      )}
      <div
        className="h-10 w-10 rotate-45 rounded-[4px] transition-transform hover:scale-110"
        style={{ background: color }}
      />
      <Handle type="source" position={Position.Bottom} style={hidden} />
    </div>
  );
}

// Colored by coverage: green = has it, sky blue = not everyone has it, red = nobody has it.
function FeatureNode({ data }: NodeProps) {
  const color = COVERAGE_COLORS[data.coverage as Coverage];
  return (
    <div
      className="relative flex -skew-x-12 cursor-pointer items-center justify-center border-2 px-4 transition-[opacity,background-color,border-color] hover:brightness-125"
      style={{
        width: FEATURE_W,
        height: FEATURE_H,
        borderColor: color,
        background: `${color}1a`, // faint tint of its own color
        opacity: data.dimmed ? 0.25 : 1,
        boxShadow: data.selected ? `0 0 0 3px #0a0d12, 0 0 0 5px #3b82f6` : undefined,
      }}
    >
      <span className="skew-x-12 truncate text-sm font-semibold transition-colors" style={{ color }}>
        {data.name as string}
      </span>
      <Handle type="target" position={Position.Top} style={hidden} />
      <Handle type="source" position={Position.Bottom} style={hidden} />
    </div>
  );
}

// Gray stand-in until AI pulls features out of the responses.
function FeaturePlaceholderNode() {
  return (
    <div
      className="flex -skew-x-12 items-center justify-center border-2 border-dashed border-[#4b5563] bg-[#161b22]"
      style={{ width: PLACEHOLDER_W, height: PLACEHOLDER_H }}
    >
      <span className="skew-x-12 text-base text-[#8b949e]">Pending AI</span>
    </div>
  );
}

function VendorNode({ data }: NodeProps) {
  return (
    <div
      className="relative flex cursor-pointer items-center justify-center rounded-full border-2 border-[#c9d1d9] bg-[#161b22] text-center text-base font-semibold text-[#e6e8eb] transition-[background-color,opacity] hover:bg-[#222935]"
      style={{ width: VENDOR_SIZE, height: VENDOR_SIZE, opacity: data.dimmed ? 0.35 : 1 }}
    >
      {Boolean(data.selected) && (
        <div className="absolute -inset-3 rounded-full border-2 border-dashed border-[#3b82f6]" />
      )}
      {data.name as string}
      <Handle type="target" position={Position.Top} style={hidden} />
    </div>
  );
}

export const nodeTypes = {
  band: BandNode,
  response: ResponseNode,
  feature: FeatureNode,
  featurePlaceholder: FeaturePlaceholderNode,
  vendor: VendorNode,
};
