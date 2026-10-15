import Link from "next/link";
import { cn } from "@/lib/format";

export type FilterChip = { label: string; href: string; active: boolean; count?: number };

// A row of link chips that filter a list through the URL.
export function FilterChips({ label, chips }: { label: string; chips: FilterChip[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          scroll={false}
          aria-current={c.active ? "page" : undefined}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            c.active ? "border-ink bg-ink text-surface" : "border-line bg-surface text-muted hover:text-ink",
          )}
        >
          {c.label}
          {c.count !== undefined && (
            <span className={cn("tabular-nums", c.active ? "text-surface/70" : "text-faint")}>{c.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
