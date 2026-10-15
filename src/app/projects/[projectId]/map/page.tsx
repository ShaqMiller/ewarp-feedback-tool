import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";
import { SECTION_COPY, sectionPage } from "../sections";

export const metadata: Metadata = { title: SECTION_COPY.map.title };

export default async function MapPage({ params }: PageProps<"/projects/[projectId]/map">) {
  return <SectionPlaceholder {...await sectionPage(params, "map")} />;
}
