import type { Metadata } from "next";
import Link from "next/link";
import { api, orNotFound } from "@/lib/api";
import { plural } from "@/lib/format";
import { AsyncSlot } from "@/components/ui/AsyncSlot";
import { XIcon } from "@/components/ui/icons";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { TopBar } from "@/components/shell/TopBar";
import { ResponseList, ResponsesSkeleton } from "@/components/responses/ResponseList";
import { parseResponseQuery, responsesHref, SORT_OPTIONS, STATUS_OPTIONS } from "@/components/responses/query";

export const metadata: Metadata = { title: "Responses" };

// Uses GET /projects/:projectId, /vendors?sort=name (vendor filter) and /surveys (survey filter label);
// the list itself streams in from /responses.
export default async function ResponsesPage({ params, searchParams }: PageProps<"/projects/[projectId]/responses">) {
  const { projectId } = await params;
  const query = parseResponseQuery(await searchParams);
  const [project, vendors, surveys] = await Promise.all([
    orNotFound(api.getProject(projectId)),
    api.listVendors(projectId, { sort: "name" }),
    api.listSurveys(projectId),
  ]);
  const base = `/projects/${projectId}/responses`;
  const survey = surveys.items.find((s) => s.id === query.survey);

  return (
    <>
      <TopBar crumbs={[{ label: project.name, href: `/projects/${project.id}` }, { label: "Responses" }]} />
      <main className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Responses</h1>
          <p className="text-[13px] text-muted">
            {project.counts.responses > 0
              ? `${plural(project.counts.responses, "response")} from ${plural(project.counts.surveys, "survey")}`
              : "Responses appear here as people fill in the survey"}
          </p>
        </div>

        <ListToolbar
          search={{ param: "q", value: query.q, placeholder: "Search answers", label: "Search response answers" }}
          resetParams={["page"]}
          selects={[
            {
              param: "vendor",
              label: "Vendor",
              value: query.vendor ?? "all",
              defaultValue: "all",
              options: [{ value: "all", label: "All vendors" }, ...vendors.items.map((v) => ({ value: v.id, label: v.name }))],
            },
            { param: "status", label: "AI status", value: query.status ?? "all", defaultValue: "all", options: STATUS_OPTIONS },
            { param: "sort", label: "Sort", value: query.sort, defaultValue: "newest", options: SORT_OPTIONS },
          ]}
        />

        {query.survey && (
          <div>
            <Link
              href={responsesHref(base, query, { survey: undefined })}
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-xs font-medium text-accent hover:bg-accent-soft/70"
            >
              Survey: {survey?.name ?? "Unknown survey"}
              <XIcon className="size-3.5" />
              <span className="sr-only">Remove survey filter</span>
            </Link>
          </div>
        )}

        <AsyncSlot title="Responses" fallback={<ResponsesSkeleton />}>
          <ResponseList projectId={projectId} query={query} />
        </AsyncSlot>
      </main>
    </>
  );
}
