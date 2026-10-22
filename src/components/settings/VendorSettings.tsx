"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import type { Coverage } from "@/lib/api/types";
import { cn, plural } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { EmptyState, Pill } from "@/components/ui/primitives";
import {
  createVendorAction,
  deleteVendorAction,
  editVendorAction,
  setVendorFeaturesAction,
} from "@/app/projects/[projectId]/settings/vendors/actions";
import type { ActionResult } from "@/lib/actions";

export type SettingsVendor = { id: string; name: string; form: string | null; responseCount: number; featureIds: string[] };
export type SettingsFeature = { id: string; name: string; coverage: Coverage };

const inputClass =
  "h-[34px] w-full min-w-0 rounded-[7px] border border-line bg-surface px-2.5 text-[13px] placeholder:text-faint aria-[invalid=true]:border-dislike";

function FormMessage({ id, state }: { id: string; state: ActionResult }) {
  if (!state) return null;
  return (
    <p id={id} role={state.ok ? "status" : "alert"} className={cn("text-xs", state.ok ? "text-like" : "text-dislike")}>
      {state.ok ? state.message : state.error}
    </p>
  );
}

// Vendor name plus its Google Form name. The form defaults to the vendor name, as the backend does.
function VendorFields({
  id,
  defaultName = "",
  defaultForm = "",
  invalid,
  describedBy,
  autoFocus,
}: {
  id: string;
  defaultName?: string;
  defaultForm?: string;
  invalid: boolean;
  describedBy?: string;
  autoFocus?: boolean;
}) {
  // Controlled, because React resets uncontrolled fields after every form action, failed ones included.
  const [name, setName] = useState(defaultName);
  const [form, setForm] = useState(defaultForm);
  return (
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
      <div className="grid gap-1">
        <label htmlFor={`${id}-name`} className="text-xs font-medium text-muted">
          Vendor name
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="e.g. Pryzm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={inputClass}
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-form`} className="text-xs font-medium text-muted">
          Google Form name <span className="font-normal text-faint">(optional)</span>
        </label>
        <input
          id={`${id}-form`}
          name="form"
          maxLength={200}
          autoComplete="off"
          value={form}
          onChange={(e) => setForm(e.target.value)}
          placeholder={name.trim() || "Same as the vendor name"}
          aria-describedby={`${id}-form-hint`}
          className={inputClass}
        />
      </div>
      <p id={`${id}-form-hint`} className="text-[11.5px] text-muted sm:col-span-2">
        Submissions are matched to this vendor by the form name the Google Form sends. Leave it blank to use the vendor name.
      </p>
    </div>
  );
}

function AddVendorForm({ projectId }: { projectId: string }) {
  // Remounting the fields clears them; only done after a successful add, so a failed attempt keeps what was typed.
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const result = await createVendorAction(projectId, prev, fd);
    if (result?.ok) setFormKey((k) => k + 1);
    return result;
  }, null);
  const id = useId();
  return (
    <form action={action} className="grid gap-3">
      <h3 className="text-[13px] font-semibold">Add a vendor</h3>
      <VendorFields key={formKey} id={id} invalid={state?.ok === false} describedBy={state ? `${id}-msg` : undefined} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Adding…" : "Add vendor"}
        </Button>
        <FormMessage id={`${id}-msg`} state={state} />
      </div>
    </form>
  );
}

type Mode = "view" | "edit" | "features" | "delete";

function VendorRow({
  projectId,
  vendor,
  features,
}: {
  projectId: string;
  vendor: SettingsVendor;
  features: SettingsFeature[];
}) {
  const [mode, setMode] = useState<Mode>("view");
  const id = useId();

  // Each action returns to the normal row view once it succeeds.
  const done = (r: ActionResult) => {
    if (r?.ok) setMode("view");
    return r;
  };
  const [editState, edit, saving] = useActionState(
    async (prev: ActionResult, fd: FormData) => done(await editVendorAction(projectId, vendor.id, prev, fd)),
    null,
  );
  const [featureState, saveFeatures, savingFeatures] = useActionState(
    async (prev: ActionResult, fd: FormData) => done(await setVendorFeaturesAction(projectId, vendor.id, prev, fd)),
    null,
  );
  const [deleteState, remove, deleting] = useActionState(
    async () => done(await deleteVendorAction(projectId, vendor.id)),
    null,
  );

  const open = (next: Mode) => setMode((m) => (m === next ? "view" : next));

  return (
    <li className="border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <Link href={`/projects/${projectId}/vendors/${vendor.id}`} className="text-[13.5px] font-semibold hover:underline">
            {vendor.name}
          </Link>
          <p className="text-xs text-muted">
            {plural(vendor.responseCount, "response")} · offers {vendor.featureIds.length} of {plural(features.length, "feature")}
          </p>
          <p className="text-xs text-muted">
            {vendor.form ? (
              <>
                Google Form: <span className="font-medium text-ink">{vendor.form}</span>
              </>
            ) : (
              <span className="text-gap">No Google Form connected, so no responses can reach this vendor</span>
            )}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" onClick={() => open("edit")} aria-expanded={mode === "edit"}>
            Edit
          </Button>
          <Button variant="ghost" onClick={() => open("features")} aria-expanded={mode === "features"}>
            Features
          </Button>
          <Button variant="ghost" onClick={() => open("delete")} aria-expanded={mode === "delete"} className="hover:text-dislike">
            Delete
          </Button>
        </div>
      </div>

      {mode === "edit" && (
        <form action={edit} className="mt-3 grid gap-3 rounded-lg bg-sidebar p-3">
          <VendorFields
            id={`${id}-edit`}
            defaultName={vendor.name}
            defaultForm={vendor.form ?? ""}
            invalid={editState?.ok === false}
            describedBy={editState ? `${id}-edit-msg` : undefined}
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button onClick={() => setMode("view")}>Cancel</Button>
            <FormMessage id={`${id}-edit-msg`} state={editState} />
          </div>
        </form>
      )}

      {mode === "features" && (
        <form action={saveFeatures} className="mt-3 grid gap-3 rounded-lg bg-sidebar p-3">
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-xs font-medium text-muted">Features {vendor.name} offers</legend>
            {features.length === 0 ? (
              <p className="text-[13px] text-muted">
                This project has no features yet. They appear once AI reads the first responses, and you can mark which ones
                each vendor offers here.
              </p>
            ) : (
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((f) => (
                  <label key={f.id} className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-[13px] hover:bg-chip">
                    <input
                      type="checkbox"
                      name="featureIds"
                      value={f.id}
                      defaultChecked={vendor.featureIds.includes(f.id)}
                      className="size-4 shrink-0 accent-ink"
                    />
                    <span className="truncate">{f.name}</span>
                    {f.coverage === "none" && <span className="ml-auto shrink-0"><Pill tone="gap">Gap</Pill></span>}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            {features.length > 0 && (
              <Button type="submit" variant="primary" disabled={savingFeatures}>
                {savingFeatures ? "Saving…" : "Save features"}
              </Button>
            )}
            <Button onClick={() => setMode("view")}>{features.length > 0 ? "Cancel" : "Close"}</Button>
            <FormMessage id={`${id}-features-msg`} state={featureState} />
          </div>
        </form>
      )}

      {mode === "delete" && (
        <form action={remove} className="mt-3 grid gap-2 rounded-lg bg-dislike-soft/60 p-3">
          {vendor.responseCount > 0 ? (
            <p className="text-[13px]">
              <b className="font-semibold">{vendor.name}</b> has {plural(vendor.responseCount, "response")}, so it can&apos;t be
              deleted. Responses always keep their vendor.
            </p>
          ) : (
            <p className="text-[13px]">
              Delete <b className="font-semibold">{vendor.name}</b>? Its feature list goes with it. This can&apos;t be undone.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {vendor.responseCount === 0 && (
              <Button type="submit" variant="danger" disabled={deleting}>
                {deleting ? "Deleting…" : "Delete vendor"}
              </Button>
            )}
            <Button onClick={() => setMode("view")}>{vendor.responseCount === 0 ? "Cancel" : "Close"}</Button>
            <FormMessage id={`${id}-delete-msg`} state={deleteState} />
          </div>
        </form>
      )}
    </li>
  );
}

export function VendorSettings({
  projectId,
  vendors,
  features,
}: {
  projectId: string;
  vendors: SettingsVendor[];
  features: SettingsFeature[];
}) {
  return (
    <section className="rounded-[10px] border border-line bg-surface">
      <header className="grid gap-1 border-b border-line p-4">
        <h2 className="text-[13.5px] font-semibold">Vendors</h2>
        <p className="max-w-[70ch] text-xs text-muted">
          The vendors being evaluated in this project. Each vendor has its own Google Form and survey, and submissions are
          matched to a vendor by form name. Add a vendor before collecting feedback about it, then tick the features it
          offers so coverage and fit are accurate.
        </p>
      </header>
      <div className="border-b border-line p-4">
        <AddVendorForm projectId={projectId} />
      </div>
      {vendors.length === 0 ? (
        <EmptyState title="No vendors yet">Add the first vendor above.</EmptyState>
      ) : (
        <ul>
          {vendors.map((v) => (
            <VendorRow key={v.id} projectId={projectId} vendor={v} features={features} />
          ))}
        </ul>
      )}
    </section>
  );
}
