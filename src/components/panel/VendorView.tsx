import type { FeedbackData, Group, Vendor } from "@/lib/types";
import { GROUP_LABELS } from "@/lib/types";
import { coverage } from "@/lib/coverage";
import { vendorSummary, type FeatureStat } from "@/lib/selectors";
import type { PanelView, VendorTab } from "./DetailPanel";
import { Chevron, CountPills, Diamond, EmptyNote, Eyebrow, FeatureShape, ResponseRow } from "./ui";

type Props = {
  data: FeedbackData;
  vendor: Vendor;
  tab: VendorTab;
  onTab: (tab: VendorTab) => void;
  onOpen: (view: PanelView) => void;
};

function Stat({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <div className="flex-1 rounded-xl bg-[#1a1f27] px-3 py-2.5">
      <div className="text-2xl font-semibold" style={{ color: tone ?? "#e6e8eb" }}>
        {value}
      </div>
      <div className="text-xs text-[#8b949e]">{label}</div>
    </div>
  );
}

type RowProps = { stat: FeatureStat; vendorIds: string[]; vendorId: string; onClick: () => void };

function FeatureRow({ stat, vendorIds, vendorId, onClick }: RowProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#1c222c]"
    >
      <FeatureShape coverage={coverage(stat.feature, vendorIds, vendorId)} />
      <span className="min-w-0 flex-1 truncate text-sm text-[#e6e8eb]">{stat.feature.name}</span>
      <CountPills counts={stat.counts} />
      <Chevron />
    </button>
  );
}

export function VendorView({ data, vendor, tab, onTab, onOpen }: Props) {
  const { responses, offered, gaps, groups } = vendorSummary(data, vendor.id);
  const openFeature = (featureId: string) => onOpen({ kind: "feature", id: featureId, vendorId: vendor.id });
  const row = (s: FeatureStat) => (
    <FeatureRow
      key={s.feature.id}
      stat={s}
      vendorIds={data.vendors.map((v) => v.id)}
      vendorId={vendor.id}
      onClick={() => openFeature(s.feature.id)}
    />
  );

  return (
    <>
      <div className="flex flex-col gap-4 px-6 pt-6">
        <div>
          <Eyebrow>Vendor</Eyebrow>
          <h2 className="mt-1 text-2xl font-semibold text-[#f3f4f6]">{vendor.name}</h2>
        </div>

        <div className="flex gap-2">
          <Stat value={responses.length} label="Responses" />
          <Stat value={offered.length} label="Offers" tone="#3fb96b" />
          <Stat value={gaps.length} label="Gaps" tone="#e5534b" />
        </div>

        {responses.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8b949e]">
            {(Object.keys(groups) as Group[])
              .filter((g) => groups[g] > 0)
              .map((g) => (
                <span key={g} className="flex items-center gap-1.5">
                  <Diamond group={g} size={8} />
                  {groups[g]} {GROUP_LABELS[g]}
                </span>
              ))}
          </div>
        )}

        <div role="tablist" className="flex gap-6 border-b border-[#262d38]">
          {(["features", "responses"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTab(t)}
              className={`-mb-px border-b-2 pb-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-[#3b82f6] text-[#e6e8eb]"
                  : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 pt-3">
        {tab === "features" ? (
          data.features.length === 0 ? (
            <EmptyNote>Features appear here once AI has read the responses.</EmptyNote>
          ) : (
            <div className="flex flex-col gap-5">
              <section>
                <div className="px-3 pb-1">
                  <Eyebrow>Offers</Eyebrow>
                </div>
                {offered.length === 0 && <EmptyNote>No features linked to this vendor yet.</EmptyNote>}
                {offered.map(row)}
              </section>

              <section>
                <div className="px-3 pb-1">
                  <Eyebrow>Wanted, not offered</Eyebrow>
                </div>
                {gaps.length === 0 && <EmptyNote>No gaps raised for this vendor.</EmptyNote>}
                {gaps.map(row)}
              </section>
            </div>
          )
        ) : responses.length === 0 ? (
          <EmptyNote>No responses about this vendor yet.</EmptyNote>
        ) : (
          responses.map((r) => (
            <ResponseRow
              key={r.id}
              response={r}
              quote={r.likes}
              onClick={() => onOpen({ kind: "response", id: r.id })}
            />
          ))
        )}
      </div>
    </>
  );
}
