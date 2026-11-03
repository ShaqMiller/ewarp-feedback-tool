"use client";

import { useActionState, useId, useState } from "react";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/settings/VendorSettings";
import {
  deleteFeatureAction,
  renameFeatureAction,
  setFeatureVendorsAction,
} from "@/app/projects/[projectId]/features/actions";
import { fieldClass } from "../FeedbackFields";

type Mode = "view" | "rename" | "vendors" | "delete";

// Admin tools under a feature's title: rename it, set which vendors offer it, and delete a manual feature.
export function FeatureAdmin({
  projectId,
  feature,
  vendors,
  surveyResponses,
}: {
  projectId: string;
  feature: { id: string; name: string; source: "survey" | "manual"; vendorIds: string[] };
  vendors: { id: string; name: string }[];
  surveyResponses: number; // survey responses that mention it; a feature with any can't be deleted
}) {
  const [mode, setMode] = useState<Mode>("view");
  const id = useId();
  const done = (r: ActionResult) => {
    if (r?.ok) setMode("view");
    return r;
  };
  const [renameState, rename, renaming] = useActionState(
    async (prev: ActionResult, fd: FormData) => done(await renameFeatureAction(projectId, feature.id, prev, fd)),
    null,
  );
  const [vendorState, saveVendors, savingVendors] = useActionState(
    async (prev: ActionResult, fd: FormData) => done(await setFeatureVendorsAction(projectId, feature.id, prev, fd)),
    null,
  );
  const [deleteState, remove, deleting] = useActionState(async () => deleteFeatureAction(projectId, feature.id), null);
  const open = (next: Mode) => setMode((m) => (m === next ? "view" : next));
  const deletable = feature.source === "manual" && surveyResponses === 0;
  const saved = mode === "view" ? (vendorState?.ok ? vendorState : renameState?.ok ? renameState : null) : null;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-faint">Admin</span>
        <Button variant="ghost" onClick={() => open("vendors")} aria-expanded={mode === "vendors"}>
          Who offers it
        </Button>
        <Button variant="ghost" onClick={() => open("rename")} aria-expanded={mode === "rename"}>
          Rename
        </Button>
        {feature.source === "manual" && (
          <Button variant="ghost" onClick={() => open("delete")} aria-expanded={mode === "delete"} className="hover:text-dislike">
            Delete
          </Button>
        )}
        {saved && <FormMessage id={`${id}-saved`} state={saved} />}
      </div>

      {mode === "vendors" && (
        <form action={saveVendors} className="grid gap-3 rounded-lg bg-sidebar p-3">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-xs font-medium text-muted">Vendors that offer {feature.name}</legend>
            {vendors.length === 0 ? (
              <p className="text-[13px] text-muted">This project has no vendors yet. Add them in Settings → Vendors.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {vendors.map((v) => (
                  <label
                    key={v.id}
                    className="flex items-center gap-2 rounded-[7px] border border-line bg-surface px-2.5 py-1.5 text-[13px] hover:bg-chip has-checked:border-ink"
                  >
                    <input
                      type="checkbox"
                      name="vendorIds"
                      value={v.id}
                      defaultChecked={feature.vendorIds.includes(v.id)}
                      className="size-4 accent-ink"
                    />
                    {v.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            {vendors.length > 0 && (
              <Button type="submit" variant="primary" disabled={savingVendors}>
                {savingVendors ? "Saving…" : "Save vendors"}
              </Button>
            )}
            <Button onClick={() => setMode("view")}>Cancel</Button>
            <FormMessage id={`${id}-vendors-msg`} state={vendorState} />
          </div>
        </form>
      )}

      {mode === "rename" && (
        <form action={rename} className="grid gap-2 rounded-lg bg-sidebar p-3">
          <label htmlFor={`${id}-name`} className="text-xs font-medium text-muted">
            Feature name
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${id}-name`}
              name="name"
              required
              maxLength={80}
              defaultValue={feature.name}
              autoFocus
              aria-invalid={renameState?.ok === false}
              className={cn(fieldClass, "flex-1 aria-[invalid=true]:border-dislike sm:max-w-sm")}
            />
            <Button type="submit" variant="primary" disabled={renaming}>
              {renaming ? "Saving…" : "Save"}
            </Button>
            <Button onClick={() => setMode("view")}>Cancel</Button>
          </div>
          <FormMessage id={`${id}-rename-msg`} state={renameState} />
        </form>
      )}

      {mode === "delete" && (
        <form action={remove} className="grid gap-2 rounded-lg bg-dislike-soft/60 p-3">
          <p className="text-[13px]">
            {deletable ? (
              <>
                Delete <b className="font-semibold">{feature.name}</b>? Its manual feedback and vendor list go with it. This
                can&apos;t be undone.
              </>
            ) : (
              <>
                Survey answers mention <b className="font-semibold">{feature.name}</b>, so it can&apos;t be deleted. Those answers
                would lose their link.
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {deletable && (
              <Button type="submit" variant="danger" disabled={deleting}>
                {deleting ? "Deleting…" : "Delete feature"}
              </Button>
            )}
            <Button onClick={() => setMode("view")}>{deletable ? "Cancel" : "Close"}</Button>
            <FormMessage id={`${id}-delete-msg`} state={deleteState} />
          </div>
        </form>
      )}
    </div>
  );
}
