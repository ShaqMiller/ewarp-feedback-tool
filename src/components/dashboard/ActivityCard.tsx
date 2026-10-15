import { api } from "@/lib/api";
import type { ActivityEvent, Group } from "@/lib/api/types";
import { formatDate, plural } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/primitives";

const TITLE = "Recent activity";
const LIMIT = 3;

const FROM_GROUP: Record<Group, string> = {
  pm: "a Program Manager",
  sponsor: "the sponsor's team",
  other: "another group",
};
const GROUP_DOT: Record<Group, string> = { pm: "bg-group-pm", sponsor: "bg-group-sponsor", other: "bg-group-other" };

function describe(e: ActivityEvent): { dot: string; title: string; detail: string } {
  switch (e.type) {
    case "response.submitted":
      return {
        dot: GROUP_DOT[e.response.group],
        title: `New response from ${FROM_GROUP[e.response.group]}`,
        detail: `${e.response.vendor.name} · ${formatDate(e.occurredAt)}`,
      };
    case "features.linked":
      return {
        dot: "bg-accent",
        title: `AI linked ${plural(e.features.length, "feature")}`,
        detail: e.features.map((f) => f.name).join(", "),
      };
    case "gap.detected":
      return { dot: "bg-gap", title: `New gap: ${e.feature.name}`, detail: formatDate(e.occurredAt) };
  }
}

// Uses GET /projects/:projectId/activity?limit=3
export async function ActivityCard({ projectId }: { projectId: string }) {
  const { items } = await api.listActivity(projectId, { limit: LIMIT });

  return (
    <Card title={TITLE}>
      {items.length === 0 ? (
        <EmptyState title="No activity yet">New responses and AI findings will show up here.</EmptyState>
      ) : (
        <ol className="grid gap-3 text-xs">
          {items.map((e) => {
            const { dot, title, detail } = describe(e);
            return (
              <li key={e.id} className="flex items-start gap-2.5">
                <span aria-hidden="true" className={`mt-[5px] size-[7px] shrink-0 rounded-full ${dot}`} />
                <div className="min-w-0">
                  <p>{title}</p>
                  <p className="truncate text-[11px] text-faint">{detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export function ActivitySkeleton() {
  return (
    <Card title={TITLE}>
      <div className="grid gap-4">
        {Array.from({ length: LIMIT }, (_, i) => (
          <div key={i} className="grid gap-1.5">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        ))}
      </div>
    </Card>
  );
}
