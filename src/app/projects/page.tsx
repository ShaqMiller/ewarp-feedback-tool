import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { formatDate, plural } from "@/lib/format";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/primitives";
import { Logo, UserBadge } from "@/components/shell/Sidebar";

export const metadata: Metadata = { title: "Projects" };

// Uses GET /projects
async function ProjectList() {
  const { items } = await api.listProjects();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/projects/${p.id}`}
            className="group flex h-full items-start gap-3 rounded-[10px] border border-line bg-surface p-4 transition-colors hover:border-cov-some"
          >
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold">{p.name}</h2>
              <p className="mt-1 text-xs text-muted">
                {plural(p.responseCount, "response")}
                {p.lastResponseAt ? ` · last response ${formatDate(p.lastResponseAt)}` : " · waiting for responses"}
              </p>
            </div>
            <ChevronRightIcon className="size-4 text-faint transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ProjectsPage() {
  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
        <Logo />
        <Suspense fallback={<Skeleton className="size-[26px] rounded-full" />}>
          <UserBadge compact />
        </Suspense>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Projects</h1>
          <p className="text-[13px] text-muted">Each project has its own surveys, vendors and features.</p>
        </div>
        <Suspense
          fallback={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-[74px] rounded-[10px]" />
              ))}
            </div>
          }
        >
          <ProjectList />
        </Suspense>
      </main>
    </div>
  );
}
