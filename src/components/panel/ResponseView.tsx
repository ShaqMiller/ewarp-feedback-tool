import type { FeedbackData, SurveyResponse } from "@/lib/types";
import { GROUP_LABELS } from "@/lib/types";
import { shortDate } from "@/lib/selectors";
import type { PanelView } from "./DetailPanel";
import { Diamond, Eyebrow, SENTIMENT } from "./ui";

type Props = {
  data: FeedbackData;
  response: SurveyResponse;
  onOpen: (view: PanelView) => void;
};

function Answer({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <Eyebrow>{label}</Eyebrow>
      </div>
      <p className="mt-1 text-[#e6e8eb]">{children}</p>
    </div>
  );
}

export function ResponseView({ data, response, onOpen }: Props) {
  const vendor = data.vendors.find((v) => v.id === response.vendorId);
  const mentions = response.mentions ?? [];

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6 pt-4">
      <div>
        <Eyebrow>Response</Eyebrow>
        <h2 className="mt-1 flex items-center gap-2.5 text-2xl font-semibold text-[#f3f4f6]">
          <Diamond group={response.group} size={14} />
          {GROUP_LABELS[response.group]}
        </h2>
        <p className="mt-1 text-sm text-[#8b949e]">
          {shortDate(response.submittedAt)} · about{" "}
          {vendor ? (
            <button
              onClick={() => onOpen({ kind: "vendor", id: vendor.id, tab: "features" })}
              className="text-[#c9d1d9] underline decoration-[#4b5563] underline-offset-2 hover:text-white"
            >
              {vendor.name}
            </button>
          ) : (
            "an unknown vendor"
          )}
        </p>
      </div>

      <Answer label="Likes" color={SENTIMENT.like.color}>{response.likes}</Answer>
      <Answer label="Dislikes" color={SENTIMENT.dislike.color}>{response.dislikes}</Answer>
      <Answer label="Wants" color={SENTIMENT.want.color}>{response.wants}</Answer>

      <div className="border-t border-[#262d38] pt-4">
        <Eyebrow>AI linked to</Eyebrow>
        {mentions.length === 0 ? (
          <p className="mt-1 italic text-[#6b7280]">Pending AI</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {mentions.map((m) => {
              const feature = data.features.find((f) => f.id === m.featureId);
              if (!feature) return null;
              return (
                <button
                  key={m.featureId + m.kind}
                  onClick={() => onOpen({ kind: "feature", id: feature.id, vendorId: response.vendorId })}
                  className="flex items-center gap-1.5 rounded-full border border-[#2d333b] px-3 py-1 text-sm text-[#e6e8eb] transition-colors hover:border-[#4b5563] hover:bg-[#1c222c]"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: SENTIMENT[m.kind].color }} />
                  {feature.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
