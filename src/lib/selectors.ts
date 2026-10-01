import type { Feature, FeedbackData, Group, Sentiment, SurveyResponse } from "./types";

export type Counts = Record<Sentiment, number>;

export type FeatureStat = {
  feature: Feature;
  counts: Counts;
  total: number;
};

const emptyCounts = (): Counts => ({ like: 0, dislike: 0, want: 0 });

// Everything the vendor panel needs, built from this vendor's responses.
export function vendorSummary(data: FeedbackData, vendorId: string) {
  const responses = data.responses.filter((r) => r.vendorId === vendorId);

  const counts = new Map<string, Counts>();
  for (const r of responses) {
    for (const m of r.mentions ?? []) {
      const c = counts.get(m.featureId) ?? emptyCounts();
      c[m.kind] += 1;
      counts.set(m.featureId, c);
    }
  }

  const stat = (feature: Feature): FeatureStat => {
    const c = counts.get(feature.id) ?? emptyCounts();
    return { feature, counts: c, total: c.like + c.dislike + c.want };
  };
  const byTotal = (a: FeatureStat, b: FeatureStat) => b.total - a.total;

  // Features this vendor offers, most-discussed first.
  const offered = data.features
    .filter((f) => f.vendorIds.includes(vendorId))
    .map(stat)
    .sort(byTotal);

  // Features this vendor's users brought up that the vendor doesn't offer.
  const gaps = data.features
    .filter((f) => !f.vendorIds.includes(vendorId) && counts.has(f.id))
    .map(stat)
    .sort(byTotal);

  const groups: Record<Group, number> = { pm: 0, sponsor: 0, other: 0 };
  for (const r of responses) groups[r.group] += 1;

  return { responses, offered, gaps, groups };
}

// Responses that mention `featureId`, grouped by sentiment.
// Pass a vendorId to only count responses about that vendor.
export function featureMentions(data: FeedbackData, featureId: string, vendorId: string | null) {
  const grouped: Record<Sentiment, SurveyResponse[]> = { like: [], dislike: [], want: [] };
  for (const r of data.responses) {
    if (vendorId && r.vendorId !== vendorId) continue;
    for (const m of r.mentions ?? []) {
      if (m.featureId === featureId) grouped[m.kind].push(r);
    }
  }
  return grouped;
}

// The text a response wrote for a given sentiment.
export function answerFor(r: SurveyResponse, kind: Sentiment) {
  return kind === "like" ? r.likes : kind === "dislike" ? r.dislikes : r.wants;
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
