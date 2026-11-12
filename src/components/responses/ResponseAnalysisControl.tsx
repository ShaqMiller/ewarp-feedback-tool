"use client";

import { useActionState, useId } from "react";
import type { ResponseExclusion } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/settings/VendorSettings";
import { excludeResponseAction, restoreResponseAction } from "@/app/projects/[projectId]/responses/actions";

// What excluding does, in one place so the page and the form say the same thing.
export const EXCLUDE_EFFECT =
  "It stays saved here, but stops counting toward features, gaps, vendor scores and the map, and AI skips it.";

// The "Counted in analysis" card on a response's page. Admins can exclude (with a reason) or restore;
// viewers only see the state.
export function ResponseAnalysisControl({
  projectId,
  responseId,
  exclusion,
  admin,
}: {
  projectId: string;
  responseId: string;
  exclusion: ResponseExclusion;
  admin: boolean;
}) {
  const id = useId();
  const [excludeState, exclude, excluding] = useActionState(excludeResponseAction.bind(null, projectId, responseId), null);
  const [restoreState, restore, restoring] = useActionState(async () => restoreResponseAction(projectId, responseId), null);

  if (!exclusion.includedInAnalysis) {
    return (
      <div className="grid gap-3 text-[13px]">
        <div>
          <p className="font-medium text-gap">Not counted</p>
          <p className="mt-0.5 text-xs text-muted">{EXCLUDE_EFFECT}</p>
        </div>
        <div className="rounded-lg bg-gap-soft/60 p-3">
          <p className="text-xs text-muted">Reason</p>
          <p className="mt-0.5 whitespace-pre-line">{exclusion.exclusionReason || "No reason given."}</p>
          {(exclusion.excludedBy || exclusion.excludedAt) && (
            <p className="mt-1.5 text-[11px] text-faint">
              {exclusion.excludedBy ? `Excluded by ${exclusion.excludedBy.name}` : "Excluded"}
              {exclusion.excludedAt ? ` · ${formatDate(exclusion.excludedAt)}` : ""}
            </p>
          )}
        </div>
        {admin && (
          <form action={restore} className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={restoring}>
              {restoring ? "Restoring…" : "Count it again"}
            </Button>
            <FormMessage id={`${id}-restore`} state={restoreState} />
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 text-[13px]">
      <div>
        <p className="font-medium text-like">Counted</p>
        <p className="mt-0.5 text-xs text-muted">This response counts toward features, gaps, vendor scores and the map.</p>
      </div>
      {admin && (
        <details className="rounded-lg bg-sidebar">
          <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted hover:text-ink">
            Exclude from analysis
          </summary>
          <form action={exclude} className="grid gap-2 border-t border-line p-3">
            <p className="text-xs text-muted">
              For a test, a duplicate or a biased answer. {EXCLUDE_EFFECT} You can count it again at any time.
            </p>
            <label htmlFor={`${id}-reason`} className="text-xs font-medium text-muted">
              Why shouldn&apos;t it count?
            </label>
            <textarea
              id={`${id}-reason`}
              name="exclusionReason"
              required
              maxLength={2000}
              rows={2}
              placeholder="For example: a vendor employee answered about their own product."
              aria-invalid={excludeState?.ok === false}
              aria-describedby={excludeState ? `${id}-exclude` : undefined}
              className="w-full resize-y rounded-[7px] border border-line bg-surface px-2.5 py-2 text-[13px] placeholder:text-faint aria-[invalid=true]:border-dislike"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="danger" disabled={excluding}>
                {excluding ? "Excluding…" : "Exclude response"}
              </Button>
              <FormMessage id={`${id}-exclude`} state={excludeState} />
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
