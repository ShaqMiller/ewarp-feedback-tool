import type { ResponseDetail } from "@/lib/api/types";
import { cn } from "@/lib/format";

type Section = NonNullable<ResponseDetail["sections"]>[number];
type Answer = Section["answers"][number];

// "Rate X (1-10)", "from 1 to 5", "on a scale of 1–7", "out of 10": the scale the question names, if any.
function scaleOf(question: string): { min: number; max: number } | null {
  const range = question.match(/(\d+)\s*(?:-|–|—|to)\s*(\d+)/i);
  if (range) {
    const [min, max] = [Number(range[1]), Number(range[2])];
    if (min < max && max <= 100) return { min, max };
  }
  const outOf = question.match(/out of (\d+)/i);
  return outOf ? { min: 1, max: Number(outOf[1]) } : null;
}

// A rating answer: the value on its scale, as filled segments (or a bar for long scales).
function Rating({ value, min, max }: { value: number; min: number; max: number }) {
  const steps = max - min + 1;
  const share = (value - min + 1) / steps;
  const tone = share >= 0.7 ? "bg-like" : share <= 0.4 ? "bg-dislike" : "bg-gap";
  return (
    <span className="flex items-center gap-2.5">
      <span className="text-[15px] font-semibold tabular-nums">
        {value}
        <span className="text-xs font-normal text-muted"> / {max}</span>
      </span>
      {steps <= 10 ? (
        <span aria-hidden="true" className="flex gap-[3px]">
          {Array.from({ length: steps }, (_, i) => (
            <span key={i} className={cn("h-2 w-3 rounded-[2px]", i + min <= value ? tone : "bg-chip")} />
          ))}
        </span>
      ) : (
        <span aria-hidden="true" className="h-2 w-28 overflow-hidden rounded-full bg-chip">
          <span className={cn("block h-full rounded-full", tone)} style={{ width: `${Math.round(share * 100)}%` }} />
        </span>
      )}
    </span>
  );
}

function AnswerValue({ answer }: { answer: Answer }) {
  const { values } = answer;
  if (values.length === 1) {
    const scale = scaleOf(answer.question);
    const n = Number(values[0]);
    if (scale && Number.isInteger(n) && n >= scale.min && n <= scale.max) return <Rating value={n} {...scale} />;
    return <span className="whitespace-pre-line">{values[0]}</span>;
  }
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
  return (
    <div className="grid gap-5">
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
