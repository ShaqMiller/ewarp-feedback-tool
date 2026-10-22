"use client";

import Link from "next/link";
import type { ProjectListItem } from "@/lib/api/types";
import { cn, plural } from "@/lib/format";
import { CheckIcon, ChevronDownIcon, FolderIcon } from "@/components/ui/icons";
import { usePopover } from "@/components/ui/usePopover";

type Props = {
  current: { id: string; name: string };
  projects: ProjectListItem[] | null; // null while loading
  compact?: boolean; // mobile header version
};

export function ProjectSwitcher({ current, projects, compact }: Props) {
  const { open, toggle, close, rootRef, triggerRef } = usePopover();

  return (
    <div ref={rootRef} className={cn("relative", compact ? "min-w-0" : "mb-2.5")}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={!projects}
        aria-expanded={open}
        aria-controls="project-switcher"
        className={cn(
          "flex w-full items-center gap-2 text-left transition-colors",
          compact
            ? "min-w-0 rounded-md px-1.5 py-1 hover:bg-chip"
            : "rounded-lg border border-line bg-surface px-2.5 py-[7px] hover:border-cov-some",
        )}
      >
        <span className="min-w-0 flex-1">
          {!compact && <span className="block text-[11px] text-faint">Project</span>}
          <span className={cn("block font-semibold", compact ? "truncate text-[13px]" : "text-[13px] leading-snug")}>
            {current.name}
          </span>
        </span>
        <ChevronDownIcon className="size-[13px] text-faint" />
      </button>

      {open && projects && (
        <div
          id="project-switcher"
          className={cn(
            "absolute z-30 mt-1.5 w-[260px] overflow-hidden rounded-lg border border-line bg-surface shadow-[0_12px_32px_-12px_rgba(20,24,33,0.25)]",
            compact ? "left-0" : "left-0 right-0 w-auto",
          )}
        >
          <p className="px-3 pt-2.5 pb-1 text-[11px] font-medium text-faint">Switch project</p>
          <ul className="p-1">
            {projects.map((p) => {
              const isCurrent = p.id === current.id;
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    onClick={close}
                    aria-current={isCurrent ? "page" : undefined}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-chip"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{p.name}</span>
                      <span className="block text-[11.5px] text-muted">{plural(p.responseCount, "response")}</span>
                    </span>
                    {isCurrent && <CheckIcon className="size-4 text-accent" />}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/projects"
            onClick={close}
            className="flex items-center gap-2 border-t border-line px-3 py-2.5 text-[13px] font-medium text-muted hover:bg-chip hover:text-ink"
          >
            <FolderIcon className="size-4" />
            All projects
          </Link>
        </div>
      )}
    </div>
  );
}
