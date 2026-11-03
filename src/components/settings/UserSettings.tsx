"use client";

import { useActionState, useId, useState, type ChangeEvent } from "react";
import type { ActionResult } from "@/lib/actions";
import type { Role, User } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/primitives";
import {
  createUserAction,
  deleteUserAction,
  resetPasswordAction,
  setUserRoleAction,
} from "@/app/projects/[projectId]/settings/users/actions";
import { FormMessage } from "./VendorSettings";

const inputClass =
  "h-[34px] w-full min-w-0 rounded-[7px] border border-line bg-surface px-2.5 text-[13px] placeholder:text-faint aria-[invalid=true]:border-dislike";

const ROLE_HELP: Record<Role, string> = {
  admin: "Admin: can change vendors, features, weights and people",
  viewer: "Viewer: can see everything, can't change anything",
};

function RoleSelect({ id, defaultValue }: { id: string; defaultValue: Role }) {
  return (
    <select id={id} name="role" defaultValue={defaultValue} className={cn(inputClass, "pr-7")}>
      <option value="viewer">{ROLE_HELP.viewer}</option>
      <option value="admin">{ROLE_HELP.admin}</option>
    </select>
  );
}

const EMPTY = { name: "", email: "", password: "" };

function AddUserForm() {
  // Controlled fields: a failed save keeps what was typed (React resets uncontrolled ones after every action).
  const [fields, setFields] = useState(EMPTY);
  const [state, action, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const result = await createUserAction(prev, fd);
    if (result?.ok) setFields(EMPTY);
    return result;
  }, null);
  const id = useId();
  const set = (name: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [name]: e.target.value }));
  const label = "grid gap-1 text-xs text-muted";
  return (
    <form action={action} className="grid gap-3">
      <p className="text-xs font-medium text-muted">Add a person</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={label}>
          Name
          <input name="name" required maxLength={80} autoComplete="off" value={fields.name} onChange={set("name")} className={inputClass} />
        </label>
        <label className={label}>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            value={fields.email}
            onChange={set("email")}
            className={inputClass}
          />
        </label>
        <label className={label}>
          Temporary password (8+ characters)
          <input
            name="password"
            type="text"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={fields.password}
            onChange={set("password")}
            className={inputClass}
          />
        </label>
        <label htmlFor={`${id}-role`} className={label}>
          Role
          <RoleSelect id={`${id}-role`} defaultValue="viewer" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Adding…" : "Add person"}
        </Button>
        <FormMessage id={`${id}-msg`} state={state} />
      </div>
    </form>
  );
}

type Mode = "view" | "role" | "password" | "delete";

function UserRow({ user, isMe }: { user: User; isMe: boolean }) {
  const [mode, setMode] = useState<Mode>("view");
  const id = useId();
  const done = (r: ActionResult) => {
    if (r?.ok) setMode("view");
    return r;
  };
  const [roleState, saveRole, savingRole] = useActionState(
    async (prev: ActionResult, fd: FormData) => done(await setUserRoleAction(user.id, prev, fd)),
    null,
  );
  const [passwordState, savePassword, savingPassword] = useActionState(
    async (prev: ActionResult, fd: FormData) => done(await resetPasswordAction(user.id, prev, fd)),
    null,
  );
  const [deleteState, remove, deleting] = useActionState(async () => done(await deleteUserAction(user.id)), null);
  const open = (next: Mode) => setMode((m) => (m === next ? "view" : next));
  // A password change has no visible result on the row, so its confirmation stays after the panel closes.
  const confirmed = mode === "view" && passwordState?.ok ? passwordState : null;

  return (
    <li className="border-b border-line px-4 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold">
            {user.name}
            <Pill tone={user.role === "admin" ? "accent" : "neutral"}>{user.role === "admin" ? "Admin" : "Viewer"}</Pill>
            {isMe && <span className="text-xs font-normal text-faint">You</span>}
          </p>
          <p className="truncate text-xs text-muted">
            {user.email} · added {formatDate(user.createdAt)}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" onClick={() => open("role")} aria-expanded={mode === "role"}>
            Role
          </Button>
          <Button variant="ghost" onClick={() => open("password")} aria-expanded={mode === "password"}>
            Password
          </Button>
          {!isMe && (
            <Button variant="ghost" onClick={() => open("delete")} aria-expanded={mode === "delete"} className="hover:text-dislike">
              Remove
            </Button>
          )}
        </div>
      </div>
      {confirmed && (
        <div className="mt-2">
          <FormMessage id={`${id}-done`} state={confirmed} />
        </div>
      )}

      {mode === "role" && (
        <form action={saveRole} className="mt-3 grid gap-2 rounded-lg bg-sidebar p-3">
          <label htmlFor={`${id}-role`} className="text-xs font-medium text-muted">
            What {user.name} can do
          </label>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <RoleSelect id={`${id}-role`} defaultValue={user.role} />
            </div>
            <Button type="submit" variant="primary" disabled={savingRole}>
              {savingRole ? "Saving…" : "Save"}
            </Button>
            <Button onClick={() => setMode("view")}>Cancel</Button>
          </div>
          <FormMessage id={`${id}-role-msg`} state={roleState} />
        </form>
      )}

      {mode === "password" && (
        <form action={savePassword} className="mt-3 grid gap-2 rounded-lg bg-sidebar p-3">
          <label htmlFor={`${id}-password`} className="text-xs font-medium text-muted">
            New password for {user.name} (8+ characters)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${id}-password`}
              name="password"
              type="text"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              autoFocus
              className={cn(inputClass, "flex-1 sm:max-w-sm")}
            />
            <Button type="submit" variant="primary" disabled={savingPassword}>
              {savingPassword ? "Saving…" : "Set password"}
            </Button>
            <Button onClick={() => setMode("view")}>Cancel</Button>
          </div>
          <FormMessage id={`${id}-password-msg`} state={passwordState} />
        </form>
      )}

      {mode === "delete" && (
        <form action={remove} className="mt-3 grid gap-2 rounded-lg bg-dislike-soft/60 p-3">
          <p className="text-[13px]">
            Remove <b className="font-semibold">{user.name}</b>? They&apos;re signed out and can&apos;t sign in again. Feedback
            they added stays.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="danger" disabled={deleting}>
              {deleting ? "Removing…" : "Remove person"}
            </Button>
            <Button onClick={() => setMode("view")}>Cancel</Button>
            <FormMessage id={`${id}-delete-msg`} state={deleteState} />
          </div>
        </form>
      )}
    </li>
  );
}

export function UserSettings({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  return (
    <section className="rounded-[10px] border border-line bg-surface">
      <header className="grid gap-1 border-b border-line p-4">
        <h2 className="text-[13.5px] font-semibold">People</h2>
        <p className="max-w-[70ch] text-xs text-muted">
          Everyone who can sign in to eWARP, across all projects. Viewers see every page but can&apos;t change anything; admins
          can also change vendors, features, weights and people.
        </p>
      </header>
      <div className="border-b border-line p-4">
        <AddUserForm />
      </div>
      <ul>
        {users.map((u) => (
          <UserRow key={u.id} user={u} isMe={u.id === currentUserId} />
        ))}
      </ul>
    </section>
  );
}
