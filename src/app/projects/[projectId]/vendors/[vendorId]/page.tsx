import { AsyncSlot } from "@/components/ui/AsyncSlot";
import {
  OfferedFeaturesCard,
  OfferedFeaturesSkeleton,
  RequestsCard,
  RequestsSkeleton,
  RespondentsCard,
  RespondentsSkeleton,
  VendorFeedbackCard,
  VendorFeedbackSkeleton,
  VendorSummaryCard,
  VendorSummarySkeleton,
} from "@/components/vendors/detail/OverviewCards";

// Vendor overview. Each card loads its own endpoint and streams in independently.
export default async function VendorOverviewPage({ params }: PageProps<"/projects/[projectId]/vendors/[vendorId]">) {
  const ids = await params;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div className="grid gap-4">
        <AsyncSlot title="Summary" fallback={<VendorSummarySkeleton />}>
          <VendorSummaryCard {...ids} />
        </AsyncSlot>
        <AsyncSlot title="What its users said" fallback={<VendorFeedbackSkeleton />}>
          <VendorFeedbackCard {...ids} />
        </AsyncSlot>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <AsyncSlot title="Requests" fallback={<RequestsSkeleton />}>
          <RequestsCard {...ids} />
        </AsyncSlot>
        <AsyncSlot title="Features offered" fallback={<OfferedFeaturesSkeleton />}>
          <OfferedFeaturesCard {...ids} />
        </AsyncSlot>
        <div className="md:col-span-2 lg:col-span-1">
          <AsyncSlot title="Who responded" fallback={<RespondentsSkeleton />}>
            <RespondentsCard {...ids} />
          </AsyncSlot>
        </div>
      </div>
    </div>
  );
}
