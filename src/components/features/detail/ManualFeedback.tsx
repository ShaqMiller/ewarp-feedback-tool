"use client";

import { useActionState, useId, useState } from "react";
import type { ActionResult } from "@/lib/actions";
import { RESPONDENT_GROUP_LABELS, type FeedbackEntry } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/primitives";
import { FormMessage } from "@/components/settings/VendorSettings";
import { Quote } from "@/components/responses/Quote";
import { KIND_LABEL } from "@/components/responses/ResponseCard";
import { addFeedbackAction, deleteFeedbackAction } from "@/app/projects/[projectId]/features/actions";
import { FeedbackFields, newDraft } from "../FeedbackFields";

type Props = {
  projectId: string;
  featureId: string;
  entries: FeedbackEntry[];
  vendors: { id: string; name: string }[];
  admin: boolean;
};

function AddFeedbackForm({ projectId, featureId, vendors, onDone }: Omit<Props, "entries" | "admin"> & { onDone: () => void }) {
  const [draft, setDraft] = useState(newDraft);
  const [state, action, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const result = await addFeedbackAction(projectId, featureId, prev, fd);
    if (result?.ok) onDone();
    return result;
  }, null);
  const id = useId();
  return (
    <form action={action} className="grid gap-3 rounded-lg bg-sidebar p-3">
      <FeedbackFields draft={draft} onChange={setDraft} vendors={vendors} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Adding…" : "Add feedback"}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
        <FormMessage id={`${id}-msg`} state={state} />
      </div>
    </form>
  );
}

function Entry({ projectId, featureId, entry, admin }: { projectId: string; featureId: string; entry: FeedbackEntry; admin: boolean }) {
  const [state, remove, removing] = useActionState(async () => deleteFeedbackAction(projectId, featureId, entry.id), null);
  const meta = [
    KIND_LABEL[entry.kind],
    RESPONDENT_GROUP_LABELS[entry.group],
    entry.vendor?.name ?? "No one vendor",
    entry.createdBy ? `added by ${entry.createdBy.name}` : null,
    formatDate(entry.createdAt),
  ].filter(Boolean);
  return (
    <div className="flex items-start gap-2">
      <ul className="min-w-0 flex-1">
        <Quote kind={entry.kind} text={entry.note || "No note"}>
          {meta.join(" · ")}
        </Quote>
      </ul>
      {admin && (
        <form action={remove} className="flex items-center gap-1">
          {state?.ok === false && <FormMessage id={`${entry.id}-msg`} state={state} />}
          <button
            type="submit"
            disabled={removing}
            aria-label={`Remove this ${KIND_LABEL[entry.kind].toLowerCase()}`}
            title="Remove"
            className="grid size-7 place-items-center rounded-md text-faint hover:bg-chip hover:text-dislike disabled:opacity-50"
          >
            <XIcon className="size-4" />
          </button>
        </form>
      )}
    </div>
  );
}

// The likes / dislikes / wants admins entered by hand for this feature. They count in every total and in vendor scores.
export function ManualFeedback({ projectId, featureId, entries, vendors, admin }: Props) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-3.5">
      {entries.length === 0 && !adding && (
        <EmptyState title="No manual feedback">
          {admin ? "Add a want, like or dislike that came from outside the surveys." : "Admins can add feedback from outside the surveys here."}
        </EmptyState>
      )}
      {entries.map((e) => (
        <Entry key={e.id} projectId={projectId} featureId={featureId} entry={e} admin={admin} />
      ))}
      {admin &&
        (adding ? (
          <AddFeedbackForm projectId={projectId} featureId={featureId} vendors={vendors} onDone={() => setAdding(false)} />
        ) : (
          <div>
            <Button onClick={() => setAdding(true)}>
              <PlusIcon className="size-[14px]" />
              Add feedback
            </Button>
          </div>
        ))}
    </div>
  );
}
