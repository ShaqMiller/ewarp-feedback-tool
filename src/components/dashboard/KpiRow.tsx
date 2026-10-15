import type { ReactNode } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/primitives";

function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub: ReactNode }) {
  return (
    <Card>
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-1.5 mb-0.5 text-[26px] leading-[1.1] font-semibold tracking-[-0.02em] tabular-nums">{value}</div>
      <div className="text-xs text-muted">{sub}</div>
    </Card>
  );
}

const grid = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4";

// Uses GET /projects/:projectId/summary
export async function KpiRow({ projectId }: { projectId: string }) {
  const { responses, features, requests, sentiment } = await api.getSummary(projectId);
  const totalFeedback = sentiment.like + sentiment.dislike + sentiment.want;

  return (
    <div className={grid}>
      <Kpi
        label="Responses"
        value={responses.total}
        sub={responses.thisWeek > 0 ? <><span className="text-like">+{responses.thisWeek}</span> this week</> : "None this week"}
      />
      <Kpi label="Features found" value={features.total} sub={`from ${features.mentions} mentions`} />
      <Kpi
        label="Unmet requests"
        value={
          <>
            <span className={requests.unmet > 0 ? "text-gap" : undefined}>{requests.unmet}</span>{" "}
            <span className="text-sm font-medium tracking-normal text-muted">of {requests.total}</span>
          </>
        }
        sub={
          requests.total === 0
            ? "No requests yet"
            : requests.unmet > 0
              ? "No vendor offers these yet"
              : "Every request has a vendor"
        }
      />
      <Card>
        <p className="text-xs font-medium text-muted">Feedback mix</p>
        <div
          role="img"
          aria-label={`${sentiment.like} likes, ${sentiment.dislike} dislikes, ${sentiment.want} wants`}
          className="mt-3.5 mb-2.5 flex h-2.5 gap-0.5 overflow-hidden rounded-[4px] bg-chip"
        >
          {totalFeedback > 0 && (
            <>
              <span className="bg-like" style={{ flexGrow: sentiment.like }} />
              <span className="bg-dislike" style={{ flexGrow: sentiment.dislike }} />
              <span className="bg-want" style={{ flexGrow: sentiment.want }} />
            </>
          )}
        </div>
        <p className="flex flex-wrap gap-x-2.5 text-xs text-muted">
          <span><b className="font-semibold text-like">{sentiment.like}</b> likes</span>
          <span><b className="font-semibold text-dislike">{sentiment.dislike}</b> dislikes</span>
          <span><b className="font-semibold text-want">{sentiment.want}</b> wants</span>
        </p>
      </Card>
    </div>
  );
}

export function KpiRowSkeleton() {
  return (
    <div className={grid}>
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i}>
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-3 h-7 w-12" />
          <Skeleton className="mt-2 h-3 w-24" />
        </Card>
      ))}
    </div>
  );
}
