import Link from "next/link";
import { api } from "@/lib/api";
import { plural } from "@/lib/format";
import { ChevronRightIcon } from "@/components/ui/icons";
import { SentimentBar } from "@/components/ui/feedback";
import { EmptyState, Pill, Skeleton } from "@/components/ui/primitives";

// Uses GET /projects/:projectId/vendors?sort=fit
export async function VendorTable({ projectId, featureCount }: { projectId: string; featureCount: number }) {
  const { items } = await api.listVendors(projectId, { sort: "fit" });
  const base = `/projects/${projectId}/vendors`;
  const maxFeedback = Math.max(...items.map((v) => v.sentiment.like + v.sentiment.dislike + v.sentiment.want));

  if (items.length === 0) {
    return (
      <section className="rounded-[10px] border border-line bg-surface">
        <EmptyState title="No vendors yet">Vendors appear here once they are added to this project.</EmptyState>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-[10px] border border-line bg-surface">
      <table className="w-full text-[13px]">
        <caption className="sr-only">Vendors ranked by how many requests they meet</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th scope="col" className="py-2.5 pr-3 pl-4 font-medium">Vendor</th>
            <th scope="col" className="w-[30%] px-3 py-2.5 font-medium">Requests met</th>
            <th scope="col" className="hidden px-3 py-2.5 font-medium md:table-cell">Features offered</th>
            <th scope="col" className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">Responses</th>
            <th scope="col" className="hidden w-[22%] px-3 py-2.5 font-medium lg:table-cell">Users&apos; feedback</th>
            <th scope="col" className="w-8 pr-3"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => {
            const fit = v.requestsTotal > 0 ? v.requestsMet / v.requestsTotal : 0;
            return (
              <tr key={v.id} className="relative border-b border-line transition-colors last:border-b-0 hover:bg-sidebar">
                <td className="py-3.5 pr-3 pl-4">
                  <Link
                    href={`${base}/${v.id}`}
                    className="font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:outline-2 focus-visible:after:outline-accent"
                  >
                    {v.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted lg:hidden">{plural(v.responseCount, "response")}</p>
                </td>
                <td className="px-3 py-3.5">
                  {v.requestsTotal > 0 ? (
                    <div className="flex items-center gap-3">
                      <div
                        role="img"
                        aria-label={`${v.requestsMet} of ${v.requestsTotal} requests met`}
                        className="h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-chip"
                      >
                        <div className="h-full rounded-full bg-accent" style={{ width: `${fit * 100}%` }} />
                      </div>
                      <span aria-hidden="true" className="whitespace-nowrap font-semibold tabular-nums">
                        {v.requestsMet} <span className="font-normal text-muted">of {v.requestsTotal}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-faint">No requests yet</span>
                  )}
                </td>
                <td className="hidden px-3 py-3.5 md:table-cell">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="tabular-nums">
                      {v.featureCount}
                      {featureCount > 0 && <span className="text-muted"> of {featureCount}</span>}
                    </span>
                    {v.exclusiveCount > 0 && <Pill tone="accent">{v.exclusiveCount} only here</Pill>}
                  </span>
                </td>
                <td className="hidden px-3 py-3.5 text-right tabular-nums lg:table-cell">{v.responseCount}</td>
                <td className="hidden px-3 py-3.5 lg:table-cell">
                  {maxFeedback > 0 ? (
                    <SentimentBar counts={v.sentiment} max={maxFeedback} className="w-full max-w-36" />
                  ) : (
                    <span className="text-faint">No feedback</span>
                  )}
                </td>
                <td className="pr-3 text-faint">
                  <ChevronRightIcon className="size-4" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function VendorTableSkeleton() {
  return (
    <section className="grid gap-5 rounded-[10px] border border-line bg-surface px-4 py-5">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-4" />
      ))}
    </section>
  );
}
