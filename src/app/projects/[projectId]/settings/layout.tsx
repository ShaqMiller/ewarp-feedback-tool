import { api, orNotFound } from "@/lib/api";
import { RouteTabs } from "@/components/ui/RouteTabs";
import { EmptyState } from "@/components/ui/primitives";
import { TopBar } from "@/components/shell/TopBar";

// Shared by every settings section. Admins only: a viewer who opens a settings link sees why it's empty.
export default async function SettingsLayout({ children, params }: LayoutProps<"/projects/[projectId]/settings">) {
  const { projectId } = await params;
  const [project, me] = await Promise.all([orNotFound(api.getProject(projectId)), api.getMe()]);
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
          {me.role === "admin" && (
            <RouteTabs
              base={base}
              label="Settings sections"
              tabs={[
                { segment: "vendors", label: "Vendors" },
                { segment: "weights", label: "Weights" },
                { segment: "users", label: "Users" },
                { segment: "data", label: "Data source" },
              ]}
            />
          )}
        </div>
        {me.role === "admin" ? (
          children
        ) : (
          <section className="rounded-[10px] border border-line bg-surface">
            <EmptyState title="Settings are for admins">
              You&apos;re signed in as a viewer, so you can see every project page but not change vendors, features, weights
              or users. Ask an admin if something needs changing.
            </EmptyState>
          </section>
        )}
      </main>
    </>
  );
}
