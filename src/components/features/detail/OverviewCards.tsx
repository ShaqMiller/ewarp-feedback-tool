import Link from "next/link";
import { api } from "@/lib/api";
import { GROUP_LABELS, type Group, type Sentiment } from "@/lib/api/types";
import { cn, formatDate, plural } from "@/lib/format";
import { Card, CardLink, CardMeta, CardSkeleton } from "@/components/ui/Card";
import { CheckIcon, MinusIcon } from "@/components/ui/icons";
import { AiSummaryCard, SentimentTiles } from "@/components/ui/insights";
import { EmptyState, Pill, Skeleton } from "@/components/ui/primitives";
import { Quote } from "@/components/responses/Quote";
import { KIND_FIELD, KIND_LABEL } from "@/components/responses/ResponseCard";

type Props = { projectId: string; featureId: string };

const KINDS: Sentiment[] = ["like", "dislike", "want"];
const KIND_STROKE: Record<Sentiment, { color: string; dash?: string }> = {
  like: { color: "var(--color-like)" },
  dislike: { color: "var(--color-dislike)", dash: "5 4" },
  want: { color: "var(--color-want)", dash: "1 4" },
};
const GROUP_SHORT: Record<Group, string> = { pm: "PM", sponsor: "Sponsor", other: "Other" };

// ---- Summary: GET /features/:featureId/summary ----

export async function SummaryCard({ projectId, featureId }: Props) {
  return <AiSummaryCard summary={await api.getFeatureSummary(projectId, featureId)} subject="feature" />;
}

export const SummarySkeleton = () => <CardSkeleton title="Summary" />;

// ---- What people said: GET /features/:featureId + /responses ----

const QUOTE_LIMIT = 4;

export async function FeedbackCard({ projectId, featureId }: Props) {
  const [feature, { items, total }] = await Promise.all([
    api.getFeature(projectId, featureId),
    api.listFeatureResponses(projectId, featureId),
  ]);
  const quotes = items
    .flatMap((r) => r.kinds.map((kind) => ({ r, kind, text: r[KIND_FIELD[kind]] })))
    .slice(0, QUOTE_LIMIT);

  return (
    <Card title="What people said" action={<CardMeta>{plural(feature.mentions, "mention")}</CardMeta>}>
      <div className="mb-4">
        <SentimentTiles counts={feature.sentiment} />
      </div>
      {quotes.length === 0 ? (
        <EmptyState title="No responses mention this yet" />
      ) : (
        <ul className="grid gap-3.5">
          {quotes.map(({ r, kind, text }) => (
            <Quote key={`${r.id}-${kind}`} kind={kind} text={text}>
              {KIND_LABEL[kind]} · {GROUP_LABELS[r.group]} · {r.vendor.name} · {formatDate(r.submittedAt)}
            </Quote>
          ))}
        </ul>
      )}
      {total > items.slice(0, QUOTE_LIMIT).length && (
        <div className="mt-4 border-t border-line pt-3">
          <CardLink href={`/projects/${projectId}/features/${featureId}/responses`}>View all {plural(total, "response")}</CardLink>
        </div>
      )}
    </Card>
  );
}

export const FeedbackSkeleton = () => <CardSkeleton title="What people said" lines={5} />;

// ---- Vendor coverage: GET /features/:featureId/vendors ----

export async function VendorCoverageCard({ projectId, featureId }: Props) {
  const { items } = await api.listFeatureVendors(projectId, featureId);
  return (
    <Card title="Vendor coverage">
      {items.length === 0 ? (
        <EmptyState title="No vendors in this project yet" />
      ) : (
        <ul className="-mx-2">
          {items.map(({ vendor, offers, sentiment }) => {
            const feedback = KINDS.filter((k) => sentiment[k] > 0);
            return (
              <li key={vendor.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/projects/${projectId}/vendors/${vendor.id}`}
                  className="my-px flex items-center gap-2.5 rounded-md px-2 py-2 text-xs transition-colors hover:bg-chip"
                >
                  {offers ? (
                    <CheckIcon className="size-4 text-like" />
                  ) : (
                    <MinusIcon className="size-4 text-faint" />
                  )}
                  <span className="sr-only">{offers ? "Offers it:" : "Doesn't offer it:"}</span>
                  <span className={cn("min-w-0 flex-1 truncate font-semibold", !offers && "text-muted")}>{vendor.name}</span>
                  {feedback.length > 0 ? (
                    <span className="flex gap-1">
                      {feedback.map((k) => (
                        <Pill key={k} tone={k}>
                          {sentiment[k]} {KIND_LABEL[k].toLowerCase()}
                          {sentiment[k] > 1 && "s"}
                        </Pill>
                      ))}
                    </span>
                  ) : (
                    <span className="text-faint">{offers ? "No feedback yet" : "Doesn't offer"}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export const VendorCoverageSkeleton = () => <CardSkeleton title="Vendor coverage" />;

// ---- Connections: the responses -> feature -> vendors trace, from the same endpoints ----

const MAX_NODES = 5;
const ROW = 40;
const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function ConnectionsCard({ projectId, featureId }: Props) {
  const [feature, responses, vendors] = await Promise.all([
    api.getFeature(projectId, featureId),
    api.listFeatureResponses(projectId, featureId),
    api.listFeatureVendors(projectId, featureId),
  ]);
  const left = responses.items.slice(0, MAX_NODES).map((r) => ({
    id: r.id,
    label: `${GROUP_SHORT[r.group]} · ${formatDate(r.submittedAt)}`,
    kind: r.kinds[0],
  }));
  const extra = responses.total - left.length;
  const right = vendors.items.filter((v) => v.offers).slice(0, MAX_NODES);

  if (left.length === 0 && right.length === 0) {
    return (
      <Card title="Connections">
        <EmptyState title="No connections yet" />
      </Card>
    );
  }

  const leftRows = left.length + (extra > 0 ? 1 : 0);
  const height = Math.max(leftRows, right.length, 1) * ROW + 8;
  const cy = height / 2;
  const yOf = (i: number, count: number) => cy + (i - (count - 1) / 2) * ROW;

  return (
    <Card title="Connections">
      <svg
        viewBox={`0 0 330 ${height}`}
        className="w-full"
        role="img"
        aria-label={`${plural(responses.total, "response")} mention ${feature.name}; offered by ${
          right.map((v) => v.vendor.name).join(", ") || "no vendor"
        }.`}
      >
        <g fill="none" strokeWidth={1.6} strokeLinecap="round">
          {left.map((n, i) => {
            const y = yOf(i, leftRows);
            const s = KIND_STROKE[n.kind];
            return <path key={n.id} d={`M80 ${y} C104 ${y},100 ${cy},120 ${cy}`} stroke={s.color} strokeDasharray={s.dash} />;
          })}
          {right.map((v, i) => {
            const y = yOf(i, right.length);
            return <path key={v.vendor.id} d={`M220 ${cy} C236 ${cy},232 ${y},248 ${y}`} stroke="var(--color-cov-some)" />;
          })}
        </g>
        <g className="text-[11px]">
          {left.map((n, i) => {
            const y = yOf(i, leftRows);
            return (
              <g key={n.id}>
                <rect x={2} y={y - 13} width={78} height={26} rx={6} className="fill-surface stroke-line" />
                <text x={41} y={y + 4} textAnchor="middle" className="fill-ink">
                  {n.label}
                </text>
              </g>
            );
          })}
          {extra > 0 && (
            <text x={41} y={yOf(left.length, leftRows) + 4} textAnchor="middle" className="fill-faint">
              +{extra} more
            </text>
          )}
          <rect x={120} y={cy - 16} width={100} height={32} rx={8} className="fill-ink" />
          <text x={170} y={cy + 4} textAnchor="middle" className="fill-surface text-[11.5px] font-semibold">
            {trim(feature.name, 15)}
          </text>
          {right.map((v, i) => {
            const y = yOf(i, right.length);
            return (
              <g key={v.vendor.id}>
                <rect x={248} y={y - 13} width={80} height={26} rx={6} className="fill-chip" />
                <text x={288} y={y + 4} textAnchor="middle" className="fill-ink">
                  {trim(v.vendor.name, 12)}
                </text>
              </g>
            );
          })}
          {right.length === 0 && (
            <text x={288} y={cy + 4} textAnchor="middle" className="fill-gap">
              No vendor
            </text>
          )}
        </g>
      </svg>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-like" />Like</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-dislike" />Dislike</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dotted border-want" />Want</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-cov-some" />Offered by</span>
      </p>
    </Card>
  );
}

export const ConnectionsSkeleton = () => (
  <Card title="Connections">
    <Skeleton className="h-32" />
  </Card>
);

// ---- Mentioned alongside: GET /features/:featureId/related ----

export async function RelatedFeaturesCard({ projectId, featureId }: Props) {
  const { items } = await api.listRelatedFeatures(projectId, featureId, { limit: 8 });
  return (
    <Card title="Mentioned alongside">
      {items.length === 0 ? (
        <p className="text-[13px] text-muted">No other features come up in the same responses yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((f) => (
            <li key={f.id}>
              <Link
                href={`/projects/${projectId}/features/${f.id}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-chip px-2.5 text-xs font-medium text-ink transition-colors hover:bg-line"
              >
                {f.coverage === "none" && <span aria-hidden="true" className="size-1.5 rounded-full bg-gap" />}
                {f.name}
                {f.sharedResponses > 1 && <span className="tabular-nums text-faint">{f.sharedResponses}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export const RelatedFeaturesSkeleton = () => <CardSkeleton title="Mentioned alongside" lines={1} />;
