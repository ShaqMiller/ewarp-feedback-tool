"use client";

import Link from "next/link";
import { useState } from "react";
import type { DataSource } from "@/hooks/useFeedbackMap";
import { FeedbackMap } from "./FeedbackMap";

const SOURCES: { value: DataSource; label: string }[] = [
  { value: "mock", label: "Mock data" },
  { value: "live", label: "Live data" },
];

export function FeedbackPage() {
  const [source, setSource] = useState<DataSource>("mock");

  return (
    <main className="flex min-h-screen flex-col gap-8 p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-5">
          <h1 className="text-4xl font-bold text-[#f3f4f6]">The feedback map</h1>
          <Link href="/dechante" className="text-sm text-[#8b949e] hover:text-[#e6e8eb]">
            Dechante&apos;s view →
          </Link>
        </div>

        <div
          role="radiogroup"
          aria-label="Data source"
          className="flex rounded-full border border-[#262d38] bg-[#131820] p-1"
        >
          {SOURCES.map((s) => (
            <button
              key={s.value}
              role="radio"
              aria-checked={source === s.value}
              onClick={() => setSource(s.value)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                source === s.value ? "bg-[#262d38] text-[#f3f4f6]" : "text-[#8b949e] hover:text-[#c9d1d9]"
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: s.value === "mock" ? "#f0b429" : "#3fb96b" }}
              />
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {/* key: switching source remounts the map, so selection and panel history reset. */}
      <FeedbackMap key={source} source={source} />
    </main>
  );
}
