import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { TopBar } from "@/components/shell/TopBar";
import { FeatureHeader } from "@/components/features/detail/FeatureHeader";
import { RouteTabs } from "@/components/ui/RouteTabs";

type Props = LayoutProps<"/projects/[projectId]/features/[featureId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId, featureId } = await params;
  const feature = await api.getFeature(projectId, featureId).catch(() => null);
  return { title: feature?.name ?? "Feature" };
}

// Shared by the Overview and Responses tabs.
// Uses GET /projects/:projectId, /features/:featureId and /features/:featureId/responses (for the tab count).
export default async function FeatureLayout({ children, params }: Props) {
  const { projectId, featureId } = await params;
  const [project, feature, responses] = await Promise.all([
    orNotFound(api.getProject(projectId)),
    orNotFound(api.getFeature(projectId, featureId)),
    orNotFound(api.listFeatureResponses(projectId, featureId)),
  ]);
  const base = `/projects/${project.id}/features/${feature.id}`;

  return (
    <>
      <TopBar
        crumbs={[
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Features", href: `/projects/${project.id}/features` },
          { label: feature.name },
        ]}
      />
      <main className="flex flex-col gap-5 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div className="flex flex-col gap-4">
          <FeatureHeader feature={feature} vendorCount={project.counts.vendors} />
          <RouteTabs
            base={base}
            label="Feature sections"
            tabs={[
              { segment: "", label: "Overview" },
              { segment: "responses", label: "Responses", count: responses.total },
            ]}
          />
        </div>
        {children}
      </main>
    </>
  );
}
