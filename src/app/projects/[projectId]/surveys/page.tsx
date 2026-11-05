import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { plural } from "@/lib/format";
import { AsyncSlot } from "@/components/ui/AsyncSlot";
import { TopBar } from "@/components/shell/TopBar";
import { RereadButton } from "@/components/responses/RereadButton";
import { SurveyList, SurveyListSkeleton } from "@/components/surveys/SurveyList";

export const metadata: Metadata = { title: "Surveys" };

export default async function SurveysPage({ params }: PageProps<"/projects/[projectId]/surveys">) {
  const { projectId } = await params;
  const [project, me] = await Promise.all([orNotFound(api.getProject(projectId)), api.getMe()]);

  return (
    <>
      <TopBar crumbs={[{ label: project.name, href: `/projects/${project.id}` }, { label: "Surveys" }]} />
      <main className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Surveys</h1>
            <p className="text-[13px] text-muted">
              {plural(project.counts.surveys, "survey")} collecting feedback for this project
            </p>
          </div>
          {me.role === "admin" && (
            <RereadButton projectId={projectId} label="Reread responses with no features" />
          )}
        </div>
        <AsyncSlot title="Surveys" fallback={<SurveyListSkeleton />}>
          <SurveyList projectId={projectId} admin={me.role === "admin"} />
        </AsyncSlot>
      </main>
    </>
  );
}
