import { api, orNotFound } from "@/lib/api";

// Copy for sections whose pages are not built yet.
export const SECTION_COPY = {
  insights: { title: "Insights", description: "Findings AI pulls from the responses, ranked by how many people they affect." },
  features: { title: "Features", description: "Every feature AI found in the responses, with vendor coverage and feedback." },
  vendors: { title: "Vendors", description: "Each vendor's coverage of requested features and what its users said." },
  responses: { title: "Responses", description: "Every survey response, with the features AI linked to it." },
  surveys: { title: "Surveys", description: "The surveys collecting feedback for this project and their response counts." },
  map: { title: "Relationship map", description: "How responses, features and vendors connect, with filters for each." },
  settings: { title: "Settings", description: "Project name, vendors, survey connections and who has access." },
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
