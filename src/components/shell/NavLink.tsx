"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { isActive } from "./nav";

type Props = {
  href: string;
  icon: ReactNode;
  count?: number;
  exact?: boolean;
  children: ReactNode;
};

export function NavLink({ href, icon, count, exact, children }: Props) {
  const active = isActive(usePathname(), href, exact);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-chip hover:text-ink",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
      {count !== undefined && <span className="ml-auto text-[11.5px] font-normal tabular-nums text-faint">{count}</span>}
    </Link>
  );
}
