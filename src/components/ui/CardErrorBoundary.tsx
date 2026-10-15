"use client";

import { catchError, type ErrorInfo } from "next/error";

// Error boundary for one card, so a failed endpoint doesn't take down the whole page.
function CardError({ title }: { title: string }, { retry }: ErrorInfo) {
  return (
    <section role="alert" className="flex min-h-32 flex-col items-start justify-center gap-2 rounded-[10px] border border-line bg-surface p-4">
      <p className="text-[13.5px] font-semibold">{title}</p>
      <p className="text-xs text-muted">This section didn&apos;t load. Check your connection and try again.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-1 h-[30px] rounded-[7px] border border-line px-3 text-[12.5px] font-medium transition-colors hover:bg-chip"
      >
        Try again
      </button>
    </section>
  );
}

export const CardErrorBoundary = catchError(CardError);
