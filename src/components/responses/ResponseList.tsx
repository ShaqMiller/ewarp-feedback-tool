import Link from "next/link";
import { api } from "@/lib/api";
import { GROUP_LABELS, type Group } from "@/lib/api/types";
import { cn } from "@/lib/format";
import { FilterChips } from "@/components/ui/FilterChips";
import { ChevronRightIcon } from "@/components/ui/icons";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { ResponseCard } from "./ResponseCard";
import { PAGE_SIZE, responsesHref, type ResponsePageQuery } from "./query";

const GROUPS: Group[] = ["pm", "sponsor", "other"];

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const className = "inline-flex h-[30px] items-center gap-1 rounded-[7px] border border-line bg-surface px-3 text-[12.5px] font-medium";
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(className, "text-faint")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(className, "transition-colors hover:bg-chip")}>
      {children}
    </Link>
  );
}

// Uses GET /projects/:projectId/responses with the page's filters, sort and offset.
export async function ResponseList({ projectId, query }: { projectId: string; query: ResponsePageQuery }) {
  const base = `/projects/${projectId}/responses`;
  const { items, total, facets } = await api.listResponses(projectId, {
    group: query.group,
    vendorId: query.vendor,
    surveyId: query.survey,
    status: query.status,
    q: query.q || undefined,
    sort: query.sort,
    limit: PAGE_SIZE,
    offset: (query.page - 1) * PAGE_SIZE,
  });
  const groupTotal = GROUPS.reduce((n, g) => n + facets.group[g], 0);
  const first = (query.page - 1) * PAGE_SIZE + 1;
  const last = first + items.length - 1;
  const filtered = Boolean(query.group || query.vendor || query.survey || query.status || query.q);

  const chips = [
    { label: "All groups", href: responsesHref(base, query, { group: undefined }), active: !query.group, count: groupTotal },
    ...GROUPS.map((g) => ({
      label: GROUP_LABELS[g],
      href: responsesHref(base, query, { group: g }),
      active: query.group === g,
      count: facets.group[g],
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <FilterChips label="Filter by respondent group" chips={chips} />
        {!query.status && facets.status.pending > 0 && (
          <Link
            href={responsesHref(base, query, { status: "pending" })}
            scroll={false}
            className="text-xs font-medium text-accent hover:underline"
          >
            {facets.status.pending} waiting for AI
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <section className="rounded-[10px] border border-line bg-surface">
          <EmptyState
            title={total > 0 ? "This page is empty" : filtered ? "No responses match these filters" : "No responses yet"}
          >
            {total > 0 ? (
              <Link href={responsesHref(base, query, { page: 1 })} className="font-medium text-accent hover:underline">
                Go to the first page
              </Link>
            ) : filtered ? (
              <Link href={base} className="font-medium text-accent hover:underline">
                Clear all filters
              </Link>
            ) : (
              "Responses appear here as people fill in the survey."
            )}
          </EmptyState>
        </section>
      ) : (
        <>
          <ul className="grid gap-3">
            {items.map((r) => (
              <li key={r.id}>
                <ResponseCard response={r} projectId={projectId} mentions={r.mentions} />
              </li>
            ))}
          </ul>
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-xs text-muted">
            <span className="tabular-nums">
              {first}–{last} of {total}
            </span>
            {total > PAGE_SIZE && (
              <span className="flex gap-2">
                <PageLink href={responsesHref(base, query, { page: query.page - 1 })} disabled={query.page === 1}>
                  <ChevronRightIcon className="size-3.5 rotate-180" />
                  Previous
                </PageLink>
                <PageLink href={responsesHref(base, query, { page: query.page + 1 })} disabled={last >= total}>
                  Next
                  <ChevronRightIcon className="size-3.5" />
                </PageLink>
              </span>
            )}
          </nav>
        </>
      )}
    </div>
  );
}

export function ResponsesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-7 w-80 rounded-full" />
      <Skeleton className="h-44 rounded-[10px]" />
      <Skeleton className="h-44 rounded-[10px]" />
    </div>
  );
}
