import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { TopBar } from "@/components/shell/TopBar";
import { RouteTabs } from "@/components/ui/RouteTabs";
import { VendorHeader } from "@/components/vendors/detail/OverviewCards";

type Props = LayoutProps<"/projects/[projectId]/vendors/[vendorId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId, vendorId } = await params;
  const vendor = await api.getVendor(projectId, vendorId).catch(() => null);
  return { title: vendor?.name ?? "Vendor" };
}

// Shared by the Overview and Responses tabs.
// Uses GET /projects/:projectId and /vendors/:vendorId; the tab count reuses vendor.responseCount.
export default async function VendorLayout({ children, params }: Props) {
  const { projectId, vendorId } = await params;
  const [project, vendor] = await Promise.all([
    orNotFound(api.getProject(projectId)),
    orNotFound(api.getVendor(projectId, vendorId)),
  ]);

  return (
    <>
      <TopBar
        crumbs={[
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Vendors", href: `/projects/${project.id}/vendors` },
          { label: vendor.name },
        ]}
      />
      <main className="flex flex-col gap-5 px-4 py-5 sm:px-6 sm:py-[22px]">
        <div className="flex flex-col gap-4">
          <VendorHeader vendor={vendor} featureCount={project.counts.features} />
          <RouteTabs
            base={`/projects/${project.id}/vendors/${vendor.id}`}
            label="Vendor sections"
            tabs={[
              { segment: "", label: "Overview" },
              { segment: "responses", label: "Responses", count: vendor.responseCount },
            ]}
          />
        </div>
        {children}
      </main>
    </>
  );
}
