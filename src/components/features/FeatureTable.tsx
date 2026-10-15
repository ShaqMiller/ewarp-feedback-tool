import Link from "next/link";
import { api } from "@/lib/api";
import type { FeatureView, SentimentCounts } from "@/lib/api/types";
import { cn } from "@/lib/format";
import { ChevronRightIcon } from "@/components/ui/icons";
import { CoverageIndicator, SentimentBar } from "@/components/ui/feedback";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { FEATURE_VIEWS, featuresHref, type FeaturePageQuery } from "./query";

const EMPTY_VIEW: Record<FeatureView, { title: string; body: string }> = {
  all: { title: "No features yet", body: "Features appear here once AI reads the first survey responses." },
  requested: { title: "No requests yet", body: "Features show up here when someone says they want them." },
  gap: { title: "No gaps", body: "Every feature is offered by at least one vendor." },
  pain: { title: "No pain points", body: "Nobody has said they dislike a feature yet." },
};

function FeedbackSummary({ counts }: { counts: SentimentCounts }) {
  const parts = [
    { n: counts.like, label: "like", tone: "text-like" },
    { n: counts.dislike, label: "dislike", tone: "text-dislike" },
    { n: counts.want, label: "want", tone: "text-want" },
  ].filter((p) => p.n > 0);
  if (parts.length === 0) return <span className="text-faint">No feedback</span>;
  return (
    <span className="whitespace-nowrap">
      {parts.map((p, i) => (
        <span key={p.label}>
          {i > 0 && <span className="text-faint"> · </span>}
          <b className={cn("font-semibold", p.tone)}>{p.n}</b> {p.n === 1 ? p.label : `${p.label}s`}
        </span>
      ))}
    </span>
  );
}

function ViewTabs({ base, query, facets }: { base: string; query: FeaturePageQuery; facets?: Record<FeatureView, number> }) {
  return (
    <nav aria-label="Filter features" className="-mb-px flex gap-5 overflow-x-auto px-4">
      {FEATURE_VIEWS.map((v) => {
        const active = v.value === query.view;
        return (
          <Link
            key={v.value}
            href={featuresHref(base, query, { view: v.value })}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-[13px] font-medium transition-colors",
              active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {v.label}
            {facets && (
              <span className={cn("text-xs tabular-nums", v.value === "gap" && facets.gap > 0 ? "text-gap" : "text-faint")}>
                {facets[v.value]}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// Uses GET /projects/:projectId/features?view&q&sort and GET /projects/:projectId/vendors?sort=name
export async function FeatureTable({ projectId, query }: { projectId: string; query: FeaturePageQuery }) {
  const base = `/projects/${projectId}/features`;
  const [{ items, facets }, { items: vendors }] = await Promise.all([
    api.listFeatures(projectId, { view: query.view, q: query.q || undefined, sort: query.sort }),
    api.listVendors(projectId, { sort: "name" }),
  ]);
  const max = Math.max(...items.map((f) => f.mentions));

  let empty: React.ReactNode = null;
  if (items.length === 0) {
    empty = query.q ? (
      <EmptyState title={`No features match “${query.q}”`}>
        <Link href={featuresHref(base, query, { q: "" })} scroll={false} className="font-medium text-accent hover:underline">
          Clear search
        </Link>
      </EmptyState>
    ) : (
      <EmptyState title={EMPTY_VIEW[query.view].title}>{EMPTY_VIEW[query.view].body}</EmptyState>
    );
  }

  return (
    <section className="min-w-0 rounded-[10px] border border-line bg-surface">
      <div className="border-b border-line">
        <ViewTabs base={base} query={query} facets={facets} />
      </div>
      {empty ?? (
        <table className="w-full text-[13px]">
          <caption className="sr-only">
            {FEATURE_VIEWS.find((v) => v.value === query.view)!.label} features
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-2.5 pr-3 pl-4 font-medium">Feature</th>
              <th scope="col" className="hidden w-[38%] px-3 py-2.5 font-medium md:table-cell">Feedback</th>
              <th scope="col" className="hidden w-24 px-3 py-2.5 text-right font-medium sm:table-cell">Mentions</th>
              <th scope="col" className="w-32 px-3 py-2.5 font-medium sm:w-40">Vendor coverage</th>
              <th scope="col" className="w-8 pr-3"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id} className="relative border-b border-line transition-colors last:border-b-0 hover:bg-sidebar">
                <td className="py-3 pr-3 pl-4">
                  <Link
                    href={`${base}/${f.id}`}
                    className="font-medium after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:outline-2 focus-visible:after:outline-accent"
                  >
                    {f.name}
                  </Link>
                  <SentimentBar counts={f.sentiment} max={max} className="mt-2 max-w-40 md:hidden" />
                </td>
                <td className="hidden px-3 py-3 md:table-cell">
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <SentimentBar counts={f.sentiment} max={max} className="w-28 shrink-0" />
                    <FeedbackSummary counts={f.sentiment} />
                  </div>
                </td>
                <td className="hidden px-3 py-3 text-right font-semibold tabular-nums sm:table-cell">{f.mentions}</td>
                <td className="px-3 py-3">
                  <CoverageIndicator coverage={f.coverage} offeredBy={f.vendorIds} vendors={vendors} />
                </td>
                <td className="pr-3 text-faint">
                  <ChevronRightIcon className="size-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function FeatureTableSkeleton({ projectId, query }: { projectId: string; query: FeaturePageQuery }) {
  return (
    <section className="min-w-0 rounded-[10px] border border-line bg-surface">
      <div className="border-b border-line">
        <ViewTabs base={`/projects/${projectId}/features`} query={query} />
      </div>
      <div className="grid gap-5 px-4 py-5">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
    </section>
  );
}
