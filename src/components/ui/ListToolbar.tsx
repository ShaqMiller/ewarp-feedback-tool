"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { SearchIcon, XIcon } from "./icons";

export type ToolbarSelect = {
  param: string; // URL search param it writes
  label: string;
  value: string;
  defaultValue: string; // dropped from the URL when chosen
  options: { value: string; label: string }[];
};

type Props = {
  search: { param: string; value: string; placeholder: string; label: string };
  selects: ToolbarSelect[];
  resetParams?: string[]; // params to clear on any change (e.g. "page")
};

// Search box plus dropdowns for a list page. Everything lives in the URL, so the server renders the
// list and views can be shared; other params already in the URL (tabs, chips) are kept.
export function ListToolbar({ search, selects, resetParams = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(search.value);
  const [prevValue, setPrevValue] = useState(search.value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync the box when the search is cleared from elsewhere (e.g. a "Clear search" link).
  if (search.value !== prevValue) {
    setPrevValue(search.value);
    if (search.value === "") setText("");
  }

  const set = (param: string, value: string, defaultValue = "") => {
    const params = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) params.delete(param);
    else params.set(param, value);
    for (const p of resetParams) params.delete(p);
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false }));
  };

  const onSearch = (next: string) => {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => set(search.param, next.trim()), 250);
  };

  const fieldId = (param: string) => `list-${param}`;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
        <label htmlFor={fieldId(search.param)} className="sr-only">
          {search.label}
        </label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-[15px] -translate-y-1/2 text-faint" />
        <input
          id={fieldId(search.param)}
          type="search"
          value={text}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={search.placeholder}
          autoComplete="off"
          className="h-[34px] w-full rounded-[7px] border border-line bg-surface pr-8 pl-8 text-[13px] placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded text-faint hover:text-ink"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {pending && <span className="text-xs text-faint">Updating…</span>}
        {selects.map((s) => (
          <div key={s.param} className="flex items-center gap-2">
            <label htmlFor={fieldId(s.param)} className="text-xs text-muted">
              {s.label}
            </label>
            <select
              id={fieldId(s.param)}
              value={s.value}
              onChange={(e) => set(s.param, e.target.value, s.defaultValue)}
              className="h-[34px] max-w-44 rounded-[7px] border border-line bg-surface px-2.5 text-[13px] font-medium"
            >
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
