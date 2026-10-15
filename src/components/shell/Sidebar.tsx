import Link from "next/link";
import { Suspense } from "react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/api/types";
import { FolderIcon, GearIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/primitives";
import { NavLink } from "./NavLink";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { projectSections } from "./nav";

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/projects" className="flex items-center gap-2.5 rounded-md text-[14px] font-semibold">
      <span className="grid size-6 place-items-center rounded-[7px] bg-ink text-[13px] font-bold text-surface">e</span>
      {!compact && "eWARP"}
    </Link>
  );
}

// Loads the project list for the switcher without blocking the rest of the sidebar.
export async function ProjectSwitcherLoader({ current, compact }: { current: Project; compact?: boolean }) {
  const { items } = await api.listProjects();
  return <ProjectSwitcher current={current} projects={items} compact={compact} />;
}

export async function UserBadge({ compact }: { compact?: boolean }) {
  const me = await api.getMe();
  const initials = me.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatar = (
    <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-chip text-[10.5px] font-semibold text-muted">
      {initials}
    </span>
  );
  if (compact) return <span title={me.name}>{avatar}</span>;
  return (
    <div className="mt-2 flex items-center gap-2.5 border-t border-line px-2 pt-2.5">
      {avatar}
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{me.name}</p>
        <p className="text-[11px] text-faint">{me.role}</p>
      </div>
    </div>
  );
}

export function Sidebar({ project }: { project: Project }) {
  const sections = projectSections(project.id);
  const group = (name: string) =>
    sections
      .filter((s) => s.group === name)
      .map((s) => (
        <li key={s.href}>
          <NavLink
            href={s.href}
            exact={s.exact}
            icon={<s.Icon className="size-[15px]" />}
            count={s.count ? project.counts[s.count] : undefined}
          >
            {s.label}
          </NavLink>
        </li>
      ));

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-sidebar px-2.5 py-3.5 lg:flex">
      <div className="px-2 pt-0.5 pb-3.5">
        <Logo />
      </div>
      <Suspense fallback={<ProjectSwitcher current={project} projects={null} />}>
        <ProjectSwitcherLoader current={project} />
      </Suspense>

      <nav aria-label="Project" className="flex flex-col">
        <ul className="flex flex-col gap-px">{group("Project")}</ul>
        <h2 className="px-2 pt-3.5 pb-1 text-[11px] font-medium text-faint">Data</h2>
        <ul className="flex flex-col gap-px">{group("Data")}</ul>
        <h2 className="px-2 pt-3.5 pb-1 text-[11px] font-medium text-faint">Explore</h2>
        <ul className="flex flex-col gap-px">{group("Explore")}</ul>
      </nav>

      <div className="flex-1" />
      <ul className="flex flex-col gap-px">
        <li>
          <NavLink href="/projects" exact icon={<FolderIcon className="size-[15px]" />}>
            All projects
          </NavLink>
        </li>
        <li>
          <NavLink href={`/projects/${project.id}/settings`} icon={<GearIcon className="size-[15px]" />}>
            Settings
          </NavLink>
        </li>
      </ul>
      <Suspense fallback={<Skeleton className="mt-2 h-[38px]" />}>
        <UserBadge />
      </Suspense>
    </aside>
  );
}
