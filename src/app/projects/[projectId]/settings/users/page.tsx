import type { Metadata } from "next";
import { api } from "@/lib/api";
import { UserSettings } from "@/components/settings/UserSettings";

export const metadata: Metadata = { title: "Users" };

// Uses GET /users (admin) and GET /me. People aren't per project, so this tab is the same in every project.
export default async function UserSettingsPage() {
  const [users, me] = await Promise.all([api.listUsers(), api.getMe()]);
  return <UserSettings users={users.items} currentUserId={me.id} />;
}
