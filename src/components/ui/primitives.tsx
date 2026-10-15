import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function Skeleton({ className = "" }: { className?: string }) {
  // Default radius only when the caller doesn't set one, since both classes would otherwise conflict.
  const radius = className.includes("rounded") ? "" : "rounded-md";
  return <div aria-hidden="true" className={cn(radius, "bg-chip motion-safe:animate-pulse", className)} />;
}

const PILL_TONES = {
  neutral: "bg-chip text-muted",
  accent: "bg-accent-soft text-accent",
  like: "bg-like-soft text-like",
  dislike: "bg-dislike-soft text-dislike",
  want: "bg-want-soft text-want",
  gap: "bg-gap-soft text-gap",
};

export function Pill({ tone = "neutral", children }: { tone?: keyof typeof PILL_TONES; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11.5px] font-medium",
        PILL_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-8 text-center">
      <p className="text-[13px] font-medium">{title}</p>
      {children && <p className="max-w-[32ch] text-xs text-muted">{children}</p>}
    </div>
  );
}
