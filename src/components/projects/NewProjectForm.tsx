"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";
import { createProjectAction } from "@/app/projects/new/actions";
import { cn } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { PlusIcon, XIcon } from "@/components/ui/icons";

const MAX_VENDORS = 100;
const inputClass =
  "h-[34px] w-full min-w-0 rounded-[7px] border border-line bg-surface px-2.5 text-[13px] placeholder:text-faint";

type Row = { key: number; name: string; form: string };

// Fields are controlled: React resets uncontrolled fields after every form action, including failed ones,
// and nobody should have to retype a project because one vendor name clashed.
export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<Row[]>([{ key: 0, name: "", form: "" }]);
  const nextKey = useRef(1);
  const id = useId();

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, { key: nextKey.current++, name: "", form: "" }]);
  const remove = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));

  return (
    <form action={action} className="grid gap-5 rounded-[10px] border border-line bg-surface p-4 sm:p-5">
      <div className="grid gap-1">
        <label htmlFor={`${id}-name`} className="text-xs font-medium text-muted">
          Project name
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={200}
          autoFocus
          autoComplete="off"
          placeholder="e.g. DIU platform feedback"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(inputClass, "sm:max-w-md")}
        />
      </div>

      <div className="grid gap-1">
        <label htmlFor={`${id}-description`} className="text-xs font-medium text-muted">
          Description <span className="font-normal text-faint">(optional)</span>
        </label>
        <textarea
          id={`${id}-description`}
          name="description"
          maxLength={2000}
          rows={2}
          placeholder="What is this evaluation for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full min-w-0 rounded-[7px] border border-line bg-surface px-2.5 py-2 text-[13px] placeholder:text-faint sm:max-w-xl"
        />
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-[13px] font-semibold">Vendors</legend>
        <p className="-mt-1 max-w-[70ch] text-xs text-muted">
          Each vendor gets its own survey. Google Form submissions are matched to a vendor by form name, which defaults to the
          vendor name. Responses already received for these forms are imported automatically.
        </p>
        <div className="hidden gap-3 text-xs font-medium text-muted sm:grid sm:grid-cols-[1fr_1fr_32px]">
          <span>Vendor name</span>
          <span>
            Google Form name <span className="font-normal text-faint">(optional)</span>
          </span>
        </div>
        <ol className="grid gap-3 sm:gap-2">
          {rows.map((row, i) => (
            <li key={row.key} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_1fr_32px] sm:gap-3 sm:border-0 sm:p-0">
              <div className="grid gap-1">
                <label htmlFor={`${id}-v${row.key}-name`} className="text-xs font-medium text-muted sm:sr-only">
                  Vendor {i + 1} name
                </label>
                <input
                  id={`${id}-v${row.key}-name`}
                  name="vendorName"
                  maxLength={80}
                  autoComplete="off"
                  placeholder={i === 0 ? "e.g. GovSignals" : "e.g. Pryzm"}
                  value={row.name}
                  onChange={(e) => update(row.key, { name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-1">
                <label htmlFor={`${id}-v${row.key}-form`} className="text-xs font-medium text-muted sm:sr-only">
                  Vendor {i + 1} Google Form name (optional)
                </label>
                <input
                  id={`${id}-v${row.key}-form`}
                  name="vendorForm"
                  maxLength={200}
                  autoComplete="off"
                  placeholder={row.name.trim() || "Same as the vendor name"}
                  value={row.form}
                  onChange={(e) => update(row.key, { form: e.target.value })}
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(row.key)}
                disabled={rows.length === 1}
                aria-label={`Remove vendor ${i + 1}`}
                className="grid size-8 place-items-center self-end justify-self-end rounded-md text-faint transition-colors hover:bg-chip hover:text-ink disabled:invisible"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ol>
        {rows.length < MAX_VENDORS && (
          <Button onClick={add} className="justify-self-start">
            <PlusIcon className="size-3.5" />
            Add another vendor
          </Button>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </Button>
        <Link href="/projects" className="rounded text-[13px] font-medium text-muted hover:text-ink">
          Cancel
        </Link>
        {state?.ok === false && (
          <p role="alert" className="basis-full text-xs text-dislike sm:basis-auto">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
