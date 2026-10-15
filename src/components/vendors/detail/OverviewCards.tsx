import Link from "next/link";
import { api } from "@/lib/api";
import { GROUP_LABELS, type Group, type Sentiment, type Vendor } from "@/lib/api/types";
import { cn, formatDate, plural } from "@/lib/format";
import { Card, CardLink, CardMeta, CardSkeleton } from "@/components/ui/Card";
import { CheckIcon, MinusIcon } from "@/components/ui/icons";
import { AiSummaryCard, SentimentTiles } from "@/components/ui/insights";
import { EmptyState, Pill } from "@/components/ui/primitives";
import { Quote } from "@/components/responses/Quote";
import { KIND_FIELD, KIND_LABEL } from "@/components/responses/ResponseCard";

type Props = { projectId: string; vendorId: string };

const KINDS: Sentiment[] = ["like", "dislike", "want"];

export function VendorHeader({ vendor, featureCount }: { vendor: Vendor; featureCount: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 className="text-[22px] font-semibold tracking-[-0.015em]">{vendor.name}</h1>
      {vendor.requestsTotal > 0 && (
        <Pill tone="accent">
          Meets {vendor.requestsMet} of {vendor.requestsTotal} requests
        </Pill>
      )}
      {featureCount > 0 && (
        <Pill>
          Offers {vendor.featureIds.length} of {plural(featureCount, "feature")}
        </Pill>
      )}
    </div>
  );
}

// ---- Summary: GET /vendors/:vendorId/summary ----

export async function VendorSummaryCard({ projectId, vendorId }: Props) {
  return <AiSummaryCard summary={await api.getVendorSummary(projectId, vendorId)} subject="vendor" />;
}

export const VendorSummarySkeleton = () => <CardSkeleton title="Summary" />;

// ---- Requests: GET /vendors/:vendorId/requests ----

export async function RequestsCard({ projectId, vendorId }: Props) {
  const { items } = await api.listVendorRequests(projectId, vendorId);
  const met = items.filter((r) => r.offers).length;

  return (
    <Card title="Requests" action={items.length > 0 && <CardMeta>Meets {met} of {items.length}</CardMeta>}>
      {items.length === 0 ? (
        <EmptyState title="No requests yet">Features show up here once someone says they want them.</EmptyState>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Meets ${met} of ${items.length} requests`}
            className="mb-3 h-1.5 overflow-hidden rounded-full bg-chip"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${(met / items.length) * 100}%` }} />
          </div>
          <ul className="-mx-2">
            {items.map((r) => (
              <li key={r.feature.id}>
                <Link
                  href={`/projects/${projectId}/features/${r.feature.id}`}
                  className="flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[13px] transition-colors hover:bg-chip"
                >
                  {r.offers ? <CheckIcon className="size-4 text-like" /> : <MinusIcon className="size-4 text-faint" />}
                  <span className="sr-only">{r.offers ? "Offers:" : "Doesn't offer:"}</span>
                  <span className={cn("min-w-0 flex-1 truncate", r.offers ? "font-medium" : "text-muted")}>{r.feature.name}</span>
                  <span className="text-xs text-faint tabular-nums">{plural(r.wants, "want")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export const RequestsSkeleton = () => <CardSkeleton title="Requests" lines={5} />;

// ---- What its users said: GET /vendors/:vendorId/responses ----

const QUOTE_LIMIT = 4;

export async function VendorFeedbackCard({ projectId, vendorId }: Props) {
  const { items, total } = await api.listVendorResponses(projectId, vendorId);
  const counts = { like: 0, dislike: 0, want: 0 };
  for (const r of items) for (const m of r.mentions) counts[m.kind] += 1;

  // One quote per answer, naming every feature AI linked to it.
  const quotes = items
    .flatMap((r) =>
      KINDS.map((kind) => ({ r, kind, features: r.mentions.filter((m) => m.kind === kind).map((m) => m.feature.name) })),
    )
    .filter((q) => q.features.length > 0)
    .slice(0, QUOTE_LIMIT);

  return (
    <Card title="What its users said" action={<CardMeta>{plural(total, "response")}</CardMeta>}>
      <div className="mb-4">
        <SentimentTiles counts={counts} />
      </div>
      {quotes.length === 0 ? (
        <EmptyState title="No feedback about this vendor yet" />
      ) : (
        <ul className="grid gap-3.5">
          {quotes.map(({ r, kind, features }) => (
            <Quote key={`${r.id}-${kind}`} kind={kind} text={r[KIND_FIELD[kind]]}>
              {KIND_LABEL[kind]} · {features.join(", ")} · {GROUP_LABELS[r.group]} · {formatDate(r.submittedAt)}
            </Quote>
          ))}
        </ul>
      )}
      {total > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <CardLink href={`/projects/${projectId}/vendors/${vendorId}/responses`}>
            View all {plural(total, "response")}
          </CardLink>
        </div>
      )}
    </Card>
  );
}

export const VendorFeedbackSkeleton = () => <CardSkeleton title="What its users said" lines={5} />;

// ---- Features offered: GET /vendors/:vendorId/features ----

export async function OfferedFeaturesCard({ projectId, vendorId }: Props) {
  const { items } = await api.listVendorFeatures(projectId, vendorId);
  return (
    <Card title="Features offered" action={<CardMeta>{plural(items.length, "feature")}</CardMeta>}>
      {items.length === 0 ? (
        <EmptyState title="No features recorded for this vendor" />
      ) : (
        <ul className="-mx-2">
          {items.map((f) => {
            const feedback = KINDS.filter((k) => f.sentiment[k] > 0);
            return (
              <li key={f.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/projects/${projectId}/features/${f.id}`}
                  className="my-px flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors hover:bg-chip"
                >
                  <span className="min-w-0 truncate font-semibold">{f.name}</span>
                  {f.exclusive && <Pill tone="accent">Only here</Pill>}
                  <span className="flex-1" />
                  {feedback.length > 0 ? (
                    <span className="flex gap-1">
                      {feedback.map((k) => (
                        <Pill key={k} tone={k}>
                          {plural(f.sentiment[k], KIND_LABEL[k].toLowerCase())}
                        </Pill>
                      ))}
                    </span>
                  ) : (
                    <span className="text-faint">No feedback</span>
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

export const OfferedFeaturesSkeleton = () => <CardSkeleton title="Features offered" lines={5} />;

// ---- Who responded: GET /vendors/:vendorId/responses (same request as the feedback card) ----

const GROUPS: Group[] = ["pm", "sponsor", "other"];
const GROUP_BG: Record<Group, string> = { pm: "bg-group-pm", sponsor: "bg-group-sponsor", other: "bg-group-other" };

export async function RespondentsCard({ projectId, vendorId }: Props) {
  const { items, total } = await api.listVendorResponses(projectId, vendorId);
  const counts: Record<Group, number> = { pm: 0, sponsor: 0, other: 0 };
  for (const r of items) counts[r.group] += 1;

  return (
    <Card title="Who responded" action={<CardMeta>{plural(total, "response")}</CardMeta>}>
      {total === 0 ? (
        <p className="text-[13px] text-muted">Nobody has submitted feedback about this vendor yet.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={GROUPS.map((g) => `${GROUP_LABELS[g]}: ${counts[g]}`).join(", ")}
            className="flex h-2.5 gap-0.5 overflow-hidden rounded-[4px]"
          >
            {GROUPS.filter((g) => counts[g] > 0).map((g) => (
              <span key={g} className={GROUP_BG[g]} style={{ flexGrow: counts[g] }} />
            ))}
          </div>
          <ul className="mt-3 grid gap-1.5 text-xs">
            {GROUPS.map((g) => (
              <li key={g} className="flex items-center gap-2">
                <span className={cn("size-[7px] rounded-full", GROUP_BG[g])} />
                {GROUP_LABELS[g]}
                <span className="ml-auto font-semibold tabular-nums">{counts[g]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export const RespondentsSkeleton = () => <CardSkeleton title="Who responded" lines={3} />;
