import { Suspense } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { DemoBadge, Logo, UserBadge } from "./Sidebar";

// Header for pages outside a project (the project list, New project).
export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Logo />
        <Suspense fallback={null}>
          <DemoBadge />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="size-[26px] rounded-full" />}>
        <UserBadge compact />
      </Suspense>
    </header>
  );
}
