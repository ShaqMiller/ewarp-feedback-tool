import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { Skeleton } from "./primitives";

type CardProps = {
  title?: string;
  action?: ReactNode; // right side of the header: a CardLink or CardMeta
  className?: string;
  children: ReactNode;
};

export function Card({ title, action, className, children }: CardProps) {
  return (
    <section className={cn("min-w-0 rounded-[10px] border border-line bg-surface p-4", className)}>
      {title && (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[13.5px] font-semibold">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// Loading state for a card with text rows; shows the real title so the layout doesn't jump.
export function CardSkeleton({ title, lines = 3 }: { title: string; lines?: number }) {
  return (
    <Card title={title}>
      <div className="grid gap-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn("h-3.5", i === lines - 1 && "w-2/3")} />
        ))}
      </div>
    </Card>
  );
}

export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded text-xs text-muted transition-colors hover:text-ink">
      {children}
    </Link>
  );
}

export function CardMeta({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted">{children}</span>;
}
