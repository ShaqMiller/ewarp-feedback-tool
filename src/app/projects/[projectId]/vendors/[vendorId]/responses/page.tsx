import type { Metadata } from "next";
import { api } from "@/lib/api";
import { GROUP_LABELS, type Group } from "@/lib/api/types";
import { AsyncSlot } from "@/components/ui/AsyncSlot";
import { FilterChips } from "@/components/ui/FilterChips";
import { EmptyState } from "@/components/ui/primitives";
import { ResponseCard, ResponseListSkeleton } from "@/components/responses/ResponseCard";

type Props = PageProps<"/projects/[projectId]/vendors/[vendorId]/responses">;

const GROUPS: Group[] = ["pm", "sponsor", "other"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId, vendorId } = await params;
  const vendor = await api.getVendor(projectId, vendorId).catch(() => null);
  // absolute: the vendor layout sets a plain title, which stops the root "· eWARP" template from applying here.
  return { title: { absolute: `Responses · ${vendor?.name ?? "Vendor"} · eWARP` } };
}

// Uses GET /projects/:projectId/vendors/:vendorId/responses?group=
async function ResponseList({ projectId, vendorId, group }: { projectId: string; vendorId: string; group?: Group }) {
  const { items } = await api.listVendorResponses(projectId, vendorId, group ? { group } : undefined);
  if (items.length === 0) {
    return (
      <section className="rounded-[10px] border border-line bg-surface">
        <EmptyState title={group ? `No responses from ${GROUP_LABELS[group]}` : "No responses about this vendor yet"} />
      </section>
    );
  }
  return (
    <ul className="grid gap-3">
      {items.map((r) => (
        <li key={r.id}>
          <ResponseCard response={r} projectId={projectId} mentions={r.mentions} showVendor={false} />
        </li>
      ))}
    </ul>
  );
}

export default async function VendorResponsesPage({ params, searchParams }: Props) {
  const { projectId, vendorId } = await params;
  const raw = (await searchParams).group;
  const group = GROUPS.find((g) => g === raw);
  // Unfiltered list for the chip counts; the same request the overview makes, so it's cached.
  const { items: all } = await api.listVendorResponses(projectId, vendorId);
  const base = `/projects/${projectId}/vendors/${vendorId}/responses`;

  const chips = [
    { label: "All", href: base, active: !group, count: all.length },
    ...GROUPS.map((g) => ({
      label: GROUP_LABELS[g],
      href: `${base}?group=${g}`,
      active: group === g,
      count: all.filter((r) => r.group === g).length,
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <FilterChips label="Filter by respondent group" chips={chips} />
      <AsyncSlot title="Responses" fallback={<ResponseListSkeleton />}>
        <ResponseList projectId={projectId} vendorId={vendorId} group={group} />
      </AsyncSlot>
    </div>
  );
}
