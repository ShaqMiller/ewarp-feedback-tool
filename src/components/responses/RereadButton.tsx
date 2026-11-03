"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/settings/VendorSettings";
import { rereadAction } from "@/app/projects/[projectId]/responses/actions";

// Admin button: asks the AI to read one response again, or (no responseId) every response with no linked features.
export function RereadButton({ projectId, responseId, label }: { projectId: string; responseId?: string; label: string }) {
  const [state, reread, pending] = useActionState(
    async () => rereadAction(projectId, responseId ? [responseId] : undefined),
    null,
  );
  const id = useId();
  return (
    <form action={reread} className="flex flex-wrap items-center gap-2">
      <Button type="submit" disabled={pending} aria-describedby={state ? id : undefined}>
        {pending ? "Queuing…" : label}
      </Button>
      <FormMessage id={id} state={state} />
    </form>
  );
}
