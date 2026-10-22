import { redirect } from "next/navigation";

// Vendors is the first settings section.
export default async function SettingsPage({ params }: PageProps<"/projects/[projectId]/settings">) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/settings/vendors`);
}
