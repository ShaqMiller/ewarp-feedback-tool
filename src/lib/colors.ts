import type { Coverage } from "./coverage";
import type { Sentiment } from "./types";

// Feature box colors (see coverage.ts).
export const COVERAGE_COLORS: Record<Coverage, string> = {
  all: "#3fb96b",
  some: "#79c0ff",
  none: "#e5534b",
};

// Soft tints for likes / dislikes / wants. Lines only show these when focused.
export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  like: "#7ec699",
  dislike: "#e88f9b",
  want: "#6cc4d0",
};

// Line patterns so sentiment reads even when lines are gray.
export const SENTIMENT_DASH: Record<Sentiment, string | undefined> = {
  like: undefined, // solid
  dislike: "6 5", // dashed
  want: "1 5", // dotted (with round caps)
};
