import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { plural } from "@/lib/format";
import { AsyncSlot } from "@/components/ui/AsyncSlot";
import { TopBar } from "@/components/shell/TopBar";
import { FeatureTable, FeatureTableSkeleton } from "@/components/features/FeatureTable";
import { FeatureToolbar } from "@/components/features/FeatureToolbar";
import { parseFeatureQuery } from "@/components/features/query";

export const metadata: Metadata = { title: "Features" };

export default async function FeaturesPage({ params, searchParams }: PageProps<"/projects/[projectId]/features">) {
  const { projectId } = await params;
  const query = parseFeatureQuery(await searchParams);
  const project = await orNotFound(api.getProject(projectId));
  const { features, responses } = project.counts;

  return (
    <>
      <TopBar crumbs={[{ label: project.name, href: `/projects/${project.id}` }, { label: "Features" }]} />
      <main className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Features</h1>
          <p className="text-[13px] text-muted">
            {features > 0
              ? `${plural(features, "feature")} AI found in ${plural(responses, "response")}`
              : "Features appear once AI reads the first survey responses"}
          </p>
        </div>
        <FeatureToolbar query={query} />
        <AsyncSlot title="Features" fallback={<FeatureTableSkeleton projectId={projectId} query={query} />}>
          <FeatureTable projectId={projectId} query={query} />
        </AsyncSlot>
      </main>
    </>
  );
}
