import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { plural } from "@/lib/format";
import { AsyncSlot } from "@/components/ui/AsyncSlot";
import { TopBar } from "@/components/shell/TopBar";
import { FeatureTable, FeatureTableSkeleton } from "@/components/features/FeatureTable";
import { FEATURE_SORTS, parseFeatureQuery } from "@/components/features/query";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { AddFeature } from "@/components/features/AddFeature";

export const metadata: Metadata = { title: "Features" };

export default async function FeaturesPage({ params, searchParams }: PageProps<"/projects/[projectId]/features">) {
  const { projectId } = await params;
  const query = parseFeatureQuery(await searchParams);
  const [project, me] = await Promise.all([orNotFound(api.getProject(projectId)), api.getMe()]);
  const { features, responses } = project.counts;
  // Admins get "Add feature", which needs the vendor list for "who offers it".
  const vendors = me.role === "admin" ? (await api.listVendors(projectId, { sort: "name" })).items : null;

  return (
    <>
      <TopBar crumbs={[{ label: project.name, href: `/projects/${project.id}` }, { label: "Features" }]} />
      <main className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Features</h1>
            <p className="text-[13px] text-muted">
              {features > 0
                ? `${plural(features, "feature")} from ${plural(responses, "survey response")} and admins`
                : "Features appear once AI reads the first survey responses, or when an admin adds one"}
            </p>
          </div>
          {vendors && <AddFeature projectId={project.id} vendors={vendors.map((v) => ({ id: v.id, name: v.name }))} />}
        </div>
        <ListToolbar
          search={{ param: "q", value: query.q, placeholder: "Search features", label: "Search features" }}
          selects={[{ param: "sort", label: "Sort by", value: query.sort, defaultValue: "mentions", options: FEATURE_SORTS }]}
        />
        <AsyncSlot title="Features" fallback={<FeatureTableSkeleton projectId={projectId} query={query} />}>
          <FeatureTable projectId={projectId} query={query} />
        </AsyncSlot>
      </main>
    </>
  );
}
