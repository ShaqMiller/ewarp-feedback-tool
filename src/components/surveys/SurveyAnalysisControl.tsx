"use client";

import { useActionState, useId } from "react";
import type { Survey } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/settings/VendorSettings";
import { excludeSurveyAction, restoreSurveyAction } from "@/app/projects/[projectId]/surveys/actions";

// Admin-only control: exclusion preserves the source data but removes it from calculated analysis.
export function SurveyAnalysisControl({ projectId, survey }: { projectId: string; survey: Survey }) {
  const id = useId();
  const [excludeState, exclude, excluding] = useActionState(excludeSurveyAction.bind(null, projectId, survey.id), null);
  const [restoreState, restore, restoring] = useActionState(async () => restoreSurveyAction(projectId, survey.id), null);

  if (!survey.includedInAnalysis) {
    return (
      <section className="grid gap-2 rounded-lg bg-gap-soft/60 p-3">
        <div>
          <p className="text-[13px] font-medium">Excluded from analysis</p>
          <p className="mt-0.5 text-xs text-muted">{survey.exclusionReason}</p>
          {(survey.excludedBy || survey.excludedAt) && (
            <p className="mt-1 text-[11px] text-faint">
              {survey.excludedBy ? `Excluded by ${survey.excludedBy.name}` : "Excluded"}
              {survey.excludedAt ? ` · ${formatDate(survey.excludedAt)}` : ""}
            </p>
          )}
        </div>
        <form action={restore} className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={restoring}>{restoring ? "Restoring…" : "Restore to analysis"}</Button>
          <FormMessage id={`${id}-restore`} state={restoreState} />
        </form>
      </section>
    );
  }

  return (
    <details className="rounded-lg bg-sidebar">
      <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted hover:text-ink">Exclude from analysis</summary>
      <form action={exclude} className="grid gap-2 border-t border-line p-3">
        <p className="text-xs text-muted">Responses are retained for audit, but will no longer affect scores, insights, or analytics.</p>
        <label htmlFor={`${id}-reason`} className="text-xs font-medium text-muted">Reason</label>
        <textarea
          id={`${id}-reason`}
          name="exclusionReason"
          required
          maxLength={1000}
          rows={2}
          placeholder="For example: accidental test submissions."
          aria-invalid={excludeState?.ok === false}
          aria-describedby={excludeState ? `${id}-exclude` : undefined}
          className="w-full resize-y rounded-[7px] border border-line bg-surface px-2.5 py-2 text-[13px] placeholder:text-faint aria-[invalid=true]:border-dislike"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="danger" disabled={excluding}>{excluding ? "Excluding…" : "Exclude survey"}</Button>
          <FormMessage id={`${id}-exclude`} state={excludeState} />
        </div>
      </form>
    </details>
  );
}
