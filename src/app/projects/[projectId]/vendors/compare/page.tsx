import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { TopBar } from "@/components/shell/TopBar";
import { VendorComparison } from "@/components/vendors/VendorComparison";

export const metadata: Metadata = { title: "Compare vendors" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Uses GET /projects/:projectId, /vendors?sort=score and /scores. The selected pair is shareable in the URL.
export default async function CompareVendorsPage({ params, searchParams }: PageProps<"/projects/[projectId]/vendors/compare">) {
  const { projectId } = await params;
  const query = await searchParams;
  const [project, vendors, scores] = await Promise.all([
    orNotFound(api.getProject(projectId)),
    api.listVendors(projectId, { sort: "score" }),
    api.getScores(projectId),
  ]);

  const left = first(query.left) ?? vendors.items[0]?.id ?? "";
  const right = first(query.right) ?? vendors.items.find((vendor) => vendor.id !== left)?.id ?? "";

  return (
    <>
      <TopBar crumbs={[{ label: project.name, href: `/projects/${project.id}` }, { label: "Vendors", href: `/projects/${project.id}/vendors` }, { label: "Compare" }]} />
      <main className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Compare vendors</h1>
          <p className="text-[13px] text-muted">A concise view of vendor fit, feedback, and the factors behind each score.</p>
        </div>
        <VendorComparison projectId={projectId} vendors={vendors.items} scores={scores.items} leftId={left} rightId={right} />
      </main>
    </>
  );
}
