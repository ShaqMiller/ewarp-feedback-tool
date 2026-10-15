import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardLink } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/primitives";

const TITLE = "Most discussed features";
const LIMIT = 5;

// Uses GET /projects/:projectId/features?sort=mentions&limit=5
export async function TopFeaturesCard({ projectId }: { projectId: string }) {
  const { items } = await api.listFeatures(projectId, { sort: "mentions", limit: LIMIT });
  const features = items.filter((f) => f.mentions > 0);
  const max = Math.max(1, ...features.map((f) => f.mentions));
  const base = `/projects/${projectId}/features`;

  return (
    <Card title={TITLE} action={features.length > 0 && <CardLink href={base}>View all</CardLink>}>
      {features.length === 0 ? (
        <EmptyState title="No feature mentions yet">Features show up here once AI links them to responses.</EmptyState>
      ) : (
        <ul className="-mx-2 grid gap-px">
          {features.map((f) => (
            <li key={f.id}>
              <Link
                href={`${base}/${f.id}`}
                className="grid grid-cols-[minmax(0,118px)_1fr_16px] items-center gap-2.5 rounded-md px-2 py-[5px] text-xs transition-colors hover:bg-chip"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{f.name}</span>
                  {f.coverage === "none" && (
                    <>
                      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-gap" />
                      <span className="sr-only">(no vendor offers this)</span>
                    </>
                  )}
                </span>
                <span
                  className="flex h-2 gap-0.5"
                  role="img"
                  aria-label={`${f.sentiment.like} likes, ${f.sentiment.dislike} dislikes, ${f.sentiment.want} wants`}
                >
                  {f.sentiment.like > 0 && <span className="rounded-[3px] bg-like" style={{ width: `${(f.sentiment.like / max) * 100}%` }} />}
                  {f.sentiment.dislike > 0 && <span className="rounded-[3px] bg-dislike" style={{ width: `${(f.sentiment.dislike / max) * 100}%` }} />}
                  {f.sentiment.want > 0 && <span className="rounded-[3px] bg-want" style={{ width: `${(f.sentiment.want / max) * 100}%` }} />}
                </span>
                <span className="text-right font-semibold tabular-nums">{f.mentions}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function TopFeaturesSkeleton() {
  return (
    <Card title={TITLE}>
      <div className="grid gap-[13px] py-[3px]">
        {Array.from({ length: LIMIT }, (_, i) => (
          <Skeleton key={i} className="h-3.5" />
        ))}
      </div>
    </Card>
  );
}
