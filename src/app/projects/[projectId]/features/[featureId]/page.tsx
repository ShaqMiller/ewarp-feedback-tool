import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import type { Coverage } from "@/lib/api/types";
import { plural } from "@/lib/format";
import { Pill } from "@/components/ui/primitives";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

const COVERAGE_LABEL: Record<Coverage, string> = {
  all: "Offered by all vendors",
  some: "Offered by some vendors",
  none: "Gap · no vendor offers this",
};

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]/features/[featureId]">): Promise<Metadata> {
  const { projectId, featureId } = await params;
  const feature = await api.getFeature(projectId, featureId).catch(() => null);
  return { title: feature?.name ?? "Feature" };
}

// Uses GET /projects/:projectId and GET /projects/:projectId/features/:featureId
export default async function FeaturePage({ params }: PageProps<"/projects/[projectId]/features/[featureId]">) {
  const { projectId, featureId } = await params;
  const [project, feature] = await Promise.all([
    orNotFound(api.getProject(projectId)),
    orNotFound(api.getFeature(projectId, featureId)),
  ]);

  return (
    <SectionPlaceholder
      crumbs={[
        { label: project.name, href: `/projects/${project.id}` },
        { label: "Features", href: `/projects/${project.id}/features` },
        { label: feature.name },
      ]}
      title={feature.name}
      badges={
        <>
          <Pill tone={feature.coverage === "none" ? "gap" : "neutral"}>{COVERAGE_LABEL[feature.coverage]}</Pill>
          <Pill>{plural(feature.mentions, "mention")}</Pill>
        </>
      }
      description="The full feature page (summary, responses, vendor coverage and connections) is the next thing we build."
    />
  );
}
