import { api } from "@/lib/api";
import type { Coverage } from "@/lib/api/types";
import { plural } from "@/lib/format";
import { Card, CardMeta } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/primitives";

const TITLE = "Feature coverage";
const SEGMENTS: { key: Coverage; label: string; stroke: string; dot: string }[] = [
  { key: "all", label: "Offered by all", stroke: "var(--color-cov-all)", dot: "bg-cov-all" },
  { key: "some", label: "Offered by some", stroke: "var(--color-cov-some)", dot: "bg-cov-some" },
  { key: "none", label: "Gap", stroke: "var(--color-gap)", dot: "bg-gap" },
];

const R = 44;
const C = 2 * Math.PI * R;
const GAP = 2; // space between segments, in px along the ring

// Uses GET /projects/:projectId/analytics/coverage
export async function CoverageCard({ projectId }: { projectId: string }) {
  const coverage = await api.getCoverage(projectId);
  const { total } = coverage;

  if (total === 0) {
    return (
      <Card title={TITLE}>
        <EmptyState title="No features yet">Features appear once AI reads the first responses.</EmptyState>
      </Card>
    );
  }

  // Each visible segment's arc length and where it starts along the ring.
  const visible = SEGMENTS.filter((s) => coverage[s.key] > 0);
  const arcs = visible.map((s, i) => {
    const start = visible.slice(0, i).reduce((sum, prev) => sum + (coverage[prev.key] / total) * C, 0);
    const len = (coverage[s.key] / total) * C;
    return { ...s, start, dash: Math.max(len - (visible.length > 1 ? GAP : 0), 0) };
  });

  return (
    <Card title={TITLE} action={<CardMeta>{plural(total, "feature")}</CardMeta>}>
      <div className="flex items-center gap-5">
        <svg
          viewBox="0 0 120 120"
          className="size-32 shrink-0"
          role="img"
          aria-label={SEGMENTS.map((s) => `${s.label}: ${coverage[s.key]}`).join(", ")}
        >
          <g transform="rotate(-90 60 60)" fill="none" strokeWidth={15}>
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx={60}
                cy={60}
                r={R}
                stroke={a.stroke}
                strokeDasharray={`${a.dash} ${C}`}
                strokeDashoffset={-a.start}
              />
            ))}
          </g>
          <text x={60} y={60} textAnchor="middle" className="fill-ink text-[22px] font-semibold">
            {total}
          </text>
          <text x={60} y={76} textAnchor="middle" className="fill-faint text-[11px]">
            features
          </text>
        </svg>
        <ul className="grid flex-1 gap-2.5 text-xs">
          {SEGMENTS.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className={`size-[7px] rounded-full ${s.dot}`} />
              {s.label}
              <span className={`ml-auto font-semibold tabular-nums ${s.key === "none" && coverage.none > 0 ? "text-gap" : ""}`}>
                {coverage[s.key]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export function CoverageSkeleton() {
  return (
    <Card title={TITLE}>
      <div className="flex items-center gap-5">
        <Skeleton className="size-32 rounded-full" />
        <div className="grid flex-1 gap-3">
          <Skeleton className="h-3" />
          <Skeleton className="h-3" />
          <Skeleton className="h-3" />
        </div>
      </div>
    </Card>
  );
}
