import type { DealValue } from "./api";

/** Only a comparison that actually saved the sponsor money deserves emphasis. */
export function bestSavingChannel(benchmarks: DealValue["benchmarks"]) {
  return benchmarks.reduce<DealValue["benchmarks"][number] | undefined>(
    (best, row) => (row.savings > 0 && (!best || row.savings > best.savings) ? row : best),
    undefined,
  );
}

/** Keep endpoint labels and only add milestones when there is room between labels. */
export function decayTicks(days: number[]) {
  if (!days.length) return [];
  const first = days[0];
  const last = days[days.length - 1];
  const gap = Math.max(1, (last - first) * 0.12);
  const ticks = [first];
  for (const day of [7, 30]) {
    if (days.includes(day) && day - ticks[ticks.length - 1] >= gap && last - day >= gap) ticks.push(day);
  }
  if (last !== first) ticks.push(last);
  return ticks;
}

/** Preserve the API's prose exactly, including commas inside formatted click counts. */
export function summaryHighlight(summary: string) {
  const match =
    /\d+(?:\.\d+)?% verified traffic/i.exec(summary) ?? /\d[\d,]* (?:verified )?human clicks?/i.exec(summary);
  if (!match) return { before: summary, phrase: "", after: "" };
  return {
    before: summary.slice(0, match.index),
    phrase: match[0],
    after: summary.slice(match.index + match[0].length),
  };
}
