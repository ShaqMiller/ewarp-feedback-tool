import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { plural } from "@/lib/format";
import { AsyncSlot } from "@/components/ui/AsyncSlot";
import { TopBar } from "@/components/shell/TopBar";
import { VendorTable, VendorTableSkeleton } from "@/components/vendors/VendorTable";

export const metadata: Metadata = { title: "Vendors" };

export default async function VendorsPage({ params }: PageProps<"/projects/[projectId]/vendors">) {
  const { projectId } = await params;
  const project = await orNotFound(api.getProject(projectId));
  const { vendors, features } = project.counts;

  return (
    <>
      <TopBar crumbs={[{ label: project.name, href: `/projects/${project.id}` }, { label: "Vendors" }]} />
      <main className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em]">Vendors</h1>
          <p className="text-[13px] text-muted">
            {vendors > 0
              ? `${plural(vendors, "vendor")}, ranked by how many requested features they offer`
              : "No vendors in this project yet"}
          </p>
        </div>
        <AsyncSlot title="Vendors" fallback={<VendorTableSkeleton />}>
          <VendorTable projectId={projectId} featureCount={features} />
        </AsyncSlot>
      </main>
    </>
  );
}
