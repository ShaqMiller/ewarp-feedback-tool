import Link from "next/link";
import { GROUP_LABELS, type Sentiment, type SurveyResponse } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/format";
import { Pill } from "@/components/ui/primitives";

export const KIND_LABEL: Record<Sentiment, string> = { like: "Like", dislike: "Dislike", want: "Want" };
export const KIND_FIELD: Record<Sentiment, "likes" | "dislikes" | "wants"> = {
  like: "likes",
  dislike: "dislikes",
  want: "wants",
};
const FIELD_LABEL = { likes: "Likes", dislikes: "Dislikes", wants: "Wants" };
const KIND_HIGHLIGHT: Record<Sentiment, string> = {
  like: "bg-like-soft",
  dislike: "bg-dislike-soft",
  want: "bg-want-soft",
};

// One survey response with all three answers. `highlight` marks the answers that mention
// whatever the page is about (e.g. the feature being viewed).
export function ResponseCard({
  response,
  projectId,
  highlight = [],
}: {
  response: SurveyResponse;
  projectId: string;
  highlight?: Sentiment[];
}) {
  return (
    <article className="rounded-[10px] border border-line bg-surface p-4">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
        <span className="font-semibold text-ink">{GROUP_LABELS[response.group]}</span>
        <span aria-hidden="true">·</span>
        <Link href={`/projects/${projectId}/vendors/${response.vendor.id}`} className="rounded hover:text-ink hover:underline">
          {response.vendor.name}
        </Link>
        <span aria-hidden="true">·</span>
        <time dateTime={response.submittedAt}>{formatDate(response.submittedAt)}</time>
        {highlight.length > 0 && (
          <span className="flex gap-1.5 sm:ml-auto">
            {highlight.map((k) => (
              <Pill key={k} tone={k}>
                {KIND_LABEL[k]}
              </Pill>
            ))}
          </span>
        )}
      </header>
      <dl className="mt-3 grid gap-1.5 text-[13px]">
        {(["likes", "dislikes", "wants"] as const).map((field) => {
          const kind = (Object.keys(KIND_FIELD) as Sentiment[]).find((k) => KIND_FIELD[k] === field)!;
          const marked = highlight.includes(kind);
          return (
            <div
              key={field}
              className={cn(
                "grid gap-x-3 rounded-md px-2 py-1.5 sm:grid-cols-[64px_1fr]",
                marked ? KIND_HIGHLIGHT[kind] : undefined,
              )}
            >
              <dt className="text-xs font-medium text-muted sm:pt-px">{FIELD_LABEL[field]}</dt>
              <dd className={marked ? "text-ink" : "text-muted"}>{response[field] || "—"}</dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
