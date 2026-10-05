import type { FeedbackData, Sentiment, Vendor } from "./types";
import { answerFor } from "./selectors";

// Numbers behind "Dechante's view": two vendors compared head to head.
// Everything is computed from FeedbackData, so it works on mock or live data.

export type Tally = Record<Sentiment, number>;
const empty = (): Tally => ({ like: 0, dislike: 0, want: 0 });

// Short labels so 12 topic names fit around a radar chart. Unknown names fall back to themselves.
const SHORT: Record<string, string> = {
  "Salesforce & Google Drive integration": "Salesforce + Drive",
  "Workflow & pipeline view": "Pipeline view",
  "Task automation": "Automation",
  "Project history & timeline": "Project history",
  "Solicitation & proposal forms": "Proposals",
  "Congressional reporting docs": "Congress docs",
  "Role-based permissions": "Permissions",
  "Data sync with DIU": "DIU data sync",
  "Document import": "Doc import",
  "Finances & ledgers": "Finances",
  "Vendor collaboration": "Vendor collab",
};
export const shortName = (name: string) => SHORT[name] ?? name;

export type Cover = "both" | "a" | "b" | "none";

export function dechanteData(data: FeedbackData) {
  if (data.vendors.length !== 2) return null;
  const [A, B] = data.vendors as [Vendor, Vendor];

  const by: Record<string, Record<string, Tally>> = {};
  const wantQuote: Record<string, string> = {};
  for (const f of data.features) by[f.id] = { [A.id]: empty(), [B.id]: empty() };
  for (const r of data.responses) {
    for (const m of r.mentions ?? []) {
      const t = by[m.featureId]?.[r.vendorId];
      if (!t) continue;
      t[m.kind] += 1;
      if (m.kind === "want" && !wantQuote[m.featureId]) wantQuote[m.featureId] = m.quote ?? answerFor(r, "want");
    }
  }

  // Overall: the form's last question, "Rate your overall experience", 1 to 4.
  const overall = Object.fromEntries(
    [A, B].map((v) => {
      const vals = data.responses
        .filter((r) => r.vendorId === v.id)
        .flatMap((r) => Object.entries(r.ratings ?? {}))
        .filter(([q]) => q.toLowerCase().startsWith("rate your overall"))
        .map(([, n]) => n);
      return [v.id, vals.length ? { avg: vals.reduce((s, n) => s + n, 0) / vals.length, n: vals.length } : null];
    }),
  ) as Record<string, { avg: number; n: number } | null>;

  const totals = Object.fromEntries(
    [A, B].map((v) => {
      const t = empty();
      for (const f of data.features) for (const k of ["like", "dislike", "want"] as Sentiment[]) t[k] += by[f.id][v.id][k];
      return [v.id, t];
    }),
  ) as Record<string, Tally>;

  // Topics: the survey's own rating topics when the data says which those are, else every feature.
  const flagged = data.features.some((f) => f.known !== undefined);
  const topics = data.features
    .filter((f) => !flagged || f.known)
    .map((f) => {
      const net = { [A.id]: by[f.id][A.id].like - by[f.id][A.id].dislike, [B.id]: by[f.id][B.id].like - by[f.id][B.id].dislike };
      const winner = net[A.id] > net[B.id] ? A.id : net[B.id] > net[A.id] ? B.id : null;
      return { id: f.id, name: f.name, short: shortName(f.name), net, by: by[f.id], winner };
    });
  const wins = { [A.id]: topics.filter((t) => t.winner === A.id).length, [B.id]: topics.filter((t) => t.winner === B.id).length };
  const ties = topics.filter((t) => t.winner === null).length;

  const coverOf = (vendorIds: string[]): Cover => {
    const a = vendorIds.includes(A.id), b = vendorIds.includes(B.id);
    return a && b ? "both" : a ? "a" : b ? "b" : "none";
  };
  const cover: Record<Cover, string[]> = { both: [], a: [], b: [], none: [] };
  for (const f of data.features) cover[coverOf(f.vendorIds)].push(f.name);

  const wanted = data.features
    .map((f) => ({ name: f.name, wants: by[f.id][A.id].want + by[f.id][B.id].want, cover: coverOf(f.vendorIds), quote: wantQuote[f.id] ?? "" }))
    .filter((w) => w.wants > 0)
    .sort((x, y) => y.wants - x.wants || x.name.localeCompare(y.name));

  return { A, B, overall, totals, topics, wins, ties, cover, wanted, surveys: data.responses.length };
}

export type DechanteData = NonNullable<ReturnType<typeof dechanteData>>;
