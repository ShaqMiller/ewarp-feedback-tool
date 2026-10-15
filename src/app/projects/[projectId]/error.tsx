"use client";

import { useEffect } from "react";

export default function ProjectError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid flex-1 place-items-center px-4 py-20">
      <div role="alert" className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">This page didn&apos;t load</h1>
        <p className="mt-2 text-[13px] text-muted">We couldn&apos;t reach the data service. Try again in a moment.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-5 h-9 rounded-[7px] bg-ink px-4 text-[13px] font-medium text-surface"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
