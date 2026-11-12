// Turns a demo response's raw form submission into what GET /responses/:id returns, the same way the
// backend does (SurveyAnswerExtractor): `sections` for the response page, `answers` for older pages.

import type { ResponseDetail } from "../types";
import type { RawAnswer, RawAnswers } from "./db";

type Section = NonNullable<ResponseDetail["sections"]>[number];

const NAME_QUESTIONS = ["full name", "name", "your name"];
const CONTACT_WORDS = ["email", "phone"];
const SHOWN_PREFIXES = ["What do you like about", "What don't you like about", "What additions would"];

const hidden = (question: string) => {
  const q = question.trim().toLowerCase();
  return q === "timestamp" || NAME_QUESTIONS.includes(q) || CONTACT_WORDS.some((w) => q.includes(w));
};
const isSection = (v: RawAnswer): v is RawAnswers => typeof v === "object" && !Array.isArray(v);
const valuesOf = (v: string | string[]) => (Array.isArray(v) ? v : [v]).map((x) => x.trim()).filter(Boolean);

// Every answer by form section; leaves out names, contact details, the timestamp, blanks, and answers that are
// exactly one of `shown` (likes / dislikes / wants, already on the page).
export function sectionsOf(raw: RawAnswers, shown: string[]): Section[] {
  const skip = new Set(shown.map((s) => s.trim()).filter(Boolean));
  const sections: Section[] = [];
  const add = (title: string | null, section: RawAnswers) => {
    let answers: Section["answers"] | null = null;
    for (const [name, value] of Object.entries(section)) {
      if (isSection(value)) {
        add(title === null ? name.trim() : `${title} › ${name.trim()}`, value);
        answers = null;
        continue;
      }
      const values = valuesOf(value);
      if (hidden(name) || values.length === 0 || (values.length === 1 && skip.has(values[0]))) continue;
      if (!answers) sections.push({ title, answers: (answers = []) });
      answers.push({ question: name.trim(), values });
    }
  };
  add(null, raw);
  return sections;
}

// The flat list: top-level answers only, minus likes / dislikes / wants.
export function otherAnswersOf(raw: RawAnswers): ResponseDetail["answers"] {
  return Object.entries(raw).flatMap(([question, value]) => {
    if (isSection(value) || hidden(question) || SHOWN_PREFIXES.some((p) => question.startsWith(p))) return [];
    const answer = valuesOf(value).join(", ");
    return answer ? [{ question: question.trim(), answer }] : [];
  });
}
