import type { Feature, FeedbackData, Sentiment, Vendor } from "@/lib/types";
import { COVERAGE_COLORS } from "@/lib/colors";
import { coverage } from "@/lib/coverage";
import { answerFor, featureMentions } from "@/lib/selectors";
import type { PanelView } from "./DetailPanel";
import { EmptyNote, Eyebrow, FeatureShape, ResponseRow, SENTIMENT } from "./ui";

type Props = {
  data: FeedbackData;
  feature: Feature;
  vendor: Vendor | null; // null = opened from the map, covering every vendor
  onOpen: (view: PanelView) => void;
};

function VendorChip({ vendor, onOpen }: { vendor: Vendor; onOpen: (view: PanelView) => void }) {
  return (
    <button
      onClick={() => onOpen({ kind: "vendor", id: vendor.id, tab: "features" })}
      className="rounded-full border border-[#2d333b] px-3 py-1 text-sm text-[#e6e8eb] transition-colors hover:border-[#4b5563] hover:bg-[#222935]"
    >
      {vendor.name}
    </button>
  );
}

export function FeatureView({ data, feature, vendor, onOpen }: Props) {
  const offeredBy = data.vendors.filter((v) => feature.vendorIds.includes(v.id));
  const offered = vendor ? feature.vendorIds.includes(vendor.id) : offeredBy.length > 0;
  const cov = coverage(feature, data.vendors.map((v) => v.id), vendor?.id ?? null);
  const statusColor = COVERAGE_COLORS[cov];
  const others = offeredBy.filter((v) => v.id !== vendor?.id);
  const grouped = featureMentions(data, feature.id, vendor?.id ?? null);
  const kinds = (Object.keys(grouped) as Sentiment[]).filter((k) => grouped[k].length > 0);
  const vendorName = (id: string) => data.vendors.find((v) => v.id === id)?.name;

  return (
    <>
      <div className="flex flex-col gap-4 px-6 pt-4">
        <div>
          <Eyebrow>Feature</Eyebrow>
          <h2 className="mt-1 flex items-center gap-3 text-2xl font-semibold text-[#f3f4f6]">
            <FeatureShape coverage={cov} />
            {feature.name}
          </h2>
        </div>

        {vendor ? (
          <div className="rounded-xl bg-[#1a1f27] px-4 py-3 text-sm">
            <div className="font-medium" style={{ color: statusColor }}>
              {offered ? `Offered by ${vendor.name}` : `Not offered by ${vendor.name}`}
            </div>
            <div className="mt-1 text-[#8b949e]">
              {others.length > 0
                ? `Also offered by ${others.map((v) => v.name).join(", ")}`
                : offered
                  ? "No other vendor offers this"
                  : "No vendor offers this yet"}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-[#1a1f27] px-4 py-3 text-sm">
            <div className="font-medium" style={{ color: statusColor }}>
              {cov === "all" ? "Offered by every vendor" : offered ? "Offered by some vendors" : "No vendor offers this yet"}
            </div>
            {offered && (
              <div className="mt-2 flex flex-wrap gap-2">
                {offeredBy.map((v) => (
                  <VendorChip key={v.id} vendor={v} onOpen={onOpen} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-b border-[#262d38] pb-2.5 text-sm font-medium text-[#e6e8eb]">
          {vendor ? <>What {vendor.name}&apos;s users said</> : "What people said"}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-6 pt-3">
        {kinds.length === 0 && (
          <EmptyNote>
            {vendor ? `No responses about ${vendor.name} mention this yet.` : "No responses mention this yet."}
          </EmptyNote>
        )}
        {kinds.map((k) => (
          <section key={k}>
            <div className="flex items-center gap-2 px-3 pb-1">
              <span className="h-2 w-2 rounded-full" style={{ background: SENTIMENT[k].color }} />
              <Eyebrow>
                {SENTIMENT[k].label} ({grouped[k].length})
              </Eyebrow>
            </div>
            {grouped[k].map((r) => (
              <ResponseRow
                key={r.id}
                response={r}
                quote={answerFor(r, k)}
                vendorName={vendor ? undefined : vendorName(r.vendorId)}
                onClick={() => onOpen({ kind: "response", id: r.id })}
              />
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
