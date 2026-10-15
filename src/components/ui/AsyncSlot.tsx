import { Suspense, type ReactNode } from "react";
import { CardErrorBoundary } from "./CardErrorBoundary";

// Streams one data-backed section: shows `fallback` while it loads and a retryable error card if it fails.
export function AsyncSlot({ title, fallback, children }: { title: string; fallback: ReactNode; children: ReactNode }) {
  return (
    <CardErrorBoundary title={title}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </CardErrorBoundary>
  );
}
