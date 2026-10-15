import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-sm text-center">
        <p className="text-xs font-medium text-faint">404</p>
        <h1 className="mt-1 text-xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-[13px] text-muted">The project may have been removed, or the link is wrong.</p>
        <Link
          href="/projects"
          className="mt-5 inline-flex h-9 items-center rounded-[7px] bg-ink px-4 text-[13px] font-medium text-surface"
        >
          Go to all projects
        </Link>
      </div>
    </main>
  );
}
