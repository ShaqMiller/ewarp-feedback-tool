"use client";

import { useActionState, useId, useState } from "react";
import type { ActionResult } from "@/lib/actions";
import { cn, plural } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { fieldClass } from "@/components/features/FeedbackFields";
import { FormMessage } from "./VendorSettings";

const DELETED = [
  "Survey responses and their original answers",
  "Features, and every like, dislike and want linked to them",
  "Feedback added by admins",
  "Which vendors offer which features",
  "AI summaries and the activity feed",
];
const KEPT = ["The project, its vendors and survey forms (new answers still come in)", "Users and group weights"];

// Clears the project's survey data for a clean demo. Typing the project name unlocks the button.
export function ResetProject({
  projectName,
  counts,
  action,
}: {
  projectName: string;
  counts: { responses: number; features: number };
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [typed, setTyped] = useState("");
  const [state, submit, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await action(prev, formData);
    if (result?.ok) setTyped(""); // locks the button again
    return result;
  }, null);
  const id = useId();
  const matches = typed.trim() === projectName.trim();

  return (
    <section className="flex max-w-[72ch] flex-col gap-4 rounded-[10px] border border-dislike/40 bg-surface p-4">
      <div>
        <h2 className="text-[15px] font-semibold">Start {projectName} from a clean slate</h2>
        <p className="mt-1 text-[13px] text-muted">
          Right now it has {plural(counts.responses, "response")} and {plural(counts.features, "feature")}. This deletes them
          for good. It can&apos;t be undone.
        </p>
      </div>
      <div className="grid gap-4 text-[13px] sm:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-xs font-medium text-dislike">Deleted</h3>
          <ul className="list-disc space-y-1 pl-4">
            {DELETED.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1.5 text-xs font-medium text-like">Kept</h3>
          <ul className="list-disc space-y-1 pl-4">
            {KEPT.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      </div>
      <form action={submit} className="grid gap-2 rounded-lg bg-dislike-soft/60 p-3">
        <label htmlFor={`${id}-confirm`} className="text-xs font-medium text-muted">
          Type <b className="font-semibold text-ink">{projectName}</b> to confirm
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`${id}-confirm`}
            name="confirm"
            autoComplete="off"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className={cn(fieldClass, "flex-1 sm:max-w-sm")}
          />
          <Button type="submit" variant="danger" disabled={!matches || pending}>
            {pending ? "Deleting…" : "Delete survey data"}
          </Button>
        </div>
        <FormMessage id={`${id}-msg`} state={state} />
      </form>
    </section>
  );
}
