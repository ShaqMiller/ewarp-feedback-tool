"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

export type RouteTab = { segment: string; label: string; count?: number }; // segment "" = the base route

// Tabs where each tab is its own route under `base`, so every tab can be linked to directly.
export function RouteTabs({ base, tabs, label }: { base: string; tabs: RouteTab[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex gap-[22px] border-b border-line">
      {tabs.map((t) => {
        const href = t.segment ? `${base}/${t.segment}` : base;
        const active = t.segment ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors",
              active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="text-xs font-normal tabular-nums text-faint">{t.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
