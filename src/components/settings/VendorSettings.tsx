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
  renameVendorAction,
  setVendorFeaturesAction,
  type ActionResult,
} from "@/app/projects/[projectId]/settings/vendors/actions";

export type SettingsVendor = { id: string; name: string; responseCount: number; featureIds: string[] };
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

function AddVendorForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(createVendorAction.bind(null, projectId), null);
  const id = useId();
  const failed = state?.ok === false;
  return (
    <form action={action} className="grid gap-2">
      <label htmlFor={`${id}-name`} className="text-xs font-medium text-muted">
        Add a vendor
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          autoComplete="off"
          placeholder="Vendor name, e.g. Prism"
          aria-invalid={failed}
          aria-describedby={state ? `${id}-msg` : undefined}
          className={cn(inputClass, "sm:max-w-sm")}
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Adding…" : "Add vendor"}
        </Button>
      </div>
      <FormMessage id={`${id}-msg`} state={state} />
    </form>
  );
}

type Mode = "view" | "rename" | "features" | "delete";

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
  const [renameState, rename, renaming] = useActionState(
    async (prev: ActionResult, fd: FormData) => done(await renameVendorAction(projectId, vendor.id, prev, fd)),
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
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" onClick={() => open("rename")} aria-expanded={mode === "rename"}>
            Rename
          </Button>
          <Button variant="ghost" onClick={() => open("features")} aria-expanded={mode === "features"}>
            Features
          </Button>
          <Button variant="ghost" onClick={() => open("delete")} aria-expanded={mode === "delete"} className="hover:text-dislike">
            Delete
          </Button>
        </div>
      </div>

      {mode === "rename" && (
        <form action={rename} className="mt-3 grid gap-2 rounded-lg bg-sidebar p-3">
          <label htmlFor={`${id}-rename`} className="text-xs font-medium text-muted">
            Vendor name
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${id}-rename`}
              name="name"
              required
              maxLength={80}
              defaultValue={vendor.name}
              autoFocus
              aria-invalid={renameState?.ok === false}
              aria-describedby={renameState ? `${id}-rename-msg` : undefined}
              className={cn(inputClass, "flex-1 sm:max-w-sm")}
            />
            <Button type="submit" variant="primary" disabled={renaming}>
              {renaming ? "Saving…" : "Save"}
            </Button>
            <Button onClick={() => setMode("view")}>Cancel</Button>
          </div>
          <FormMessage id={`${id}-rename-msg`} state={renameState} />
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
          The vendors being evaluated in this project. Each survey response is about one of them, so add a vendor here before
          collecting feedback about it. Then tick the features it offers so coverage and fit are accurate.
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
