import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export type Crumb = { label: string; href?: string };

// Desktop page header: breadcrumb on the left, page actions on the right.
export function TopBar({ crumbs, children }: { crumbs: Crumb[]; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 hidden h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-6 lg:flex">
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-[7px] text-[13px] text-muted">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={i}>
                {i > 0 && (
                  <li aria-hidden="true" className="text-faint">
                    /
                  </li>
                )}
                <li className="truncate">
                  {last || !c.href ? (
                    <span aria-current={last ? "page" : undefined} className={last ? "font-medium text-ink" : undefined}>
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="rounded hover:text-ink">
                      {c.label}
                    </Link>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>
      <div className="flex-1" />
      {children}
    </header>
  );
}
