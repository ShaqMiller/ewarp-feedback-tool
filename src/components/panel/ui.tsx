import type { Group, Sentiment, SurveyResponse } from "@/lib/types";
import { GROUP_LABELS } from "@/lib/types";
import type { Counts } from "@/lib/selectors";
import { shortDate } from "@/lib/selectors";
import { COVERAGE_COLORS, SENTIMENT_COLORS } from "@/lib/colors";
import type { Coverage } from "@/lib/coverage";
import { GROUP_COLORS } from "../nodes";

export const SENTIMENT: Record<Sentiment, { label: string; color: string }> = {
  like: { label: "Likes", color: SENTIMENT_COLORS.like },
  dislike: { label: "Dislikes", color: SENTIMENT_COLORS.dislike },
  want: { label: "Wants", color: SENTIMENT_COLORS.want },
};

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b949e]">
      {children}
    </div>
  );
}

export function Diamond({ group, size = 10 }: { group: Group; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rotate-45 rounded-[2px]"
      style={{ width: size, height: size, background: GROUP_COLORS[group] }}
    />
  );
}

// Small parallelogram, matching the feature shape on the slide.
export function FeatureShape({ coverage }: { coverage: Coverage }) {
  return (
    <span
      className="inline-block h-3 w-5 shrink-0 -skew-x-12 border-2"
      style={{ borderColor: COVERAGE_COLORS[coverage] }}
    />
  );
}

export function Chevron() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-[#6b7280]" aria-hidden>
      <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function CountPills({ counts }: { counts: Counts }) {
  const kinds = (Object.keys(SENTIMENT) as Sentiment[]).filter((k) => counts[k] > 0);
  if (kinds.length === 0) return <span className="text-xs text-[#6b7280]">No mentions</span>;

  return (
    <span className="flex gap-1.5">
      {kinds.map((k) => (
        <span
          key={k}
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ color: SENTIMENT[k].color, background: `${SENTIMENT[k].color}1f` }}
        >
          {counts[k]} {counts[k] === 1 ? k : `${k}s`}
        </span>
      ))}
    </span>
  );
}

// A clickable card for one response, with a short quote from it.
export function ResponseRow({
  response,
  quote,
  vendorName,
  onClick,
}: {
  response: SurveyResponse;
  quote: string;
  vendorName?: string; // shown when the list mixes vendors
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#1c222c]"
    >
      <span className="mt-1.5">
        <Diamond group={response.group} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-[#e6e8eb]">
          {GROUP_LABELS[response.group]}
          <span className="text-[#6b7280]">
            {" "}
            · {shortDate(response.submittedAt)}
            {vendorName && ` · ${vendorName}`}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-[#8b949e]">“{quote}”</span>
      </span>
      <span className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Chevron />
      </span>
    </button>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-2 text-sm text-[#6b7280]">{children}</p>;
}
