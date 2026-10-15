import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";
import { SECTION_COPY, sectionPage } from "../sections";

export const metadata: Metadata = { title: SECTION_COPY.features.title };

export default async function FeaturesPage({ params }: PageProps<"/projects/[projectId]/features">) {
  return <SectionPlaceholder {...await sectionPage(params, "features")} />;
}
