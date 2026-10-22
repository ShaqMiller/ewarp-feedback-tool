import { api, orNotFound } from "@/lib/api";

// Copy for sections whose pages are not built yet.
export const SECTION_COPY = {
  insights: { title: "Insights", description: "Findings AI pulls from the responses, ranked by how many people they affect." },
} as const;

export async function sectionPage(params: Promise<{ projectId: string }>, section: keyof typeof SECTION_COPY) {
  const { projectId } = await params;
  const project = await orNotFound(api.getProject(projectId));
  const copy = SECTION_COPY[section];
  return {
    crumbs: [{ label: project.name, href: `/projects/${project.id}` }, { label: copy.title }],
    ...copy,
  };
}
