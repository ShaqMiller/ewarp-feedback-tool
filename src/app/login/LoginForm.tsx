"use client";

import { useActionState, useId } from "react";
import { cn } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { loginAction } from "./actions";

const inputClass =
  "h-[38px] w-full rounded-[7px] border border-line bg-surface px-3 text-[14px] placeholder:text-faint aria-[invalid=true]:border-dislike";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const id = useId();
  return (
    <form action={action} className="grid gap-3.5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-email`} className="text-xs font-medium text-muted">
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue={state?.email}
          aria-invalid={!!state}
          aria-describedby={state ? `${id}-error` : undefined}
          className={inputClass}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-password`} className="text-xs font-medium text-muted">
          Password
        </label>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={!!state}
          aria-describedby={state ? `${id}-error` : undefined}
          className={inputClass}
        />
      </div>
      {state && (
        <p id={`${id}-error`} role="alert" className="text-xs text-dislike">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={pending} className={cn("h-[38px] text-[13.5px]")}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
