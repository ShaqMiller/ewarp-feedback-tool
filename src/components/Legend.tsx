import { COVERAGE_COLORS, SENTIMENT_DASH } from "@/lib/colors";
import type { Coverage } from "@/lib/coverage";
import type { Group, Sentiment } from "@/lib/types";
import { GROUP_COLORS } from "./nodes";

const GROUPS: { group: Group; label: string }[] = [
  { group: "pm", label: "PMs" },
  { group: "sponsor", label: "Sponsor's team" },
  { group: "other", label: "Other groups" },
];

const LINES: { kind: Sentiment; label: string }[] = [
  { kind: "like", label: "Likes" },
  { kind: "dislike", label: "Dislikes" },
  { kind: "want", label: "Wants" },
];

function coverageLabels(focusVendorName: string | null): Record<Coverage, string> {
  return focusVendorName
    ? { all: `${focusVendorName} has it`, some: "A competitor has it", none: "No vendor has it" }
    : { all: "Every vendor has it", some: "Some vendors have it", none: "No vendor has it" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{title}</span>
      {children}
    </div>
  );
}

function Item({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2">
      {swatch}
      {label}
    </span>
  );
}

type Props = {
  hasFeatures: boolean;
  focusVendorName: string | null; // feature colors are relative to this vendor when set
};

export function Legend({ hasFeatures, focusVendorName }: Props) {
  const labels = coverageLabels(focusVendorName);

  return (
    <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-[#c9d1d9]">
      <Section title="Responses">
        {GROUPS.map((g) => (
          <Item
            key={g.group}
            label={g.label}
            swatch={<span className="h-3 w-3 rotate-45" style={{ background: GROUP_COLORS[g.group] }} />}
          />
        ))}
      </Section>

      <Section title="Features">
        {hasFeatures ? (
          (Object.keys(labels) as Coverage[]).map((c) => (
            <Item
              key={c}
              label={labels[c]}
              swatch={<span className="h-3 w-5 -skew-x-12 border-2" style={{ borderColor: COVERAGE_COLORS[c] }} />}
            />
          ))
        ) : (
          <Item
            label="Pending AI"
            swatch={<span className="h-3 w-5 -skew-x-12 border-2 border-dashed border-[#4b5563]" />}
          />
        )}
      </Section>

      {hasFeatures && (
        <Section title="Lines">
          {LINES.map((l) => (
            <Item
              key={l.kind}
              label={l.label}
              swatch={
                <svg width="28" height="6" aria-hidden>
                  <line
                    x1="2"
                    y1="3"
                    x2="26"
                    y2="3"
                    stroke="#8b949e"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeDasharray={SENTIMENT_DASH[l.kind]}
                  />
                </svg>
              }
            />
          ))}
        </Section>
      )}
    </div>
  );
}
