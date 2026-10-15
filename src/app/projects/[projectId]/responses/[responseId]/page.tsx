import type { Metadata } from "next";
import Link from "next/link";
import { api, orNotFound } from "@/lib/api";
import { GROUP_LABELS } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { EmptyState, Pill } from "@/components/ui/primitives";
import { TopBar } from "@/components/shell/TopBar";
import { ShowInMapLink } from "@/components/map/ShowInMapLink";
import { KIND_LABEL, ResponseCard } from "@/components/responses/ResponseCard";

type Props = PageProps<"/projects/[projectId]/responses/[responseId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId, responseId } = await params;
  const r = await api.getResponse(projectId, responseId).catch(() => null);
  return { title: r ? `Response from ${GROUP_LABELS[r.group]}` : "Response" };
}

// Uses GET /projects/:projectId and /responses/:responseId
export default async function ResponsePage({ params }: Props) {
  const { projectId, responseId } = await params;
  const [project, response] = await Promise.all([
    orNotFound(api.getProject(projectId)),
    orNotFound(api.getResponse(projectId, responseId)),
  ]);
  const kinds = [...new Set(response.mentions.map((m) => m.kind))];
  const details = [
    { label: "Vendor", value: <Link href={`/projects/${projectId}/vendors/${response.vendor.id}`} className="font-medium hover:underline">{response.vendor.name}</Link> },
    { label: "Group", value: GROUP_LABELS[response.group] },
    { label: "Submitted", value: formatDate(response.submittedAt) },
    {
      label: "Survey",
      value: (
        <Link href={`/projects/${projectId}/responses?survey=${response.survey.id}`} className="font-medium hover:underline">
          {response.survey.name}
        </Link>
      ),
    },
  ];

  return (
    <>
      <TopBar
        crumbs={[
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Responses", href: `/projects/${project.id}/responses` },
          { label: `${GROUP_LABELS[response.group]} · ${formatDate(response.submittedAt)}` },
        ]}
      />
      <main className="flex flex-col gap-5 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Response from {GROUP_LABELS[response.group]}</h1>
          <Pill tone={response.analyzed ? "like" : "accent"}>{response.analyzed ? "Read by AI" : "Waiting for AI"}</Pill>
          <div className="ml-auto">
            <ShowInMapLink projectId={projectId} focusId={response.id} />
          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
          <ResponseCard response={response} projectId={projectId} highlight={kinds} showVendor={false} linked={false} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <Card title="Linked features">
              {response.mentions.length === 0 ? (
                <EmptyState title={response.analyzed ? "No features linked" : "Waiting for AI"}>
                  {response.analyzed
                    ? "AI didn't find a specific feature in this response."
                    : "Features appear here once AI has read this response."}
                </EmptyState>
              ) : (
                <ul className="-mx-2">
                  {response.mentions.map((m) => (
                    <li key={`${m.feature.id}-${m.kind}`} className="border-b border-line last:border-b-0">
                      <Link
                        href={`/projects/${projectId}/features/${m.feature.id}`}
                        className="my-px flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors hover:bg-chip"
                      >
                        <span className="min-w-0 flex-1 truncate font-semibold">{m.feature.name}</span>
                        {m.coverage === "none" && <Pill tone="gap">Gap</Pill>}
                        <Pill tone={m.kind}>{KIND_LABEL[m.kind]}</Pill>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Details">
              <dl className="grid gap-2.5 text-[13px]">
                {details.map((d) => (
                  <div key={d.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-xs text-muted">{d.label}</dt>
                    <dd className="text-right">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
