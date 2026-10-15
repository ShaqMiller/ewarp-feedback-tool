import type { Coverage, Id, SentimentCounts } from "@/lib/api/types";
import { cn } from "@/lib/format";
import { Pill } from "./primitives";

// Likes, dislikes and wants as one bar. Segment widths are relative to `max` mentions,
// so bars in the same list compare at a glance.
export function SentimentBar({ counts, max, className }: { counts: SentimentCounts; max: number; className?: string }) {
  const width = (n: number) => `${(n / Math.max(max, 1)) * 100}%`;
  return (
    <span
      role="img"
      aria-label={`${counts.like} likes, ${counts.dislike} dislikes, ${counts.want} wants`}
      className={cn("flex h-2 gap-0.5", className)}
    >
      {counts.like > 0 && <span className="rounded-[3px] bg-like" style={{ width: width(counts.like) }} />}
      {counts.dislike > 0 && <span className="rounded-[3px] bg-dislike" style={{ width: width(counts.dislike) }} />}
      {counts.want > 0 && <span className="rounded-[3px] bg-want" style={{ width: width(counts.want) }} />}
    </span>
  );
}

// Small amber dot marking a feature no vendor offers.
export function GapDot() {
  return (
    <>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-gap" />
      <span className="sr-only">(no vendor offers this)</span>
    </>
  );
}

// One dot per project vendor, filled when that vendor offers the feature.
export function CoverageIndicator({
  coverage,
  offeredBy,
  vendors,
}: {
  coverage: Coverage;
  offeredBy: Id[];
  vendors: { id: Id; name: string }[];
}) {
  if (coverage === "none") return <Pill tone="gap">Gap</Pill>;
  const offering = vendors.filter((v) => offeredBy.includes(v.id));
  return (
    <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap text-muted">
      <span aria-hidden="true" className="inline-flex gap-[3px]">
        {vendors.map((v) => (
          <span
            key={v.id}
            title={`${v.name}: ${offeredBy.includes(v.id) ? "offers it" : "doesn't offer it"}`}
            className={cn(
              "size-2 rounded-full border-[1.5px]",
              offeredBy.includes(v.id) ? "border-cov-all bg-cov-all" : "border-cov-some",
            )}
          />
        ))}
      </span>
      <span className="sr-only">Offered by {offering.map((v) => v.name).join(", ")}.</span>
      <span aria-hidden="true">{coverage === "all" ? "All vendors" : `${offering.length} of ${vendors.length}`}</span>
    </span>
  );
}
