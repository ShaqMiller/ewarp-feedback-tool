import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { WeightSettings } from "@/components/settings/WeightSettings";
import { saveFeatureWeightsAction, saveGroupWeightsAction } from "./actions";

export const metadata: Metadata = { title: "Weights" };

// Uses GET /projects/:projectId/weights. Saving sends PUT with just that card's rows.
export default async function WeightSettingsPage({ params }: PageProps<"/projects/[projectId]/settings/weights">) {
  const { projectId } = await params;
  const weights = await api.getWeights(projectId);

  return (
    <div className="flex flex-col gap-5">
      <div className="max-w-[72ch] text-[13px] text-muted">
        <p>
          Weights decide how much each answer counts in the{" "}
          <Link href={`/projects/${projectId}/vendors`} className="font-medium text-accent hover:underline">
            vendor scores
          </Link>
          . 1 is normal, 2 counts double, 0 leaves it out. A want from a group weighted 2 about a feature weighted 3 counts 6
          times as much as a normal one.
        </p>
      </div>
      <WeightSettings
        title="Respondent groups"
        description="Who said it. Every like, dislike and want counts its group's weight, whether it came from a survey or was added by hand."
        rows={weights.groups.map((g) => ({ id: g.key, label: g.label, weight: g.weight }))}
        empty="There are no respondent groups."
        action={saveGroupWeightsAction.bind(null, projectId)}
      />
      <WeightSettings
        title="Features"
        description="What it's about. Raise the features that decide the evaluation, like a security requirement, and lower the nice-to-haves."
        rows={weights.features.map((f) => ({
          id: f.id,
          label: f.name,
          tag: f.source === "manual" ? "Manual" : undefined,
          weight: f.weight,
        }))}
        empty="Features appear once AI reads the first responses, or when an admin adds one on the Features page."
        action={saveFeatureWeightsAction.bind(null, projectId)}
      />
    </div>
  );
}
