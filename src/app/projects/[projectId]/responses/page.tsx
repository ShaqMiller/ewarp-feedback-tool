import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";
import { SECTION_COPY, sectionPage } from "../sections";

export const metadata: Metadata = { title: SECTION_COPY.responses.title };

export default async function ResponsesPage({ params }: PageProps<"/projects/[projectId]/responses">) {
  return <SectionPlaceholder {...await sectionPage(params, "responses")} />;
}
