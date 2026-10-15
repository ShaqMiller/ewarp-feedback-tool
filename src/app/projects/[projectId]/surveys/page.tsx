import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";
import { SECTION_COPY, sectionPage } from "../sections";

export const metadata: Metadata = { title: SECTION_COPY.surveys.title };

export default async function SurveysPage({ params }: PageProps<"/projects/[projectId]/surveys">) {
  return <SectionPlaceholder {...await sectionPage(params, "surveys")} />;
}
