import Link from "next/link";
import type { VendorListItem, VendorScore } from "@/lib/api/types";
import { cn, plural } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SentimentBar } from "@/components/ui/feedback";
import { EmptyState, Pill } from "@/components/ui/primitives";
import { ScoreBadge } from "./Score";

type ComparisonVendor = { vendor: VendorListItem; score: VendorScore };

const percent = (value: number) => `${Math.round(value * 100)}%`;
const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

function VendorSelect({ name, label, selectedId, vendors }: { name: string; label: string; selectedId: string; vendors: VendorListItem[] }) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted">
      <span className="shrink-0">{label}</span>
      <select name={name} defaultValue={selectedId} className="h-[34px] min-w-0 rounded-[7px] border border-line bg-surface px-2.5 text-[13px] font-medium text-ink">
        {vendors.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, left, right, better = "high" }: { label: string; left: number; right: number; better?: "high" | "low" }) {
  const leftWins = better === "high" ? left > right : left < right;
  const rightWins = better === "high" ? right > left : right < left;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1fr)] items-center gap-3 border-b border-line py-3 text-[13px] last:border-b-0">
      <span className={cn("text-right font-semibold tabular-nums", leftWins && "text-like")}>{left}</span>
      <span className="text-center text-xs text-muted">{label}</span>
      <span className={cn("font-semibold tabular-nums", rightWins && "text-like")}>{right}</span>
    </div>
  );
}

function VendorSnapshot({ item, projectId, maxFeedback }: { item: ComparisonVendor; projectId: string; maxFeedback: number }) {
  const { vendor, score } = item;
  const drivers = score.breakdown.filter((row) => row.contribution !== 0).slice(0, 3);
  const feedbackTotal = vendor.sentiment.like + vendor.sentiment.dislike + vendor.sentiment.want;

  return (
    <Card
      title={vendor.name}
      action={<Link href={`/projects/${projectId}/vendors/${vendor.id}`} className="text-xs text-muted hover:text-ink">Open vendor</Link>}
      className="h-full"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[32px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{score.score}</p>
          <p className="mt-1 text-xs text-muted">overall score</p>
        </div>
        <ScoreBadge score={score.score} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-sidebar p-2.5">
          <dt className="text-muted">Requests covered</dt>
          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{percent(score.coverage)}</dd>
          <dd className="mt-0.5 text-[11px] text-faint">{vendor.requestsMet} of {vendor.requestsTotal}</dd>
        </div>
        <div className="rounded-lg bg-sidebar p-2.5">
          <dt className="text-muted">User satisfaction</dt>
          <dd className={cn("mt-0.5 text-[15px] font-semibold tabular-nums", score.satisfaction < 0 && "text-dislike", score.satisfaction > 0 && "text-like")}>
            {score.satisfaction === 0 ? "Neutral" : `${signed(Math.round(score.satisfaction * 100))}%`}
          </dd>
          <dd className="mt-0.5 text-[11px] text-faint">from its own users</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium">Feedback</span>
          <span className="text-muted">{plural(vendor.responseCount, "response")}</span>
        </div>
        {feedbackTotal > 0 ? (
          <>
            <SentimentBar counts={vendor.sentiment} max={maxFeedback} className="mt-2 w-full" />
            <p className="mt-1.5 text-[11px] text-muted">{vendor.sentiment.like} positive · {vendor.sentiment.dislike} negative · {vendor.sentiment.want} requests</p>
          </>
        ) : (
          <p className="mt-2 text-xs text-faint">No feedback yet</p>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="text-xs font-medium text-muted">Top score drivers</p>
        {drivers.length > 0 ? (
          <ul className="mt-1.5 grid gap-1.5">
            {drivers.map((driver) => (
              <li key={driver.feature.id} className="flex items-center gap-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate">{driver.feature.name}</span>
                <span className={cn("font-semibold tabular-nums", driver.contribution > 0 ? "text-like" : "text-dislike")}>
                  {signed(Math.round(driver.contribution))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-xs text-faint">Not enough scored feedback yet</p>
        )}
      </div>
    </Card>
  );
}

// A shareable leadership view built entirely from GET /vendors and GET /scores.
export function VendorComparison({ projectId, vendors, scores, leftId, rightId }: { projectId: string; vendors: VendorListItem[]; scores: VendorScore[]; leftId: string; rightId: string }) {
  if (vendors.length < 2) {
    return (
      <section className="rounded-[10px] border border-line bg-surface">
        <EmptyState title="Add another vendor to compare">A comparison becomes available when this project has at least two vendors.</EmptyState>
      </section>
    );
  }

  const scoreByVendor = new Map(scores.map((score) => [score.vendor.id, score]));
  const leftVendor = vendors.find((vendor) => vendor.id === leftId) ?? vendors[0];
  const rightVendor = vendors.find((vendor) => vendor.id === rightId && vendor.id !== leftVendor.id) ?? vendors.find((vendor) => vendor.id !== leftVendor.id)!;
  const leftScore = scoreByVendor.get(leftVendor.id);
  const rightScore = scoreByVendor.get(rightVendor.id);
  if (!leftScore || !rightScore) return null;

  const left = { vendor: leftVendor, score: leftScore };
  const right = { vendor: rightVendor, score: rightScore };
  const maxFeedback = Math.max(1, ...[leftVendor, rightVendor].map((vendor) => vendor.sentiment.like + vendor.sentiment.dislike + vendor.sentiment.want));
  const leading = leftScore.score === rightScore.score ? null : leftScore.score > rightScore.score ? leftVendor : rightVendor;

  return (
    <div className="grid gap-4">
      <form method="get" className="flex flex-wrap items-end gap-2 rounded-[10px] border border-line bg-surface p-3">
        <VendorSelect name="left" label="Compare" selectedId={leftVendor.id} vendors={vendors} />
        <span className="pb-2 text-xs text-faint">with</span>
        <VendorSelect name="right" label="" selectedId={rightVendor.id} vendors={vendors} />
        <Button type="submit" className="ml-auto">Update comparison</Button>
      </form>

      <section className="rounded-[10px] border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[13.5px] font-semibold">At a glance</h2>
            <p className="mt-0.5 text-xs text-muted">Overall scores use weighted request coverage and feedback from each vendor&apos;s users.</p>
          </div>
          {leading ? <Pill tone="like">Highest score: {leading.name}</Pill> : <Pill>Scores are tied</Pill>}
        </div>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1fr)] gap-3 text-[13px]">
          <Link href={`/projects/${projectId}/vendors/${leftVendor.id}`} className="truncate font-semibold hover:underline">{leftVendor.name}</Link>
          <span className="text-center text-xs text-muted">Measure</span>
          <Link href={`/projects/${projectId}/vendors/${rightVendor.id}`} className="truncate font-semibold hover:underline">{rightVendor.name}</Link>
        </div>
        <div className="mt-1">
          <Metric label="Overall score" left={leftScore.score} right={rightScore.score} />
          <Metric label="Requests met" left={leftVendor.requestsMet} right={rightVendor.requestsMet} />
          <Metric label="Features offered" left={leftVendor.featureCount} right={rightVendor.featureCount} />
          <Metric label="Exclusive features" left={leftVendor.exclusiveCount} right={rightVendor.exclusiveCount} />
          <Metric label="Negative feedback" left={leftVendor.sentiment.dislike} right={rightVendor.sentiment.dislike} better="low" />
          <Metric label="Responses" left={leftVendor.responseCount} right={rightVendor.responseCount} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <VendorSnapshot item={left} projectId={projectId} maxFeedback={maxFeedback} />
        <VendorSnapshot item={right} projectId={projectId} maxFeedback={maxFeedback} />
      </div>
    </div>
  );
}
