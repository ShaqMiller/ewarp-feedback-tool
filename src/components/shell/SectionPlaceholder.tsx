import type { ReactNode } from "react";
import { TopBar, type Crumb } from "./TopBar";

// Holds a section's place in the app until its page is built.
export function SectionPlaceholder({
  crumbs,
  title,
  badges,
  description,
}: {
  crumbs: Crumb[];
  title: string;
  badges?: ReactNode;
  description: string;
}) {
  return (
    <>
      <TopBar crumbs={crumbs} />
      <main className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-semibold tracking-[-0.015em]">{title}</h1>
          {badges}
        </div>
        <section className="flex flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-line bg-surface px-6 py-16 text-center">
          <p className="text-[13.5px] font-semibold">This page is coming next</p>
          <p className="max-w-[44ch] text-xs text-muted">{description}</p>
        </section>
      </main>
    </>
  );
}
