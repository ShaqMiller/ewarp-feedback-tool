import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/format";

const VARIANTS = {
  primary: "bg-ink text-surface hover:bg-ink/85 disabled:bg-ink/40",
  secondary: "border border-line bg-surface text-ink hover:bg-chip disabled:text-faint",
  danger: "bg-dislike text-surface hover:bg-dislike/85 disabled:bg-dislike/40",
  ghost: "text-muted hover:bg-chip hover:text-ink disabled:text-faint",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS };

export function Button({ variant = "secondary", className, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-[32px] shrink-0 items-center justify-center gap-1.5 rounded-[7px] px-3 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
