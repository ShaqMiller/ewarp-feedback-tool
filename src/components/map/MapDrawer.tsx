"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GROUP_LABELS, type Id, type ProjectGraph, type Sentiment } from "@/lib/api/types";
import { cn, formatDate, plural } from "@/lib/format";
import { XIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/primitives";
import type { Selection } from "./layout";

type Props = {
  graph: ProjectGraph;
  selection: Selection;
  projectId: string;
  onSelect: (selection: Selection) => void;
};

const KINDS: Sentiment[] = ["like", "dislike", "want"];
const KIND_LABEL: Record<Sentiment, string> = { like: "Like", dislike: "Dislike", want: "Want" };
const KIND_DOT: Record<Sentiment, string> = { like: "bg-like", dislike: "bg-dislike", want: "bg-want" };
const KIND_FIELD = { like: "likes", dislike: "dislikes", want: "wants" } as const;
const KIND_SOFT: Record<Sentiment, string> = { like: "bg-like-soft", dislike: "bg-dislike-soft", want: "bg-want-soft" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-3.5">
      <h3 className="mb-2 text-[11px] font-medium text-muted">{title}</h3>
      {children}
    </section>
  );
}

// A row inside the drawer that selects another node on the map.
function JumpRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-chip"
    >
      {children}
    </button>
  );
}

function Chip({ onClick, dot, children }: { onClick: () => void; dot?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 items-center gap-1.5 rounded-full bg-chip px-2.5 text-xs font-medium transition-colors hover:bg-line"
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot)} />}
      {children}
    </button>
  );
}

function Guide() {
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <h2 className="text-[15px] font-semibold">How to read the map</h2>
      <p className="text-muted">
        Each response sits above the vendor it&apos;s about. Lines run from a response to the features it mentions, and from each
        feature to the vendors that offer it.
      </p>
      <p className="text-muted">Select any response, feature or vendor to trace its connections.</p>
    </div>
  );
}

export function MapDrawer({ graph, selection, projectId, onSelect }: Props) {
  if (!selection) return <Guide />;

  const featureName = (id: Id) => graph.features.find((f) => f.id === id)?.name ?? "Unknown feature";
  const close = (
    <button
      type="button"
      onClick={() => onSelect(null)}
      aria-label="Close details"
      className="grid size-7 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-chip hover:text-ink"
    >
      <XIcon className="size-4" />
    </button>
  );
  const header = (eyebrow: string, title: string, sub?: ReactNode) => (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold tracking-[0.08em] text-faint uppercase">{eyebrow}</p>
        <h2 className="mt-0.5 text-[17px] leading-snug font-semibold">{title}</h2>
        {sub}
      </div>
      {close}
    </div>
  );
  const openLink = (href: string, label: string) => (
    <Link
      href={href}
      className="mt-1 inline-flex h-[34px] items-center justify-center rounded-[7px] bg-ink px-3 text-[13px] font-medium text-surface"
    >
      {label}
    </Link>
  );

  if (selection.kind === "feature") {
    const f = graph.features.find((f) => f.id === selection.id);
    if (!f) return <Guide />;
    const links = graph.links.filter((l) => l.featureId === f.id);
    const counts = Object.fromEntries(KINDS.map((k) => [k, links.filter((l) => l.kind === k).length])) as Record<Sentiment, number>;
    const offering = graph.vendors.filter((v) => f.vendorIds.includes(v.id));
    return (
      <div className="flex flex-col gap-3.5">
        {header(
          "Feature",
          f.name,
          <div className="mt-2 flex flex-wrap gap-1.5">
            {f.coverage === "none" ? (
              <Pill tone="gap">No vendor offers this</Pill>
            ) : (
              <Pill>{f.coverage === "all" ? "Offered by all vendors" : `Offered by ${offering.length} of ${graph.vendors.length}`}</Pill>
            )}
            {KINDS.filter((k) => counts[k] > 0).map((k) => (
              <Pill key={k} tone={k}>
                {plural(counts[k], KIND_LABEL[k].toLowerCase())}
              </Pill>
            ))}
          </div>,
        )}
        <Section title={`Mentioned in ${plural(links.length, "response")}`}>
          {links.length === 0 ? (
            <p className="text-xs text-faint">No responses mention this in the current view.</p>
          ) : (
            links.map((l) => {
              const r = graph.responses.find((r) => r.id === l.responseId)!;
              return (
                <JumpRow key={`${l.responseId}-${l.kind}`} onClick={() => onSelect({ kind: "response", id: r.id })}>
                  <span className={cn("size-1.5 shrink-0 rounded-full", KIND_DOT[l.kind])} />
                  <span className="min-w-0 flex-1 truncate">
                    {GROUP_LABELS[r.group]} · {r.vendor.name}
                  </span>
                  <span className="text-faint">{formatDate(r.submittedAt)}</span>
                </JumpRow>
              );
            })
          )}
        </Section>
        <Section title="Offered by">
          {offering.length === 0 ? (
            <p className="text-xs text-faint">No vendor offers this yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {offering.map((v) => (
                <Chip key={v.id} onClick={() => onSelect({ kind: "vendor", id: v.id })}>
                  {v.name}
                </Chip>
              ))}
            </div>
          )}
        </Section>
        {openLink(`/projects/${projectId}/features/${f.id}`, "Open feature page")}
      </div>
    );
  }

  if (selection.kind === "vendor") {
    const v = graph.vendors.find((v) => v.id === selection.id);
    if (!v) return <Guide />;
    const rs = graph.responses.filter((r) => r.vendor.id === v.id);
    const offered = graph.features.filter((f) => f.vendorIds.includes(v.id));
    const requested = new Set(graph.links.filter((l) => l.kind === "want").map((l) => l.featureId));
    const met = offered.filter((f) => requested.has(f.id)).length;
    return (
      <div className="flex flex-col gap-3.5">
        {header(
          "Vendor",
          v.name,
          <div className="mt-2 flex flex-wrap gap-1.5">
            {requested.size > 0 && (
              <Pill tone="accent">
                Meets {met} of {requested.size} requests
              </Pill>
            )}
            <Pill>{plural(offered.length, "feature")} offered</Pill>
          </div>,
        )}
        <Section title={plural(rs.length, "response")}>
          {rs.length === 0 ? (
            <p className="text-xs text-faint">No responses about this vendor in the current view.</p>
          ) : (
            rs.map((r) => (
              <JumpRow key={r.id} onClick={() => onSelect({ kind: "response", id: r.id })}>
                <span className="min-w-0 flex-1 truncate">{GROUP_LABELS[r.group]}</span>
                <span className="text-faint">{formatDate(r.submittedAt)}</span>
              </JumpRow>
            ))
          )}
        </Section>
        <Section title="Features offered">
          {offered.length === 0 ? (
            <p className="text-xs text-faint">None recorded.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {offered.map((f) => (
                <Chip key={f.id} onClick={() => onSelect({ kind: "feature", id: f.id })}>
                  {f.name}
                </Chip>
              ))}
            </div>
          )}
        </Section>
        {openLink(`/projects/${projectId}/vendors/${v.id}`, "Open vendor page")}
      </div>
    );
  }

  const r = graph.responses.find((r) => r.id === selection.id);
  if (!r) return <Guide />;
  const links = graph.links.filter((l) => l.responseId === r.id);
  const kinds = new Set(links.map((l) => l.kind));
  return (
    <div className="flex flex-col gap-3.5">
      {header(
        "Response",
        GROUP_LABELS[r.group],
        <p className="mt-0.5 text-xs text-muted">
          <button type="button" onClick={() => onSelect({ kind: "vendor", id: r.vendor.id })} className="rounded hover:text-ink hover:underline">
            {r.vendor.name}
          </button>{" "}
          · {formatDate(r.submittedAt)}
        </p>,
      )}
      <dl className="grid gap-1 text-[13px]">
        {KINDS.map((k) => (
          <div key={k} className={cn("rounded-md px-2 py-1.5", kinds.has(k) && KIND_SOFT[k])}>
            <dt className="text-[11px] font-medium text-muted">{KIND_LABEL[k]}s</dt>
            <dd className={kinds.has(k) ? "text-ink" : "text-muted"}>{r[KIND_FIELD[k]] || "—"}</dd>
          </div>
        ))}
      </dl>
      <Section title="Linked features">
        {links.length === 0 ? (
          <p className="text-xs text-faint">{r.analyzed ? "AI didn't link any features." : "Waiting for AI to read this response."}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {links.map((l) => (
              <Chip key={`${l.featureId}-${l.kind}`} dot={KIND_DOT[l.kind]} onClick={() => onSelect({ kind: "feature", id: l.featureId })}>
                {featureName(l.featureId)}
              </Chip>
            ))}
          </div>
        )}
      </Section>
      {openLink(`/projects/${projectId}/responses/${r.id}`, "Open response")}
    </div>
  );
}
