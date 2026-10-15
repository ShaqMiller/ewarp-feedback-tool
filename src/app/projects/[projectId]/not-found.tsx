"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

// Shown inside the project shell when a feature, vendor or other item ID doesn't exist in this project.
export default function ProjectItemNotFound() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <main className="grid flex-1 place-items-center px-4 py-20">
      <div className="max-w-sm text-center">
        <p className="text-xs font-medium text-faint">404</p>
        <h1 className="mt-1 text-lg font-semibold">We couldn&apos;t find that item</h1>
        <p className="mt-2 text-[13px] text-muted">It may have been removed, or it belongs to a different project.</p>
        <Link
          href={`/projects/${projectId}`}
          className="mt-5 inline-flex h-9 items-center rounded-[7px] bg-ink px-4 text-[13px] font-medium text-surface"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
