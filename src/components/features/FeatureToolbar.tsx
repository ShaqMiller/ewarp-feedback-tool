"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { FeatureSort } from "@/lib/api/types";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import { FEATURE_SORTS, featuresHref, type FeaturePageQuery } from "./query";

// Search and sort for the Features page. Both write to the URL; the server re-renders the table.
export function FeatureToolbar({ query }: { query: FeaturePageQuery }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(query.q);
  const [prevQ, setPrevQ] = useState(query.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync the box when the search is cleared from elsewhere (e.g. "Clear search" in the empty state).
  if (query.q !== prevQ) {
    setPrevQ(query.q);
    if (query.q === "") setValue("");
  }

  const go = (patch: Partial<FeaturePageQuery>) =>
    startTransition(() => router.replace(featuresHref(pathname, query, patch), { scroll: false }));

  const search = (next: string) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: next.trim() }), 250);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
        <label htmlFor="feature-search" className="sr-only">
          Search features
        </label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-[15px] -translate-y-1/2 text-faint" />
        <input
          id="feature-search"
          type="search"
          value={value}
          onChange={(e) => search(e.target.value)}
          placeholder="Search features"
          autoComplete="off"
          className="h-[34px] w-full rounded-[7px] border border-line bg-surface pr-8 pl-8 text-[13px] placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => search("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded text-faint hover:text-ink"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {pending && <span className="text-xs text-faint">Updating…</span>}
        <label htmlFor="feature-sort" className="text-xs text-muted">
          Sort by
        </label>
        <select
          id="feature-sort"
          value={query.sort}
          onChange={(e) => go({ sort: e.target.value as FeatureSort })}
          className="h-[34px] rounded-[7px] border border-line bg-surface px-2.5 text-[13px] font-medium"
        >
          {FEATURE_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
