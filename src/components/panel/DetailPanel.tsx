import type { FeedbackData } from "@/lib/types";
import { FeatureView } from "./FeatureView";
import { ResponseView } from "./ResponseView";
import { VendorView } from "./VendorView";

export type VendorTab = "features" | "responses";

// What the side panel is showing. The panel keeps a stack of these so Back works.
export type PanelView =
  | { kind: "response"; id: string }
  | { kind: "vendor"; id: string; tab: VendorTab }
  | { kind: "feature"; id: string; vendorId: string | null }; // null = all vendors

type Props = {
  data: FeedbackData;
  view: PanelView | null;
  previous: PanelView | null;
  onOpen: (view: PanelView) => void;
  onBack: () => void;
  onTab: (tab: VendorTab) => void;
};

function labelFor(data: FeedbackData, view: PanelView) {
  if (view.kind === "vendor") return data.vendors.find((v) => v.id === view.id)?.name ?? "Vendor";
  if (view.kind === "feature") return data.features.find((f) => f.id === view.id)?.name ?? "Feature";
  return "Response";
}

function body({ data, view, onOpen, onTab }: Props) {
  if (!view) {
    return (
      <div className="px-6 pt-6">
        <h2 className="text-lg font-semibold text-[#3b82f6]">Node detail</h2>
        <p className="mt-3 text-[#c9d1d9]">Click a response or a vendor on the map.</p>
      </div>
    );
  }

  if (view.kind === "response") {
    const response = data.responses.find((r) => r.id === view.id);
    return response && <ResponseView data={data} response={response} onOpen={onOpen} />;
  }

  if (view.kind === "vendor") {
    const vendor = data.vendors.find((v) => v.id === view.id);
    return vendor && <VendorView data={data} vendor={vendor} tab={view.tab} onTab={onTab} onOpen={onOpen} />;
  }

  const feature = data.features.find((f) => f.id === view.id);
  const vendor = data.vendors.find((v) => v.id === view.vendorId) ?? null;
  return feature && <FeatureView data={data} feature={feature} vendor={vendor} onOpen={onOpen} />;
}

export function DetailPanel(props: Props) {
  const { data, previous, onBack } = props;

  return (
    <aside className="flex h-full w-96 shrink-0 flex-col overflow-hidden rounded-2xl border border-[#262d38] bg-[#131820]">
      {previous && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 self-start px-5 pt-5 text-sm text-[#8b949e] transition-colors hover:text-[#e6e8eb]"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
            <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
          {labelFor(data, previous)}
        </button>
      )}
      {body(props)}
    </aside>
  );
}
