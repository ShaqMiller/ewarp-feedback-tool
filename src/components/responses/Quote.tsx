import type { ReactNode } from "react";
import type { Sentiment } from "@/lib/api/types";
import { cn } from "@/lib/format";

const KIND_BORDER: Record<Sentiment, string> = { like: "border-like", dislike: "border-dislike", want: "border-want" };

// One survey answer quoted, with a colored rule for like / dislike / want and a meta line below.
export function Quote({ kind, text, children }: { kind: Sentiment; text: string; children: ReactNode }) {
  return (
    <li className={cn("border-l-2 py-0.5 pl-3", KIND_BORDER[kind])}>
      <q className="text-[13.5px]">{text}</q>
      <p className="mt-1 text-[11.5px] text-muted">{children}</p>
    </li>
  );
}
