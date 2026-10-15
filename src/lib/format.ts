// Display helpers. Dates use UTC so server output is stable.

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// "Sep 22"
export const formatDate = (iso: string) => shortDate.format(new Date(iso));

// "Sep 1–7" or "Sep 29–Oct 5" for the week starting on `iso`.
export function formatWeek(iso: string) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return `${formatDate(iso)}–${sameMonth ? end.getUTCDate() : formatDate(end.toISOString())}`;
}

// "1 response", "8 responses"
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
