import type { ResponseDetail } from "@/lib/api/types";
import { cn } from "@/lib/format";

type Section = NonNullable<ResponseDetail["sections"]>[number];
type Answer = Section["answers"][number];

type Scale = { min: number; max: number };

// "Rate X (1-10)", "from 1 to 5", "on a scale of 1–7", "out of 10": the scale the question names, if any.
function scaleOf(question: string): Scale | null {
  const range = question.match(/(\d+)\s*(?:-|–|—|to)\s*(\d+)/i);
  if (range) {
    const [min, max] = [Number(range[1]), Number(range[2])];
    if (min < max && max <= 100) return { min: Math.max(min, 1), max };
  }
  const outOf = question.match(/out of (\d+)/i);
  return outOf ? { min: 1, max: Number(outOf[1]) } : null;
}

// Low third red, middle amber, top third green: 1–4 / 5–7 / 8–10 on a 1–10 scale, 1–2 / 3 / 4–5 on 1–5.
type Band = "low" | "mid" | "high";
function bandOf(value: number, { min, max }: Scale): Band {
  const share = max === min ? 1 : (value - min) / (max - min);
  return share < 1 / 3 + 0.01 ? "low" : share < 2 / 3 ? "mid" : "high";
}
const BAND = {
  low: { fill: "bg-dislike", pill: "bg-dislike-soft text-dislike", label: "Low" },
  mid: { fill: "bg-gap", pill: "bg-gap-soft text-gap", label: "Okay" },
  high: { fill: "bg-like", pill: "bg-like-soft text-like", label: "High" },
} as const;

// 0 on our surveys means "doesn't apply to me".
function NotApplicable() {
  return (
    <span
      title="Answered 0: doesn't apply to them"
      className="inline-flex h-6 items-center rounded-full border border-dashed border-line px-2.5 text-xs font-medium text-muted"
    >
      N/A
    </span>
  );
}

// A rating: the number in a red / amber / green pill, then the scale with each step in its own colour, filled up to it.
function Rating({ value, scale }: { value: number; scale: Scale }) {
  const { min, max } = scale;
  const band = BAND[bandOf(value, scale)];
  const steps = max - min + 1;
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className={cn("inline-flex h-6 items-baseline gap-0.5 rounded-full px-2.5 pt-[3px] text-[13px] font-semibold tabular-nums", band.pill)}>
        {value}
        <span className="text-[11px] font-normal opacity-75">/{max}</span>
      </span>
      {steps <= 10 ? (
        <span aria-hidden="true" className="flex gap-[3px]">
          {Array.from({ length: steps }, (_, i) => (
            <span
              key={i}
              className={cn("h-2.5 w-3 rounded-[2px]", i + min <= value ? BAND[bandOf(i + min, scale)].fill : "bg-chip")}
            />
          ))}
        </span>
      ) : (
        <span aria-hidden="true" className="h-2.5 w-28 overflow-hidden rounded-full bg-chip">
          <span
            className={cn("block h-full rounded-full", band.fill)}
            style={{ width: `${Math.round(((value - min + 1) / steps) * 100)}%` }}
          />
        </span>
      )}
      <span className="text-[11px] text-muted">{band.label}</span>
    </span>
  );
}

// The question's scale and the number, when the answer is a rating; "na" when they answered 0.
// Any answer that's just a whole number counts as a rating. If the question doesn't name its scale,
// it's read as 1–5 (1–10 when the answer is above 5); numbers above 10 stay plain text.
function ratingOf(answer: Answer): { scale: Scale; value: number | "na" } | null {
  if (answer.values.length !== 1) return null;
  const text = answer.values[0].trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const n = Number(text);
  const scale = scaleOf(answer.question) ?? (n <= 5 ? { min: 1, max: 5 } : n <= 10 ? { min: 1, max: 10 } : null);
  if (!scale) return null;
  if (n === 0) return { scale, value: "na" };
  return n >= scale.min && n <= scale.max ? { scale, value: n } : null;
}

function AnswerValue({ answer }: { answer: Answer }) {
  const { values } = answer;
  const rating = ratingOf(answer);
  if (rating) return rating.value === "na" ? <NotApplicable /> : <Rating value={rating.value} scale={rating.scale} />;
  if (values.length === 1) return <span className="whitespace-pre-line">{values[0]}</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <li key={v} className="inline-flex min-h-6 items-center rounded-full bg-chip px-2.5 text-xs font-medium">
          {v}
        </li>
      ))}
    </ul>
  );
}

// Everything the respondent filled in, section by section (e.g. one per role they picked).
// Likes / dislikes / wants already shown above the card are left out, as are names and contact details.
export function SurveyAnswers({ sections }: { sections: Section[] }) {
  const rated = sections.some((s) => s.answers.some((a) => ratingOf(a)));
  return (
    <div className="grid gap-5">
      {rated && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-dislike" />Low</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-gap" />Okay</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-like" />High</span>
          <span>0 = N/A (doesn&apos;t apply to them)</span>
        </p>
      )}
      {sections.map((section, i) => (
        <section key={i} aria-label={section.title ?? "General"} className="grid gap-3">
          {section.title && (
            <h3 className="flex items-center gap-2 text-xs font-semibold text-ink">
              <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-accent" />
              {section.title}
            </h3>
          )}
          <dl className={cn("grid gap-3 text-[13px]", section.title && "border-l border-line pl-3.5 ml-px")}>
            {section.answers.map((a, j) => (
              <div key={j} className="grid gap-1">
                <dt className="text-xs text-muted">{a.question}</dt>
                <dd>
                  <AnswerValue answer={a} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
