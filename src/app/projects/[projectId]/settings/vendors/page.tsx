import type { Metadata } from "next";
import { api } from "@/lib/api";
import { VendorSettings } from "@/components/settings/VendorSettings";

export const metadata: Metadata = { title: "Vendor settings" };

// Uses GET /projects/:projectId/vendors?sort=name and /features?sort=name.
// Which features each vendor offers comes from the features' vendorIds, so no extra request per vendor.
export default async function VendorSettingsPage({ params }: PageProps<"/projects/[projectId]/settings/vendors">) {
  const { projectId } = await params;
  const [vendors, features] = await Promise.all([
    api.listVendors(projectId, { sort: "name" }),
    api.listFeatures(projectId, { sort: "name" }),
  ]);

  return (
    <VendorSettings
      projectId={projectId}
      vendors={vendors.items.map((v) => ({
        id: v.id,
        name: v.name,
        form: v.form,
        responseCount: v.responseCount,
        featureIds: features.items.filter((f) => f.vendorIds.includes(v.id)).map((f) => f.id),
      }))}
      features={features.items.map((f) => ({ id: f.id, name: f.name, coverage: f.coverage }))}
    />
  );
}
