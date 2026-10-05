"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFeedbackMap, type DataSource } from "@/hooks/useFeedbackMap";
import { dechanteData, shortName, type Cover, type DechanteData } from "@/lib/dechanteData";
import css from "./DechanteView.module.css";

// Dechante's view: two vendors head to head, picture first, details on hover.
// Blue = first vendor, orange = second, on every chart.
const COLOR = { a: "#3987e5", b: "#d95926" };
const INK = "#e6e8eb";
const MUTED = "#8b949e";
const GRID = "#222b35";
const AXIS = "#38434f";

type Tip = { text: string; x: number; y: number } | null;
type TipFn = (text: string) => {
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onFocus: (e: React.FocusEvent) => void;
  onBlur: () => void;
  tabIndex: number;
};

function useTip(): [Tip, TipFn] {
  const [tip, setTip] = useState<Tip>(null);
  const at = (el: Element, text: string) => {
    const r = el.getBoundingClientRect();
    setTip({ text, x: r.left + window.scrollX + r.width / 2, y: r.top + window.scrollY });
  };
  const bind: TipFn = (text) => ({
    onMouseEnter: (e) => at(e.currentTarget, text),
    onMouseLeave: () => setTip(null),
    onFocus: (e) => at(e.currentTarget, text),
    onBlur: () => setTip(null),
    tabIndex: 0,
  });
  return [tip, bind];
}

const plural = (n: number, w: string) => `${n} ${n === 1 ? w : `${w}s`}`;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

function Dot({ color, size = 12 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color }} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-[#f3f4f6]">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#1f252e] bg-[#11151c] p-5 ${className}`}>{children}</div>;
}

/* 1. overall: gauges + tug of war */
function Gauge({ name, color, value, n, tip }: { name: string; color: string; value: number; n: number; tip: TipFn }) {
  const th = Math.PI * (1 - value / 4);
  const ex = 100 + 80 * Math.cos(th), ey = 100 - 80 * Math.sin(th);
  const len = 80 * Math.PI * (value / 4);
  return (
    <div className="flex flex-col items-center gap-1" {...tip(`${name}\nAverage overall rating ${value.toFixed(4)} from ${plural(n, "person")}`)}>
      <svg viewBox="0 0 200 124" className="w-full max-w-[240px]" role="img" aria-label={`${name}: ${value.toFixed(2)} out of 4`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={GRID} strokeWidth={16} strokeLinecap="round" />
        <path
          d={`M20 100 A80 80 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`}
          fill="none" stroke={color} strokeWidth={16} strokeLinecap="round"
          className={css.draw} style={{ ["--len" as string]: `${len}` }}
        />
        <text x={100} y={92} textAnchor="middle" fontSize={38} fontWeight={700} fill={INK}>{value.toFixed(2)}</text>
        <text x={100} y={116} textAnchor="middle" fontSize={12} fill={MUTED}>out of 4</text>
      </svg>
      <span className="flex items-center gap-2 font-semibold text-[#f3f4f6]"><Dot color={color} />{name}</span>
    </div>
  );
}

function Overall({ d, tip }: { d: DechanteData; tip: TipFn }) {
  const oa = d.overall[d.A.id], ob = d.overall[d.B.id];
  const rows: [keyof DechanteData["totals"][string], string, string][] = [
    ["like", "Likes", "M7 10.5v10H4v-10zM7 10.5l4-7.5c1.7 0 2.6 1.2 2.2 3l-.7 3H19a2 2 0 0 1 2 2.3l-1.3 7.4a2 2 0 0 1-2 1.8H7"],
    ["dislike", "Dislikes", "M7 13.5v-10H4v10zM7 13.5l4 7.5c1.7 0 2.6-1.2 2.2-3l-.7-3H19a2 2 0 0 0 2-2.3l-1.3-7.4a2 2 0 0 0-2-1.8H7"],
    ["want", "Asks", "M12 5v14M5 12h14"],
  ];
  return (
    <Card>
      {oa && ob && (
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Gauge name={d.A.name} color={COLOR.a} value={oa.avg} n={oa.n} tip={tip} />
          <span className="grid h-11 w-11 place-items-center rounded-full border border-[#262d38] font-mono text-sm text-[#8b949e]">vs</span>
          <Gauge name={d.B.name} color={COLOR.b} value={ob.avg} n={ob.n} tip={tip} />
        </div>
      )}
      <div className="flex flex-col gap-3">
        {rows.map(([k, label, mark]) => {
          const a = d.totals[d.A.id][k], b = d.totals[d.B.id][k], t = a + b || 1;
          return (
            <div key={k} className="grid grid-cols-[92px_34px_minmax(0,1fr)_34px] items-center gap-2.5">
              <span className="flex items-center gap-2 text-sm text-[#a3acb9]"><svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="#e6e8eb" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={mark} /></svg>{label}</span>
              <span className="text-center font-mono font-bold text-[#f3f4f6]">{a}</span>
              <div className="relative flex h-4 gap-[2px]" {...tip(`${label}\n${d.A.name}: ${a}\n${d.B.name}: ${b}`)}>
                <i className={`h-full rounded-l-lg ${css.growLeft}`} style={{ width: `${(a / t) * 100}%`, background: COLOR.a }} />
                <i className={`h-full rounded-r-lg ${css.growRight}`} style={{ width: `${(b / t) * 100}%`, background: COLOR.b }} />
                <span className="absolute -top-1 -bottom-1 left-1/2 w-0.5 -translate-x-1/2 bg-[#e6e8eb]/50" />
              </div>
              <span className="text-center font-mono font-bold text-[#f3f4f6]">{b}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* 2. radar: score per topic = likes minus dislikes */
function Radar({ d, tip }: { d: DechanteData; tip: TipFn }) {
  const T = d.topics, n = T.length, R = 170;
  const M = Math.max(1, ...T.flatMap((t) => [Math.abs(t.net[d.A.id]), Math.abs(t.net[d.B.id])]));
  const r = (v: number) => ((v + M) / (2 * M)) * R;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number) => [r(v) * Math.cos(ang(i)), r(v) * Math.sin(ang(i))];
  const rings = Array.from({ length: 2 * M }, (_, i) => i - M + 1);
  const ta = ang(0) + Math.PI / n;
  if (n < 3) return <p className="text-sm text-[#8b949e]">Needs at least 3 topics.</p>;

  return (
    <Card>
      <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_200px]">
        <svg viewBox="-350 -222 700 444" className="w-full overflow-visible" role="img" aria-label="Radar chart of each topic score for both vendors">
          {rings.map((v) => <circle key={v} r={r(v)} fill="none" stroke={v === 0 ? AXIS : GRID} strokeWidth={v === 0 ? 2 : 1} />)}
          {T.map((t, i) => { const [x, y] = pt(i, M); return <line key={t.id} x1={0} y1={0} x2={x} y2={y} stroke={GRID} />; })}
          {rings.map((v) => <text key={v} x={r(v) * Math.cos(ta) + 3} y={r(v) * Math.sin(ta) + 4} fontSize={12} fill={MUTED} fontFamily="var(--font-geist-mono)">{signed(v)}</text>)}
          {([["a", d.A.id], ["b", d.B.id]] as const).map(([k, id], j) => (
            <polygon
              key={id}
              points={T.map((t, i) => pt(i, t.net[id]).map((q) => q.toFixed(1)).join(",")).join(" ")}
              fill={COLOR[k]} fillOpacity={0.16} stroke={COLOR[k]} strokeWidth={2.5} strokeLinejoin="round"
              className={css.popCenter} style={{ animationDelay: `${j * 200}ms` }}
            />
          ))}
          {([["a", d.A.id], ["b", d.B.id]] as const).map(([k, id]) =>
            T.map((t, i) => { const [x, y] = pt(i, t.net[id]); return <circle key={`${id}-${t.id}`} cx={x} cy={y} r={6} fill={COLOR[k]} stroke="#11151c" strokeWidth={2} />; }),
          )}
          {T.map((t, i) => {
            const [x, y] = pt(i, M), lx = x * 1.13, ly = y * 1.1;
            const anchor = Math.abs(lx) < 20 ? "middle" : lx > 0 ? "start" : "end";
            const text = `${t.name}\n${d.A.name}: ${plural(t.by[d.A.id].like, "like")}, ${plural(t.by[d.A.id].dislike, "dislike")} → ${signed(t.net[d.A.id])}\n${d.B.name}: ${plural(t.by[d.B.id].like, "like")}, ${plural(t.by[d.B.id].dislike, "dislike")} → ${signed(t.net[d.B.id])}`;
            return (
              <g key={t.id} {...tip(text)} className="cursor-default outline-none">
                <circle cx={x} cy={y} r={16} fill="transparent" />
                <text x={lx} y={ly + 5} textAnchor={anchor} fontWeight={600} fill="#b3bec9" className={css.rlab}>{t.short}</text>
              </g>
            );
          })}
        </svg>
        <div className="grid grid-cols-3 gap-2.5 md:grid-cols-1">
          {[
            { label: `${d.A.name} wins`, n: d.wins[d.A.id], color: COLOR.a },
            { label: `${d.B.name} wins`, n: d.wins[d.B.id], color: COLOR.b },
            { label: "Tied", n: d.ties, color: AXIS },
          ].map((w) => (
            <div key={w.label} className="flex flex-col gap-1 rounded-xl bg-[#19222c] px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-[#a3acb9]"><Dot color={w.color} />{w.label}</span>
              <b className="text-3xl text-[#f3f4f6]">{w.n}</b>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* 3. venn: who has which features */
function Venn({ d, tip }: { d: DechanteData; tip: TipFn }) {
  const C = d.cover;
  const list = (a: string[]) => (a.length ? a.join("\n") : "None");
  const region = (x: number, names: string[], sub: string, title: string) => (
    <g {...tip(`${title}\n\n${list(names)}`)} className="cursor-default outline-none">
      <circle cx={x} cy={158} r={48} fill="transparent" />
      <text x={x} y={168} textAnchor="middle" fontSize={46} fontWeight={700} fill={INK}>{names.length}</text>
      <text x={x} y={192} textAnchor="middle" fontSize={12} fill={MUTED} letterSpacing="0.06em">{sub}</text>
    </g>
  );
  return (
    <Card>
      <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_200px]">
        <svg viewBox="0 0 560 300" className="mx-auto w-full max-w-[560px]" role="img"
          aria-label={`${C.a.length} only ${d.A.name}, ${C.both.length} both, ${C.b.length} only ${d.B.name}`}>
          <circle cx={205} cy={160} r={125} fill={COLOR.a} fillOpacity={0.14} stroke={COLOR.a} strokeWidth={2.5} className={css.fade} />
          <circle cx={355} cy={160} r={125} fill={COLOR.b} fillOpacity={0.14} stroke={COLOR.b} strokeWidth={2.5} className={css.fade} />
          <text x={150} y={22} textAnchor="middle" fontSize={17} fontWeight={700} fill={COLOR.a}>{d.A.name}</text>
          <text x={410} y={22} textAnchor="middle" fontSize={17} fontWeight={700} fill={COLOR.b}>{d.B.name}</text>
          {region(140, C.a, "ONLY", `Only ${d.A.name} has these`)}
          {region(280, C.both, "BOTH", "Both have these")}
          {region(420, C.b, "ONLY", `Only ${d.B.name} has these`)}
        </svg>
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[#38434f] bg-[#19222c] p-5 text-center" {...tip(`Nobody has these yet\n\n${list(C.none)}`)}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#d03b3b]/20 text-lg text-[#f3f4f6]" aria-hidden>×</span>
          <b className="text-5xl text-[#f3f4f6]">{C.none.length}</b>
          <span className="text-sm text-[#a3acb9]">nobody has</span>
        </div>
      </div>
    </Card>
  );
}

/* 4. bubbles: what people ask for, size = number of asks */
const COVER_TEXT = (d: DechanteData): Record<Cover, string> => ({
  both: "Both have it", a: `Only ${d.A.name} has it`, b: `Only ${d.B.name} has it`, none: "Nobody has it yet",
});
const BUBBLE_STYLE: Record<Cover, { fill: string; stroke?: string; sw?: number; text: string }> = {
  both: { fill: "rgba(237,242,247,.07)", stroke: AXIS, sw: 1.5, text: INK },
  a: { fill: COLOR.a, text: "#fff" },
  b: { fill: COLOR.b, text: "#fff" },
  none: { fill: "#11151c", stroke: INK, sw: 2.5, text: INK },
};

function Bubbles({ d, tip }: { d: DechanteData; tip: TipFn }) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // Spiral packing: largest bubble first, each one walks out from the center until it fits.
  // Wide blob on desktop, tall blob on a phone so labels stay readable.
  const placed = useMemo(() => {
    const stretch = narrow ? 0.7 : 1.6;
    const items = d.wanted.map((w) => ({ ...w, r: 34 * Math.sqrt(w.wants), x: 0, y: 0 })).sort((p, q) => q.r - p.r);
    const out: typeof items = [];
    for (const it of items) {
      for (let t = 0; ; t += 0.05) {
        const dd = 4 * t, x = dd * Math.cos(t) * stretch, y = dd * Math.sin(t);
        if (out.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + it.r + 4)) { out.push({ ...it, x, y }); break; }
      }
    }
    return out;
  }, [d.wanted, narrow]);
  if (!placed.length) return <p className="text-sm text-[#8b949e]">Nobody asked for anything yet.</p>;
  const minX = Math.min(...placed.map((p) => p.x - p.r)) - 6, maxX = Math.max(...placed.map((p) => p.x + p.r)) + 6;
  const minY = Math.min(...placed.map((p) => p.y - p.r)) - 6, maxY = Math.max(...placed.map((p) => p.y + p.r)) + 6;
  const covText = COVER_TEXT(d);
  const fs = narrow ? 14 : 12;

  return (
    <>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[#a3acb9]">
        {(["none", "a", "b", "both"] as Cover[]).map((c) => (
          <span key={c} className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: BUBBLE_STYLE[c].fill, border: BUBBLE_STYLE[c].stroke ? `2px solid ${BUBBLE_STYLE[c].stroke}` : undefined }} />
            {c === "none" ? "Nobody has it" : c === "both" ? "Both have it" : covText[c].replace(" has it", "")}
          </span>
        ))}
        <span>Bigger = more people asked</span>
      </div>
      <Card>
        <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="mx-auto block w-full max-w-[820px]" role="img" aria-label="Bubble chart of the most asked for features">
          {placed.map((p, i) => {
            const st = BUBBLE_STYLE[p.cover];
            const words = shortName(p.name).split(" ");
            const half = Math.ceil(words.length / 2);
            const lines = words.length > 1 && p.r < 60 ? [words.slice(0, half).join(" "), words.slice(half).join(" ")] : [words.join(" ")];
            return (
              <g key={p.name} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`} {...tip(`${p.name}: ${plural(p.wants, "ask")}\n${covText[p.cover]}${p.quote ? `\n\n“${p.quote}”` : ""}`)} className="cursor-default outline-none">
                <g className={css.pop} style={{ animationDelay: `${Math.min(i, 20) * 40}ms` }}>
                  <circle r={p.r} fill={st.fill} stroke={st.stroke} strokeWidth={st.sw} />
                  {lines.map((ln, j) => (
                    <text key={j} y={-6 + (j - (lines.length - 1) / 2) * (fs + 2)} textAnchor="middle" fontSize={fs} fill={st.text}>{ln}</text>
                  ))}
                  <text y={10 + (lines.length - 1) * 7} textAnchor="middle" fontSize={fs + 3} fontWeight={700} fill={st.text} fontFamily="var(--font-geist-mono)">{p.wants}</text>
                </g>
              </g>
            );
          })}
        </svg>
      </Card>
    </>
  );
}

export function DechanteView() {
  const [source, setSource] = useState<DataSource>(process.env.NEXT_PUBLIC_FEEDBACK_API_URL ? "live" : "mock");
  const { data, loading, error } = useFeedbackMap(source);
  const d = useMemo(() => (data ? dechanteData(data) : null), [data]);
  const [tip, bind] = useTip();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1080px] flex-col gap-10 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm text-[#8b949e] hover:text-[#e6e8eb]">← Feedback map</Link>
          <div role="radiogroup" aria-label="Data source" className="flex rounded-full border border-[#262d38] bg-[#131820] p-1">
            {(["live", "mock"] as DataSource[]).map((s) => (
              <button key={s} role="radio" aria-checked={source === s} onClick={() => setSource(s)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${source === s ? "bg-[#262d38] text-[#f3f4f6]" : "text-[#8b949e] hover:text-[#c9d1d9]"}`}>
                {s === "live" ? "Live data" : "Mock data"}
              </button>
            ))}
          </div>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#8b949e]">Dechante&apos;s view · hover anything for details</p>
        {d && (
          <h1 className="flex flex-wrap items-center gap-x-4 gap-y-1 text-4xl font-bold text-[#f3f4f6] sm:text-5xl">
            <span className="flex items-center gap-3"><Dot color={COLOR.a} size={14} />{d.A.name}</span>
            <span className="font-mono text-lg font-medium text-[#8b949e]">vs</span>
            <span className="flex items-center gap-3"><Dot color={COLOR.b} size={14} />{d.B.name}</span>
          </h1>
        )}
      </header>

      {loading && <p className="text-sm text-[#8b949e]">Loading feedback…</p>}
      {error && <p className="text-sm text-[#e88f9b]">{error}</p>}
      {data && !d && (
        <p className="text-sm text-[#8b949e]">This view compares exactly 2 vendors. This data has {data.vendors.length}. Switch to live data.</p>
      )}
      {d && (
        <>
          <Section title="Overall"><Overall d={d} tip={bind} /></Section>
          <Section title="Topic by topic">
            <p className="text-sm text-[#a3acb9]">Bigger shape = more praise. Bold ring = 0, inside it = more complaints.</p>
            <Radar d={d} tip={bind} />
          </Section>
          <Section title="Who has what"><Venn d={d} tip={bind} /></Section>
          <Section title="Most asked for"><Bubbles d={d} tip={bind} /></Section>
        </>
      )}

      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-[280px] -translate-x-1/2 -translate-y-full whitespace-pre-line rounded-lg border border-[#262d38] bg-[#131a22] px-3 py-2 text-sm text-[#e6e8eb] shadow-xl"
          style={{ left: tip.x, top: tip.y - 8 }}
        >
          {tip.text}
        </div>
      )}
    </main>
  );
}
