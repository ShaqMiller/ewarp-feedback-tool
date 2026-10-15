import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";
import { SECTION_COPY, sectionPage } from "../sections";

export const metadata: Metadata = { title: SECTION_COPY.vendors.title };

export default async function VendorsPage({ params }: PageProps<"/projects/[projectId]/vendors">) {
  return <SectionPlaceholder {...await sectionPage(params, "vendors")} />;
}
