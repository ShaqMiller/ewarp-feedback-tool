import Link from "next/link";
import { GROUP_LABELS, type ResponseMention, type Sentiment, type SurveyResponse } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/format";
import { Pill, Skeleton } from "@/components/ui/primitives";

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

const MENTION_DOT: Record<Sentiment, string> = { like: "bg-like", dislike: "bg-dislike", want: "bg-want" };

// One survey response with all three answers.
//   highlight: answers that mention whatever the page is about (e.g. the feature being viewed)
//   mentions:  features AI linked to the response, listed under the answers
//   showVendor: false on a vendor's own page, where the vendor is already known
export function ResponseCard({
  response,
  projectId,
  highlight = [],
  mentions,
  showVendor = true,
}: {
  response: SurveyResponse;
  projectId: string;
  highlight?: Sentiment[];
  mentions?: ResponseMention[];
  showVendor?: boolean;
}) {
  return (
    <article className="rounded-[10px] border border-line bg-surface p-4">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
        <span className="font-semibold text-ink">{GROUP_LABELS[response.group]}</span>
        <span aria-hidden="true">·</span>
        {showVendor && (
          <>
            <Link href={`/projects/${projectId}/vendors/${response.vendor.id}`} className="rounded hover:text-ink hover:underline">
              {response.vendor.name}
            </Link>
            <span aria-hidden="true">·</span>
          </>
        )}
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
      {mentions && (
        <footer className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-xs">
          <span className="mr-1 text-muted">{response.analyzed ? "Linked features" : "Waiting for AI to read this response"}</span>
          {mentions.map((m) => (
            <Link
              key={`${m.feature.id}-${m.kind}`}
              href={`/projects/${projectId}/features/${m.feature.id}`}
              className="inline-flex h-6 items-center gap-1.5 rounded-full bg-chip px-2.5 font-medium text-ink transition-colors hover:bg-line"
            >
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", MENTION_DOT[m.kind])} />
              {m.feature.name}
              <span className="sr-only">({KIND_LABEL[m.kind].toLowerCase()})</span>
            </Link>
          ))}
        </footer>
      )}
    </article>
  );
}

export function ResponseListSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-36 rounded-[10px]" />
      <Skeleton className="h-36 rounded-[10px]" />
    </div>
  );
}
