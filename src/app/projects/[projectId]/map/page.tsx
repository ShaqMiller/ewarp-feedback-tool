import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { GROUP_LABELS, type Group } from "@/lib/api/types";
import { plural } from "@/lib/format";
import { FilterChips } from "@/components/ui/FilterChips";
import { EmptyState } from "@/components/ui/primitives";
import { TopBar } from "@/components/shell/TopBar";
import { RelationshipMap } from "@/components/map/RelationshipMap";

export const metadata: Metadata = { title: "Relationship map" };

const GROUPS: Group[] = ["pm", "sponsor", "other"];

// Uses GET /projects/:projectId/graph?group=
export default async function MapPage({ params, searchParams }: PageProps<"/projects/[projectId]/map">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const group = GROUPS.find((g) => g === sp.group);
  const focus = typeof sp.focus === "string" ? sp.focus : undefined;

  const [project, graph] = await Promise.all([
    orNotFound(api.getProject(projectId)),
    orNotFound(api.getGraph(projectId, group ? { group } : undefined)),
  ]);

  const base = `/projects/${projectId}/map`;
  const href = (g?: Group) => {
    const q = new URLSearchParams();
    if (g) q.set("group", g);
    if (focus) q.set("focus", focus);
    return q.size ? `${base}?${q}` : base;
  };
  const chips = [
    { label: "All groups", href: href(), active: !group },
    ...GROUPS.map((g) => ({ label: GROUP_LABELS[g], href: href(g), active: group === g })),
  ];
  const empty = graph.responses.length === 0 && graph.features.length === 0;

  return (
    <>
      <TopBar crumbs={[{ label: project.name, href: `/projects/${project.id}` }, { label: "Relationship map" }]} />
      <main className="flex h-[calc(100dvh-120px-env(safe-area-inset-bottom))] min-h-[520px] flex-col gap-3 px-4 py-4 sm:px-6 lg:h-[calc(100dvh-56px)] lg:py-5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Relationship map</h1>
            <p className="text-[13px] text-muted">
              {plural(graph.responses.length, "response")} · {plural(graph.features.length, "feature")} ·{" "}
              {plural(graph.vendors.length, "vendor")}
            </p>
          </div>
          <FilterChips label="Filter by respondent group" chips={chips} />
        </div>
        {empty ? (
          <section className="grid flex-1 place-items-center rounded-[10px] border border-line bg-surface">
            <EmptyState title={group ? `No responses from ${GROUP_LABELS[group]}` : "Nothing to map yet"}>
              The map fills in as survey responses arrive and AI links them to features.
            </EmptyState>
          </section>
        ) : (
          <RelationshipMap graph={graph} projectId={projectId} />
        )}
      </main>
    </>
  );
}
