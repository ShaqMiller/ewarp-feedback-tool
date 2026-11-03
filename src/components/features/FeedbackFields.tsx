"use client";

import { useId } from "react";
import { RESPONDENT_GROUP_LABELS, RESPONDENT_GROUPS, type RespondentGroup, type Sentiment } from "@/lib/api/types";
import { cn } from "@/lib/format";

export const fieldClass =
  "h-[34px] w-full min-w-0 rounded-[7px] border border-line bg-surface px-2.5 text-[13px] placeholder:text-faint";

export type FeedbackDraft = { key: string; kind: Sentiment; group: RespondentGroup; vendorId: string; note: string };
let drafts = 0;
export const newDraft = (): FeedbackDraft => ({ key: `fb-${++drafts}`, kind: "want", group: "pm", vendorId: "", note: "" });

const KIND_OPTIONS: { value: Sentiment; label: string }[] = [
  { value: "want", label: "Want" },
  { value: "like", label: "Like" },
  { value: "dislike", label: "Dislike" },
];
const KIND_ON: Record<Sentiment, string> = {
  want: "aria-checked:bg-want-soft aria-checked:text-want aria-checked:border-want",
  like: "aria-checked:bg-like-soft aria-checked:text-like aria-checked:border-like",
  dislike: "aria-checked:bg-dislike-soft aria-checked:text-dislike aria-checked:border-dislike",
};

// The fields of one manual like / dislike / want. `prefix` names the inputs (fb.kind, fb.group …) so a form can hold several.
export function FeedbackFields({
  draft,
  onChange,
  vendors,
  prefix = "",
}: {
  draft: FeedbackDraft;
  onChange: (next: FeedbackDraft) => void;
  vendors: { id: string; name: string }[];
  prefix?: string;
}) {
  const id = useId();
  const set = <K extends keyof FeedbackDraft>(key: K, value: FeedbackDraft[K]) => onChange({ ...draft, [key]: value });
  const label = "grid gap-1 text-xs text-muted";
  return (
    <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
      <input type="hidden" name={`${prefix}kind`} value={draft.kind} />
      <div className={label}>
        <span id={`${id}-kind`}>What they said</span>
        <div role="radiogroup" aria-labelledby={`${id}-kind`} className="flex gap-1">
          {KIND_OPTIONS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={draft.kind === k.value}
              onClick={() => set("kind", k.value)}
              className={cn(
                "h-[34px] rounded-[7px] border border-line px-3 text-[12.5px] font-medium text-muted hover:bg-chip",
                KIND_ON[k.value],
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>
      <label className={label}>
        Who said it
        <select
          name={`${prefix}group`}
          value={draft.group}
          onChange={(e) => set("group", e.target.value as RespondentGroup)}
          className={fieldClass}
        >
          {RESPONDENT_GROUPS.map((g) => (
            <option key={g} value={g}>
              {RESPONDENT_GROUP_LABELS[g]}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        About which vendor
        <select name={`${prefix}vendorId`} value={draft.vendorId} onChange={(e) => set("vendorId", e.target.value)} className={fieldClass}>
          <option value="">No one vendor</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label className={cn(label, "sm:col-span-3")}>
        Note (optional)
        <input
          name={`${prefix}note`}
          maxLength={1000}
          autoComplete="off"
          placeholder="Where it came from, e.g. sponsor review on Oct 30"
          value={draft.note}
          onChange={(e) => set("note", e.target.value)}
          className={fieldClass}
        />
      </label>
      {draft.vendorId && draft.kind !== "want" && (
        <p className="text-[11.5px] text-muted sm:col-span-3">
          A {draft.kind} about a vendor also marks that vendor as offering the feature.
        </p>
      )}
    </div>
  );
}
