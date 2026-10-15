import { api } from "@/lib/api";
import type { Project } from "@/lib/api/types";
import { formatDate, plural } from "@/lib/format";
import { Pill } from "@/components/ui/primitives";

export function DashboardHeader({ project, status }: { project: Project; status: React.ReactNode }) {
  const { responses, vendors, surveys } = project.counts;
  const subtitle =
    responses > 0
      ? `${plural(responses, "response")} about ${plural(vendors, "vendor")}${
          project.lastResponseAt ? ` · last response ${formatDate(project.lastResponseAt)}` : ""
        }`
      : `No responses yet · ${plural(surveys, "survey")} collecting`;

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Dashboard</h1>
        <p className="text-[13px] text-muted">{subtitle}</p>
      </div>
      {status}
    </div>
  );
}

// "AI analysis up to date" or "Analyzing 2 responses". Uses the summary endpoint.
export async function AnalysisStatus({ projectId }: { projectId: string }) {
  const { analysis } = await api.getSummary(projectId);
  if (analysis.total === 0) return null;
  const pending = analysis.total - analysis.processed;
  return pending === 0 ? (
    <Pill tone="like">
      <span className="size-[7px] rounded-full bg-like" />
      AI analysis up to date
    </Pill>
  ) : (
    <Pill tone="accent">
      <span className="size-[7px] rounded-full bg-accent motion-safe:animate-pulse" />
      Analyzing {plural(pending, "new response")}
    </Pill>
  );
}
