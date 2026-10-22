import { Suspense } from "react";
import { api, orNotFound } from "@/lib/api";
import { ProjectSwitcher } from "@/components/shell/ProjectSwitcher";
import { DemoBadge, Logo, ProjectSwitcherLoader, Sidebar, UserBadge } from "@/components/shell/Sidebar";
import { MobileTabBar } from "@/components/shell/MobileNav";

// Uses GET /projects/:projectId for the sidebar counts; 404s if the project doesn't exist.
export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await orNotFound(api.getProject(projectId));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar project={project} />
      <div className="flex min-w-0 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-surface px-4 lg:hidden">
          <Logo compact />
          <Suspense fallback={null}>
            <DemoBadge projectId={project.id} />
          </Suspense>
          <Suspense fallback={<ProjectSwitcher current={project} projects={null} compact />}>
            <ProjectSwitcherLoader current={project} compact />
          </Suspense>
          <div className="flex-1" />
          <Suspense fallback={null}>
            <UserBadge compact />
          </Suspense>
        </header>
        {children}
      </div>
      <MobileTabBar projectId={project.id} />
    </div>
  );
}
