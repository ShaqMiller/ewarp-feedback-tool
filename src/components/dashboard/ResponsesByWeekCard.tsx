import { api } from "@/lib/api";
import { GROUP_LABELS, type Group } from "@/lib/api/types";
import { formatDate, formatWeek } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/primitives";

const TITLE = "Responses by week";
const GROUPS: Group[] = ["pm", "sponsor", "other"];
const GROUP_BG: Record<Group, string> = { pm: "bg-group-pm", sponsor: "bg-group-sponsor", other: "bg-group-other" };

function Legend({ className = "hidden justify-end sm:flex" }: { className?: string }) {
  return (
    <ul className={`flex-wrap gap-x-3.5 gap-y-1 text-xs font-normal text-muted ${className}`}>
      {GROUPS.map((g) => (
        <li key={g} className="flex items-center gap-1.5">
          <span className={`size-[7px] rounded-full ${GROUP_BG[g]}`} />
          {g === "other" ? "Other" : GROUP_LABELS[g]}
        </li>
      ))}
    </ul>
  );
}

// Three or four evenly spaced whole-number ticks that cover `max`.
function ticksFor(max: number) {
  const step = Math.max(1, Math.ceil(max / 3));
  return [0, step, step * 2, step * 3];
}

// Uses GET /projects/:projectId/analytics/responses-by-week
export async function ResponsesByWeekCard({ projectId }: { projectId: string }) {
  const { weeks } = await api.getResponsesByWeek(projectId, { weeks: 6 });
  const totals = weeks.map((w) => GROUPS.reduce((sum, g) => sum + w.counts[g], 0));
  const ticks = ticksFor(Math.max(...totals));
  const top = ticks.at(-1)!;

  return (
    <Card title={TITLE} action={<Legend />}>
      {totals.every((t) => t === 0) ? (
        <EmptyState title="No responses in the last 6 weeks">Weekly counts appear here as the survey collects responses.</EmptyState>
      ) : (
        <>
          <div aria-hidden="true" className="relative ml-6 h-[150px]">
            {ticks.map((t) => (
              <div
                key={t}
                className={`absolute inset-x-0 border-t ${t === 0 ? "border-line" : "border-dashed border-line"}`}
                style={{ bottom: `${(t / top) * 100}%` }}
              >
                <span className="absolute -left-6 w-4 -translate-y-1/2 text-right text-[11px] tabular-nums text-faint">{t}</span>
              </div>
            ))}
            <div className="absolute inset-0 flex items-end justify-around gap-2 px-1">
              {weeks.map((w, i) => (
                <div key={w.weekStart} className="flex h-full w-full max-w-[72px] flex-col-reverse">
                  {GROUPS.filter((g) => w.counts[g] > 0).map((g) => (
                    <div
                      key={g}
                      className={`rounded-[3px] border-t-2 border-surface first:border-t-0 ${GROUP_BG[g]}`}
                      style={{ height: `${(w.counts[g] / top) * 100}%` }}
                      title={`${GROUP_LABELS[g]}: ${w.counts[g]}`}
                    />
                  ))}
                  {totals[i] === 0 && <div className="h-px" />}
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden="true" className="@container mt-2 ml-6 flex justify-around gap-2 px-1">
            {weeks.map((w) => (
              <span key={w.weekStart} className="w-full max-w-[72px] text-center text-[11px] whitespace-nowrap text-faint">
                <span className="@xl:hidden">{formatDate(w.weekStart)}</span>
                <span className="hidden @xl:inline">{formatWeek(w.weekStart)}</span>
              </span>
            ))}
          </div>
          <Legend className="mt-3 flex sm:hidden" />
          {/* Tables ignore sr-only's 1px width, so the wrapper does the hiding. */}
          <div className="sr-only">
            <table>
              <caption>{TITLE}</caption>
              <thead>
                <tr>
                  <th>Week of</th>
                  {GROUPS.map((g) => (
                    <th key={g}>{GROUP_LABELS[g]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.weekStart}>
                    <td>{formatWeek(w.weekStart)}</td>
                    {GROUPS.map((g) => (
                      <td key={g}>{w.counts[g]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

export function ResponsesByWeekSkeleton() {
  return (
    <Card title={TITLE} action={<Legend />}>
      <Skeleton className="h-[172px]" />
    </Card>
  );
}
