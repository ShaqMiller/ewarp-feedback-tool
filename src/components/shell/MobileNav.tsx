"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import { FolderIcon, GearIcon, MoreIcon } from "@/components/ui/icons";
import { usePopover } from "@/components/ui/usePopover";
import { isActive, projectSections } from "./nav";

const TAB_LABELS = ["Dashboard", "Features", "Vendors", "Responses"];

// Bottom tab bar for phones and tablets; the sidebar takes over from the lg breakpoint.
export function MobileTabBar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { open, toggle, close, rootRef, triggerRef } = usePopover();
  const sections = projectSections(projectId);
  const tabs = sections.filter((s) => TAB_LABELS.includes(s.label));
  const more = [
    ...sections.filter((s) => !TAB_LABELS.includes(s.label)),
    { label: "All projects", href: "/projects", Icon: FolderIcon, exact: true },
    { label: "Settings", href: `/projects/${projectId}/settings`, Icon: GearIcon, exact: false },
  ];
  const moreActive = more.some((s) => isActive(pathname, s.href, s.exact));

  const tabClass = (active: boolean) =>
    cn(
      "flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors",
      active ? "text-accent" : "text-muted hover:text-ink",
    );

  return (
    <div ref={rootRef} className="lg:hidden">
      {open && (
        <div
          id="more-menu"
          className="fixed inset-x-3 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_40px_-12px_rgba(20,24,33,0.3)]"
        >
          <ul>
            {more.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  onClick={close}
                  aria-current={isActive(pathname, s.href, s.exact) ? "page" : undefined}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-ink hover:bg-chip aria-[current=page]:text-accent"
                >
                  <s.Icon className="size-[18px] text-muted" />
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <nav
        aria-label="Project"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface px-1 pt-1 pb-[calc(6px+env(safe-area-inset-bottom))]"
      >
        {tabs.map((s) => {
          const active = isActive(pathname, s.href, s.exact);
          return (
            <Link key={s.href} href={s.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
              <s.Icon className="size-5" />
              {s.label}
            </Link>
          );
        })}
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="more-menu"
          className={tabClass(open || moreActive)}
        >
          <MoreIcon className="size-5" />
          More
        </button>
      </nav>
    </div>
  );
}
