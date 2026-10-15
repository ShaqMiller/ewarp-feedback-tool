import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardLink } from "@/components/ui/Card";
import { GapDot, SentimentBar } from "@/components/ui/feedback";
import { EmptyState, Skeleton } from "@/components/ui/primitives";

const TITLE = "Most discussed features";
const LIMIT = 5;

// Uses GET /projects/:projectId/features?sort=mentions&limit=5
export async function TopFeaturesCard({ projectId }: { projectId: string }) {
  const { items } = await api.listFeatures(projectId, { sort: "mentions", limit: LIMIT });
  const features = items.filter((f) => f.mentions > 0);
  const max = Math.max(...features.map((f) => f.mentions));
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
                  {f.coverage === "none" && <GapDot />}
                </span>
                <SentimentBar counts={f.sentiment} max={max} />
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
