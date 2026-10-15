import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { Sentiment } from "@/lib/api/types";
import { AsyncSlot } from "@/components/ui/AsyncSlot";
import { FilterChips } from "@/components/ui/FilterChips";
import { EmptyState } from "@/components/ui/primitives";
import { KIND_LABEL, ResponseCard, ResponseListSkeleton } from "@/components/responses/ResponseCard";

type Props = PageProps<"/projects/[projectId]/features/[featureId]/responses">;

const KINDS: Sentiment[] = ["like", "dislike", "want"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId, featureId } = await params;
  const feature = await api.getFeature(projectId, featureId).catch(() => null);
  // absolute: the feature layout sets a plain title, which stops the root "· eWARP" template from applying here.
  return { title: { absolute: `Responses · ${feature?.name ?? "Feature"} · eWARP` } };
}

// Uses GET /projects/:projectId/features/:featureId/responses?kind=
async function ResponseList({ projectId, featureId, kind }: { projectId: string; featureId: string; kind?: Sentiment }) {
  const { items } = await api.listFeatureResponses(projectId, featureId, kind ? { kind } : undefined);
  if (items.length === 0) {
    return (
      <section className="rounded-[10px] border border-line bg-surface">
        <EmptyState title={kind ? `No ${KIND_LABEL[kind].toLowerCase()}s for this feature` : "No responses mention this feature yet"} />
      </section>
    );
  }
  return (
    <ul className="grid gap-3">
      {items.map((r) => (
        <li key={r.id}>
          <ResponseCard response={r} projectId={projectId} highlight={r.kinds} />
        </li>
      ))}
    </ul>
  );
}

export default async function FeatureResponsesPage({ params, searchParams }: Props) {
  const { projectId, featureId } = await params;
  const raw = (await searchParams).kind;
  const kind = KINDS.find((k) => k === raw);
  const feature = await api.getFeature(projectId, featureId); // cached from the layout
  const base = `/projects/${projectId}/features/${featureId}/responses`;

  const filters = [
    { label: "All", href: base, active: !kind, count: feature.mentions },
    ...KINDS.map((k) => ({ label: `${KIND_LABEL[k]}s`, href: `${base}?kind=${k}`, active: kind === k, count: feature.sentiment[k] })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <FilterChips label="Filter responses" chips={filters} />
      <AsyncSlot title="Responses" fallback={<ResponseListSkeleton />}>
        <ResponseList projectId={projectId} featureId={featureId} kind={kind} />
      </AsyncSlot>
    </div>
  );
}
