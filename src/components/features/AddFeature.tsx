"use client";

import { useActionState, useId, useState } from "react";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { FormMessage } from "@/components/settings/VendorSettings";
import { createFeatureAction } from "@/app/projects/[projectId]/features/actions";
import { FeedbackFields, fieldClass, newDraft, type FeedbackDraft } from "./FeedbackFields";

type Vendor = { id: string; name: string };

// "Add feature" on the Features page (admins only). A manual feature can be offered by vendors and carry
// likes / dislikes / wants from outside the surveys; they count the same as survey answers.
export function AddFeature({ projectId, vendors }: { projectId: string; vendors: Vendor[] }) {
  const [open, setOpen] = useState(false);
  // Controlled fields: a failed save keeps what was typed (React resets uncontrolled ones after every action).
  const [name, setName] = useState("");
  const [offeredBy, setOfferedBy] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<FeedbackDraft[]>([]);
  const [state, action, pending] = useActionState(
    (prev: ActionResult, fd: FormData) => createFeatureAction(projectId, prev, fd),
    null,
  );
  const id = useId();

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        <PlusIcon className="size-[14px]" />
        Add feature
      </Button>
    );
  }

  const toggleVendor = (vendorId: string) =>
    setOfferedBy((ids) => (ids.includes(vendorId) ? ids.filter((x) => x !== vendorId) : [...ids, vendorId]));
  const close = () => {
    setOpen(false);
    setName("");
    setOfferedBy([]);
    setFeedback([]);
  };

  return (
    <form action={action} className="grid w-full gap-4 rounded-[10px] border border-line bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[13.5px] font-semibold">Add a feature</h2>
          <p className="max-w-[70ch] text-xs text-muted">
            For something that didn&apos;t come up in a survey, like a requirement from a meeting. Survey answers that mention it
            later are linked to it automatically.
          </p>
        </div>
        <Button variant="ghost" onClick={close} aria-label="Close">
          <XIcon className="size-4" />
        </Button>
      </header>

      <label className="grid gap-1 text-xs font-medium text-muted sm:max-w-md">
        Feature name
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          autoComplete="off"
          autoFocus
          placeholder="e.g. Accessibility (Section 508)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={state?.ok === false}
          className={cn(fieldClass, "aria-[invalid=true]:border-dislike")}
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs font-medium text-muted">Vendors that offer it</legend>
        {vendors.length === 0 ? (
          <p className="text-[13px] text-muted">This project has no vendors yet. Add them in Settings → Vendors.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {vendors.map((v) => (
              <label
                key={v.id}
                className="flex items-center gap-2 rounded-[7px] border border-line px-2.5 py-1.5 text-[13px] hover:bg-chip has-checked:border-ink"
              >
                <input
                  type="checkbox"
                  name="vendorIds"
                  value={v.id}
                  checked={offeredBy.includes(v.id)}
                  onChange={() => toggleVendor(v.id)}
                  className="size-4 accent-ink"
                />
                {v.name}
              </label>
            ))}
          </div>
        )}
        <p className="text-[11.5px] text-muted">Leave all unticked if no vendor has it yet; it shows as a gap.</p>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-xs font-medium text-muted">Feedback (optional)</legend>
        {feedback.map((draft, i) => (
          <div key={draft.key} className="relative rounded-lg bg-sidebar p-3 pr-10">
            <FeedbackFields
              prefix="fb."
              draft={draft}
              vendors={vendors}
              onChange={(next) => setFeedback((list) => list.map((d, j) => (j === i ? next : d)))}
            />
            <button
              type="button"
              onClick={() => setFeedback((list) => list.filter((_, j) => j !== i))}
              aria-label="Remove this feedback"
              className="absolute top-2 right-2 grid size-7 place-items-center rounded-md text-faint hover:bg-chip hover:text-ink"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        ))}
        <div>
          <Button onClick={() => setFeedback((list) => [...list, newDraft()])} disabled={feedback.length >= 50}>
            <PlusIcon className="size-[14px]" />
            {feedback.length === 0 ? "Add a want, like or dislike" : "Add another"}
          </Button>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Adding…" : "Add feature"}
        </Button>
        <Button onClick={close}>Cancel</Button>
        <FormMessage id={`${id}-msg`} state={state} />
      </div>
    </form>
  );
}
