import type { Metadata } from "next";
import type { ReactNode } from "react";
import { backendHost, getDataSource, type DataSource } from "@/lib/api";
import { cn } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/primitives";
import { setDataSourceAction } from "./actions";

export const metadata: Metadata = { title: "Data source" };

function Option({
  value,
  current,
  title,
  description,
  disabled,
  children,
}: {
  value: DataSource;
  current: DataSource;
  title: string;
  description: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const active = value === current;
  return (
    <form
      action={setDataSourceAction}
      className={cn(
        "flex flex-col gap-3 rounded-[10px] border bg-surface p-4",
        active ? "border-accent ring-1 ring-accent" : "border-line",
        disabled && "bg-sidebar",
      )}
    >
      <input type="hidden" name="source" value={value} />
      <div className="flex items-start justify-between gap-3">
        <h2 className={cn("text-[14px] font-semibold", disabled && "text-muted")}>{title}</h2>
        {active && (
          <Pill tone="accent">
            <CheckIcon className="size-3" />
            In use
          </Pill>
        )}
      </div>
      <p className="text-[13px] text-muted">{description}</p>
      {children}
      {!active && (
        <Button type="submit" variant="primary" disabled={disabled} className="mt-auto self-start">
          Use {title.toLowerCase()}
        </Button>
      )}
    </form>
  );
}

// Switches what this browser shows. Lives under a project's settings but applies to every project.
export default async function DataSourcePage() {
  const current = await getDataSource();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-[15px] font-semibold">Data source</h2>
        <p className="max-w-[70ch] text-[13px] text-muted">
          Choose what this browser shows across all projects. Switching takes you to the project list, because the demo
          and live data have different projects. Other people&apos;s view doesn&apos;t change.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Option
          value="live"
          current={current}
          title="Live data"
          description="Real survey responses and AI findings from the eWARP backend."
          disabled={!backendHost}
        >
          <p className="text-xs text-muted">
            {backendHost ? (
              <>
                Connected to <span className="font-mono text-ink">{backendHost}</span>
              </>
            ) : (
              "No backend is connected. Set FEEDBACK_API_URL where the app is hosted to turn this on."
            )}
          </p>
        </Option>
        <Option
          value="demo"
          current={current}
          title="Demo data"
          description="Sample projects, vendors and responses for demos and training. Changes you make reset when the app restarts."
        />
      </div>
    </section>
  );
}
