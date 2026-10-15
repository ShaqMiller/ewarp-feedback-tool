"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

// Tabs under the feature header. Each tab is its own route, so it can be linked to directly.
export function FeatureTabs({ base, responseCount }: { base: string; responseCount: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: base, label: "Overview", active: pathname === base },
    { href: `${base}/responses`, label: "Responses", count: responseCount, active: pathname.startsWith(`${base}/responses`) },
  ];
  return (
    <nav aria-label="Feature sections" className="flex gap-[22px] border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "-mb-px flex items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium transition-colors",
            t.active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="text-xs font-normal tabular-nums text-faint">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
