import { AsyncSlot } from "@/components/ui/AsyncSlot";
import {
  ConnectionsCard,
  ConnectionsSkeleton,
  FeedbackCard,
  FeedbackSkeleton,
  RelatedFeaturesCard,
  RelatedFeaturesSkeleton,
  SummaryCard,
  SummarySkeleton,
  VendorCoverageCard,
  VendorCoverageSkeleton,
} from "@/components/features/detail/OverviewCards";

// Feature overview. Each card loads its own endpoint and streams in independently.
export default async function FeatureOverviewPage({ params }: PageProps<"/projects/[projectId]/features/[featureId]">) {
  const ids = await params;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div className="grid gap-4">
        <AsyncSlot title="Summary" fallback={<SummarySkeleton />}>
          <SummaryCard {...ids} />
        </AsyncSlot>
        <AsyncSlot title="What people said" fallback={<FeedbackSkeleton />}>
          <FeedbackCard {...ids} />
        </AsyncSlot>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <AsyncSlot title="Vendor coverage" fallback={<VendorCoverageSkeleton />}>
          <VendorCoverageCard {...ids} />
        </AsyncSlot>
        <AsyncSlot title="Connections" fallback={<ConnectionsSkeleton />}>
          <ConnectionsCard {...ids} />
        </AsyncSlot>
        <div className="md:col-span-2 lg:col-span-1">
          <AsyncSlot title="Mentioned alongside" fallback={<RelatedFeaturesSkeleton />}>
            <RelatedFeaturesCard {...ids} />
          </AsyncSlot>
        </div>
      </div>
    </div>
  );
}
