import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";
import { SECTION_COPY, sectionPage } from "../sections";

export const metadata: Metadata = { title: SECTION_COPY.settings.title };

export default async function SettingsPage({ params }: PageProps<"/projects/[projectId]/settings">) {
  return <SectionPlaceholder {...await sectionPage(params, "settings")} />;
}
