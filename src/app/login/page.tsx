import type { Metadata } from "next";
import { backendHost, getDataSource } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shell/Sidebar";
import { setDataSourceAction } from "@/app/projects/[projectId]/settings/data/actions";
import { demoLoginAction } from "./actions";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, expired } = await searchParams;
  const source = await getDataSource();
  const nextPath = typeof next === "string" ? next : undefined;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="flex w-full max-w-[380px] flex-col gap-5">
        <Logo />
        <section className="grid gap-5 rounded-[12px] border border-line bg-surface p-6">
          <div className="grid gap-1">
            <h1 className="text-[20px] font-semibold tracking-[-0.015em]">Sign in</h1>
            <p className="text-[13px] text-muted">
              {expired ? "Your session ended. Sign in again to keep going." : "Use the account your admin set up for you."}
            </p>
          </div>
          <LoginForm next={nextPath} />
        </section>

        {source === "demo" ? (
          <section className="grid gap-3 rounded-[12px] border border-dashed border-line p-5">
            <div>
              <h2 className="text-[13.5px] font-semibold">Try the demo</h2>
              <p className="text-xs text-muted">
                Sample data. An admin can add vendors, features and weights; a viewer can only look.
              </p>
            </div>
            <form action={demoLoginAction} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="next" value={nextPath ?? ""} />
              <Button type="submit" name="role" value="admin">
                Demo admin
              </Button>
              <Button type="submit" name="role" value="viewer">
                Demo viewer
              </Button>
            </form>
            {backendHost && (
              <form action={setDataSourceAction}>
                <input type="hidden" name="source" value="live" />
                <button type="submit" className="text-xs font-medium text-accent hover:underline">
                  Use live data instead
                </button>
              </form>
            )}
          </section>
        ) : (
          <form action={setDataSourceAction} className="text-center">
            <input type="hidden" name="source" value="demo" />
            <button type="submit" className="text-xs font-medium text-muted hover:text-ink hover:underline">
              No account? Explore the demo data
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
