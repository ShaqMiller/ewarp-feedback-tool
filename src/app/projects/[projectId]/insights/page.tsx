import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";
import { SECTION_COPY, sectionPage } from "../sections";

export const metadata: Metadata = { title: SECTION_COPY.insights.title };

export default async function InsightsPage({ params }: PageProps<"/projects/[projectId]/insights">) {
  return <SectionPlaceholder {...await sectionPage(params, "insights")} />;
}
