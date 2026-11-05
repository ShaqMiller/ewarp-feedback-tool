import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { ResetProject } from "@/components/settings/ResetProject";
import { resetProjectAction } from "./actions";

export const metadata: Metadata = { title: "Reset" };

// Uses POST /projects/:projectId/reset, after typing the project's name.
export default async function ResetSettingsPage({ params }: PageProps<"/projects/[projectId]/settings/reset">) {
  const { projectId } = await params;
  const project = await orNotFound(api.getProject(projectId));
  return (
    <ResetProject
      projectName={project.name}
      counts={{ responses: project.counts.responses, features: project.counts.features }}
      action={resetProjectAction.bind(null, projectId)}
    />
  );
}
