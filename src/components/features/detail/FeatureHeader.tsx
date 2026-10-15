import type { Feature, SentimentCounts } from "@/lib/api/types";
import { Pill } from "@/components/ui/primitives";

function CoveragePill({ offered, total }: { offered: number; total: number }) {
  if (offered === 0) return <Pill tone="gap">No vendor offers this</Pill>;
  return (
    <Pill>
      <span aria-hidden="true" className="inline-flex gap-[3px]">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`size-[7px] rounded-full border-[1.5px] ${i < offered ? "border-cov-all bg-cov-all" : "border-cov-some"}`}
          />
        ))}
      </span>
      {offered === total ? `Offered by all ${total} vendors` : `Offered by ${offered} of ${total} vendors`}
    </Pill>
  );
}

function FeedbackPill({ sentiment }: { sentiment: SentimentCounts }) {
  const kinds = (["like", "dislike", "want"] as const).filter((k) => sentiment[k] > 0);
  if (kinds.length === 0) return null;
  if (kinds.length > 1) return <Pill tone={sentiment.dislike > 0 ? "dislike" : "neutral"}>Mixed feedback</Pill>;
  const only = kinds[0];
  return <Pill tone={only}>{only === "like" ? "Liked" : only === "dislike" ? "Disliked" : "Requested"}</Pill>;
}

export function FeatureHeader({ feature, vendorCount }: { feature: Feature; vendorCount: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 className="text-[22px] font-semibold tracking-[-0.015em]">{feature.name}</h1>
      <CoveragePill offered={feature.vendorIds.length} total={vendorCount} />
      <FeedbackPill sentiment={feature.sentiment} />
    </div>
  );
}
