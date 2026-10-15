import type { Metadata } from "next";
import { Suspense } from "react";
import { api, orNotFound } from "@/lib/api";
import { AsyncSlot } from "@/components/ui/AsyncSlot";
import { Skeleton } from "@/components/ui/primitives";
import { TopBar } from "@/components/shell/TopBar";
import { AnalysisStatus, DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KpiRow, KpiRowSkeleton } from "@/components/dashboard/KpiRow";
import { ResponsesByWeekCard, ResponsesByWeekSkeleton } from "@/components/dashboard/ResponsesByWeekCard";
import { CoverageCard, CoverageSkeleton } from "@/components/dashboard/CoverageCard";
import { TopFeaturesCard, TopFeaturesSkeleton } from "@/components/dashboard/TopFeaturesCard";
import { VendorFitCard, VendorFitSkeleton } from "@/components/dashboard/VendorFitCard";
import { ActivityCard, ActivitySkeleton } from "@/components/dashboard/ActivityCard";

export async function generateMetadata({ params }: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  const project = await api.getProject(projectId).catch(() => null);
  return { title: project ? `Dashboard · ${project.name}` : "Dashboard" };
}

// Each card loads its own endpoint and streams in independently.
export default async function DashboardPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await orNotFound(api.getProject(projectId));

  return (
    <>
      <TopBar crumbs={[{ label: "Projects", href: "/projects" }, { label: project.name }]} />
      <main className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-[22px]">
        <DashboardHeader
          project={project}
          status={
            <Suspense fallback={<Skeleton className="h-[22px] w-40 rounded-full" />}>
              <AnalysisStatus projectId={projectId} />
            </Suspense>
          }
        />

        <AsyncSlot title="Key numbers" fallback={<KpiRowSkeleton />}>
          <KpiRow projectId={projectId} />
        </AsyncSlot>

        <div className="grid gap-4 lg:grid-cols-[3fr_2fr] xl:grid-cols-[2fr_1fr]">
          <AsyncSlot title="Responses by week" fallback={<ResponsesByWeekSkeleton />}>
            <ResponsesByWeekCard projectId={projectId} />
          </AsyncSlot>
          <AsyncSlot title="Feature coverage" fallback={<CoverageSkeleton />}>
            <CoverageCard projectId={projectId} />
          </AsyncSlot>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.95fr]">
          <AsyncSlot title="Most discussed features" fallback={<TopFeaturesSkeleton />}>
            <TopFeaturesCard projectId={projectId} />
          </AsyncSlot>
          <AsyncSlot title="Vendor fit" fallback={<VendorFitSkeleton />}>
            <VendorFitCard projectId={projectId} />
          </AsyncSlot>
          <div className="md:col-span-2 lg:col-span-1">
            <AsyncSlot title="Recent activity" fallback={<ActivitySkeleton />}>
              <ActivityCard projectId={projectId} />
            </AsyncSlot>
          </div>
        </div>
      </main>
    </>
  );
}
