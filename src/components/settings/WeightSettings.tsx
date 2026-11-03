"use client";

import { useActionState, useId, useState } from "react";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { EmptyState, Pill } from "@/components/ui/primitives";
import { FormMessage } from "./VendorSettings";

export type WeightRow = { id: string; label: string; tag?: string; weight: number };

// Named stops for the weight input; any number from 0 to 10 works.
const PRESETS = [
  { value: 0, label: "Ignore" },
  { value: 0.5, label: "Low" },
  { value: 1, label: "Normal" },
  { value: 2, label: "High" },
  { value: 3, label: "Critical" },
];

function WeightInput({ row, value, onChange }: { row: WeightRow; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2.5 last:border-b-0">
      <label htmlFor={id} className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
        <span className="truncate">{row.label}</span>
        {row.tag && <Pill tone="accent">{row.tag}</Pill>}
      </label>
      <div className="flex items-center gap-1.5">
        <div className="hidden gap-1 sm:flex" role="group" aria-label={`Quick weights for ${row.label}`}>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(String(p.value))}
              aria-pressed={Number(value) === p.value}
              className="h-[26px] rounded-md px-2 text-[11.5px] font-medium text-muted hover:bg-chip hover:text-ink aria-pressed:bg-ink aria-pressed:text-surface"
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          id={id}
          name={`weight:${row.id}`}
          type="number"
          inputMode="decimal"
          min={0}
          max={10}
          step={0.5}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[30px] w-[68px] rounded-[7px] border border-line bg-surface px-2 text-right text-[13px] tabular-nums"
        />
      </div>
    </li>
  );
}

export function WeightSettings({
  title,
  description,
  rows,
  empty,
  action,
}: {
  title: string;
  description: string;
  rows: WeightRow[];
  empty: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [values, setValues] = useState(() => Object.fromEntries(rows.map((r) => [r.id, String(r.weight)])));
  const [state, save, saving] = useActionState(action, null);
  const id = useId();
  // Rows added since this page loaded (a new feature) start at their saved weight.
  const valueOf = (r: WeightRow) => values[r.id] ?? String(r.weight);
  const changed = rows.some((r) => Number(valueOf(r)) !== r.weight);

  return (
    <section className="rounded-[10px] border border-line bg-surface">
      <header className="grid gap-1 border-b border-line p-4">
        <h2 className="text-[13.5px] font-semibold">{title}</h2>
        <p className="max-w-[72ch] text-xs text-muted">{description}</p>
      </header>
      {rows.length === 0 ? (
        <EmptyState title="Nothing to weigh yet">{empty}</EmptyState>
      ) : (
        <form action={save}>
          <ul>
            {rows.map((r) => (
              <WeightInput key={r.id} row={r} value={valueOf(r)} onChange={(v) => setValues((s) => ({ ...s, [r.id]: v }))} />
            ))}
          </ul>
          <div className={cn("flex flex-wrap items-center gap-2 border-t border-line p-4")}>
            <Button type="submit" variant="primary" disabled={saving || !changed}>
              {saving ? "Saving…" : "Save weights"}
            </Button>
            {changed && (
              <Button onClick={() => setValues(Object.fromEntries(rows.map((r) => [r.id, String(r.weight)])))}>Undo changes</Button>
            )}
            <FormMessage id={`${id}-msg`} state={state} />
          </div>
        </form>
      )}
    </section>
  );
}
