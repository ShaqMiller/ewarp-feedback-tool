import { api, orNotFound } from "@/lib/api";
import { RouteTabs } from "@/components/ui/RouteTabs";
import { TopBar } from "@/components/shell/TopBar";

// Shared by every settings section. More sections (project, surveys, access) become more tabs.
export default async function SettingsLayout({ children, params }: LayoutProps<"/projects/[projectId]/settings">) {
  const { projectId } = await params;
  const project = await orNotFound(api.getProject(projectId));
  const base = `/projects/${project.id}/settings`;

  return (
    <>
      <TopBar crumbs={[{ label: project.name, href: `/projects/${project.id}` }, { label: "Settings" }]} />
      <main className="flex flex-col gap-5 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Settings</h1>
            <p className="text-[13px] text-muted">Set up {project.name}.</p>
          </div>
          <RouteTabs
            base={base}
            label="Settings sections"
            tabs={[
              { segment: "vendors", label: "Vendors" },
              { segment: "data", label: "Data source" },
            ]}
          />
        </div>
        {children}
      </main>
    </>
  );
}
