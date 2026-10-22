import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import { AppHeader } from "@/components/shell/AppHeader";
import { NewProjectForm } from "@/components/projects/NewProjectForm";

export const metadata: Metadata = { title: "New project" };

// Uses POST /projects (through createProjectAction), then opens the new project's dashboard.
export default function NewProjectPage() {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs text-muted">
            <Link href="/projects" className="rounded hover:text-ink">
              Projects
            </Link>
            <ChevronRightIcon className="size-3" />
            <span aria-current="page">New project</span>
          </nav>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em]">New project</h1>
          <p className="text-[13px] text-muted">Set up an evaluation and the vendors whose feedback you&apos;ll collect.</p>
        </div>
        <NewProjectForm />
      </main>
    </div>
  );
}
