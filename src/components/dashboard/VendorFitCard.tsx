import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardMeta } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { ScoreBadge } from "@/components/vendors/Score";

const TITLE = "Vendor scores";

// Uses GET /projects/:projectId/vendors?sort=score
export async function VendorFitCard({ projectId }: { projectId: string }) {
  const { items } = await api.listVendors(projectId, { sort: "score" });

  return (
    <Card title={TITLE} action={items.length > 0 && <CardMeta>Out of 100</CardMeta>}>
      {items.length === 0 ? (
        <EmptyState title="No vendors yet">Vendors appear here once they are added to this project.</EmptyState>
      ) : (
        <ul className="-mx-2">
          {items.map((v) => (
            <li key={v.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/projects/${projectId}/vendors/${v.id}`}
                className="my-px flex items-center gap-2.5 rounded-md px-2 py-2 text-xs transition-colors hover:bg-chip"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{v.name}</span>
                <ScoreBadge score={v.score} className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function VendorFitSkeleton() {
  return (
    <Card title={TITLE}>
      <div className="grid gap-4 py-1.5">
        <Skeleton className="h-3.5" />
        <Skeleton className="h-3.5" />
        <Skeleton className="h-3.5" />
      </div>
    </Card>
  );
}
