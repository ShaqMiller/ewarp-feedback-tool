import type { Metadata } from "next";
import { api, orNotFound } from "@/lib/api";
import { plural } from "@/lib/format";
import { Pill } from "@/components/ui/primitives";
import { SectionPlaceholder } from "@/components/shell/SectionPlaceholder";

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]/vendors/[vendorId]">): Promise<Metadata> {
  const { projectId, vendorId } = await params;
  const vendor = await api.getVendor(projectId, vendorId).catch(() => null);
  return { title: vendor?.name ?? "Vendor" };
}

// Uses GET /projects/:projectId and GET /projects/:projectId/vendors/:vendorId
export default async function VendorPage({ params }: PageProps<"/projects/[projectId]/vendors/[vendorId]">) {
  const { projectId, vendorId } = await params;
  const [project, vendor] = await Promise.all([
    orNotFound(api.getProject(projectId)),
    orNotFound(api.getVendor(projectId, vendorId)),
  ]);

  return (
    <SectionPlaceholder
      crumbs={[
        { label: project.name, href: `/projects/${project.id}` },
        { label: "Vendors", href: `/projects/${project.id}/vendors` },
        { label: vendor.name },
      ]}
      title={vendor.name}
      badges={
        <>
          <Pill>{plural(vendor.featureIds.length, "feature")} offered</Pill>
          <Pill>
            {vendor.requestsMet} of {vendor.requestsTotal} requests met
          </Pill>
        </>
      }
      description="The full vendor page (features offered, gaps, and what its users said) is coming soon."
    />
  );
}
