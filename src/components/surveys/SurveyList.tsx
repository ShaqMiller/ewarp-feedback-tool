import Link from "next/link";
import { api } from "@/lib/api";
import { GROUP_LABELS, type Group, type Survey } from "@/lib/api/types";
import { cn, formatDate, plural } from "@/lib/format";
import { ChevronRightIcon } from "@/components/ui/icons";
import { EmptyState, Pill, Skeleton } from "@/components/ui/primitives";

const GROUPS: Group[] = ["pm", "sponsor", "other"];
const GROUP_BG: Record<Group, string> = { pm: "bg-group-pm", sponsor: "bg-group-sponsor", other: "bg-group-other" };
const SOURCE_LABEL: Record<Survey["source"], string> = { google_forms: "Google Forms" };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function SurveyCard({ survey, projectId }: { survey: Survey; projectId: string }) {
  const pending = survey.responseCount - survey.analyzedCount;
  return (
    <article className="flex flex-col gap-4 rounded-[10px] border border-line bg-surface p-4">
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold">{survey.name}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {SOURCE_LABEL[survey.source]} · connected {formatDate(survey.createdAt)}
          </p>
        </div>
        <Pill tone={survey.status === "collecting" ? "like" : "neutral"}>
          {survey.status === "collecting" && <span className="size-1.5 rounded-full bg-like" />}
          {survey.status === "collecting" ? "Collecting" : "Closed"}
        </Pill>
      </header>

      <dl className="grid grid-cols-3 gap-3 border-y border-line py-3">
        <Stat label="Responses" value={survey.responseCount} />
        <Stat label="Vendors covered" value={survey.vendorCount} />
        <Stat label="Last response" value={survey.lastResponseAt ? formatDate(survey.lastResponseAt) : "—"} />
      </dl>

      {survey.responseCount === 0 ? (
        <p className="text-[13px] text-muted">No responses yet. They appear here as soon as people submit the form.</p>
      ) : (
        <div className="grid gap-3.5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted">Read by AI</span>
              <span className="font-medium tabular-nums">
                {survey.analyzedCount} of {survey.responseCount}
                {pending > 0 && <span className="text-accent"> · {pending} waiting</span>}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${survey.analyzedCount} of ${survey.responseCount} responses read by AI`}
              className="h-1.5 overflow-hidden rounded-full bg-chip"
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${(survey.analyzedCount / survey.responseCount) * 100}%` }} />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted">Who responded</p>
            <div
              role="img"
              aria-label={GROUPS.map((g) => `${GROUP_LABELS[g]}: ${survey.groups[g]}`).join(", ")}
              className="flex h-2 gap-0.5 overflow-hidden rounded-[4px]"
            >
              {GROUPS.filter((g) => survey.groups[g] > 0).map((g) => (
                <span key={g} className={GROUP_BG[g]} style={{ flexGrow: survey.groups[g] }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-hidden="true">
              {GROUPS.map((g) => (
                <li key={g} className="flex items-center gap-1.5">
                  <span className={cn("size-[7px] rounded-full", GROUP_BG[g])} />
                  {GROUP_LABELS[g]} <span className="font-semibold text-ink tabular-nums">{survey.groups[g]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {survey.responseCount > 0 && (
        <Link
          href={`/projects/${projectId}/responses?survey=${survey.id}`}
          className="mt-auto inline-flex items-center gap-1 self-start rounded text-[13px] font-medium text-accent hover:underline"
        >
          View {plural(survey.responseCount, "response")}
          <ChevronRightIcon className="size-3.5" />
        </Link>
      )}
    </article>
  );
}

// Uses GET /projects/:projectId/surveys
export async function SurveyList({ projectId }: { projectId: string }) {
  const { items } = await api.listSurveys(projectId);
  if (items.length === 0) {
    return (
      <section className="rounded-[10px] border border-line bg-surface">
        <EmptyState title="No surveys connected">Connect a Google Form to start collecting feedback for this project.</EmptyState>
      </section>
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((s) => (
        <li key={s.id} className="flex">
          <SurveyCard survey={s} projectId={projectId} />
        </li>
      ))}
    </ul>
  );
}

export function SurveyListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-72 rounded-[10px]" />
    </div>
  );
}
