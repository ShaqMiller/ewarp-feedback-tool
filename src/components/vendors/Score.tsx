import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/format";
import { Card, CardLink, CardSkeleton } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/primitives";

// A vendor's 0-100 score with a short bar. Tone only marks the ends: 70+ strong, under 40 weak.
export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone = score >= 70 ? "bg-like" : score < 40 ? "bg-dislike" : "bg-accent";
  return (
    <span className={cn("inline-flex items-center gap-2", className)} role="img" aria-label={`Score ${score} out of 100`}>
      <span aria-hidden="true" className="font-semibold tabular-nums">
        {score}
      </span>
      <span aria-hidden="true" className="h-1.5 w-12 overflow-hidden rounded-full bg-chip">
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${score}%` }} />
      </span>
    </span>
  );
}

const percent = (n: number) => `${Math.round(n * 100)}%`;
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

// ---- Score: GET /projects/:projectId/scores ----

// How the vendor's score is built: coverage of weighted requests, its users' feedback, and the features that moved it most.
export async function ScoreCard({ projectId, vendorId }: { projectId: string; vendorId: string }) {
  const { items, mix } = await api.getScores(projectId);
  const rank = items.findIndex((s) => s.vendor.id === vendorId);
  const score = items[rank];
  if (!score) return <Card title="Score"><EmptyState title="No score yet" /></Card>;
  const top = score.breakdown.filter((b) => b.contribution !== 0).slice(0, 6);

  return (
    <Card title="Score" action={<CardLink href={`/projects/${projectId}/vendors`}>#{rank + 1} of {items.length}</CardLink>}>
      <div className="flex items-end gap-3">
        <p className="text-[34px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{score.score}</p>
        <p className="pb-1 text-xs text-muted">out of 100</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-sidebar p-2.5">
          <dt className="text-muted">Requests covered</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{percent(score.coverage)}</dd>
          <dd className="text-[11px] text-faint">{percent(mix.coverage)} of the score</dd>
        </div>
        <div className="rounded-lg bg-sidebar p-2.5">
          <dt className="text-muted">Users&apos; feedback</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">
            {score.satisfaction === 0 ? "Neutral" : `${signed(Math.round(score.satisfaction * 100))}%`}
          </dd>
          <dd className="text-[11px] text-faint">{percent(mix.satisfaction)} of the score</dd>
        </div>
      </dl>
      {top.length > 0 && (
        <>
          <h3 className="mt-4 mb-1.5 text-xs font-medium text-muted">What moved it most</h3>
          <ul className="-mx-2">
            {top.map((b) => (
              <li key={b.feature.id}>
                <Link
                  href={`/projects/${projectId}/features/${b.feature.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-chip"
                >
                  <span className="min-w-0 flex-1 truncate">{b.feature.name}</span>
                  {b.weight !== 1 && <span className="text-[11px] text-faint">×{b.weight}</span>}
                  <span
                    className={cn("w-12 text-right font-semibold tabular-nums", b.contribution > 0 ? "text-like" : "text-dislike")}
                  >
                    {signed(b.contribution)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 border-t border-line pt-3 text-[11.5px] text-muted">
        Offering a requested feature adds points; dislikes from its own users take them away. Admins set how much each
        feature and respondent group counts in Settings → Weights.
      </p>
    </Card>
  );
}

export const ScoreSkeleton = () => <CardSkeleton title="Score" lines={4} />;
