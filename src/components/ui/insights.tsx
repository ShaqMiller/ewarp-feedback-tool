import type { AiSummary, Sentiment, SentimentCounts } from "@/lib/api/types";
import { cn, plural } from "@/lib/format";
import { CardMeta } from "./Card";
import { SparkleIcon } from "./icons";

// An AI-written summary card. `subject` names what's summarized, for the empty message.
export function AiSummaryCard({ summary, subject }: { summary: AiSummary; subject: string }) {
  return (
    <section className="min-w-0 rounded-[10px] border border-line bg-surface p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[13.5px] font-semibold">
          <SparkleIcon className="size-[15px] text-accent" />
          Summary
        </h2>
        {summary.text && <CardMeta>From {plural(summary.basedOn, "response")}</CardMeta>}
      </header>
      {summary.text ? (
        <p className="text-[14px] leading-relaxed">{summary.text}</p>
      ) : (
        <p className="text-[13px] text-muted">
          AI hasn&apos;t summarized this {subject} yet. A summary appears once it has read the related responses.
        </p>
      )}
    </section>
  );
}

const KINDS: Sentiment[] = ["like", "dislike", "want"];
const TILE_LABEL: Record<Sentiment, string> = { like: "Likes", dislike: "Dislikes", want: "Wants" };
const TILE_TONE: Record<Sentiment, string> = {
  like: "bg-like-soft text-like",
  dislike: "bg-dislike-soft text-dislike",
  want: "bg-want-soft text-want",
};

// Three tiles counting likes, dislikes and wants. Zero counts stay neutral.
export function SentimentTiles({ counts }: { counts: SentimentCounts }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {KINDS.map((k) => (
        <div key={k} className={cn("rounded-lg px-3 py-2.5", counts[k] > 0 ? TILE_TONE[k] : "bg-chip text-faint")}>
          <div className="text-xs">{TILE_LABEL[k]}</div>
          <div className="text-xl font-semibold tabular-nums">{counts[k]}</div>
        </div>
      ))}
    </div>
  );
}
