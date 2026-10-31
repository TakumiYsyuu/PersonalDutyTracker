import { parseDateTime } from "./salary.js";
import { round2, sumMoney } from "./money.js";

export const emptyTotals = () => ({
  entries: 0,
  hours: 0,
  regularHours: 0,
  overtimeHours: 0,
  regularEarnings: 0,
  overtimeEarnings: 0,
  total: 0,
});

/** Totals for any list of computed duty entries. */
export function summarize(duties) {
  if (!duties.length) return emptyTotals();
  return {
    entries: duties.length,
    hours: round2(duties.reduce((s, d) => s + (d.hoursWorked || 0), 0)),
    regularHours: round2(duties.reduce((s, d) => s + (d.regularHours || 0), 0)),
    overtimeHours: round2(duties.reduce((s, d) => s + (d.overtime || 0), 0)),
    regularEarnings: sumMoney(duties.map((d) => d.baseEarnings)),
    overtimeEarnings: sumMoney(duties.map((d) => d.otEarnings)),
    total: sumMoney(duties.map((d) => d.earnings)),
  };
}

/**
 * A duty belongs to the month and kinsena of the day it STARTED (duty-in), in
 * local time. An overnight shift that starts on the 15th at 22:00 therefore
 * counts toward the first cutoff. Every duty lands in exactly one bucket.
 */
export const getDutyDate = (duty) => parseDateTime(duty.dutyIn);

export const getCutoff = (date) => (date.getDate() <= 15 ? 1 : 2);

export const ordinal = (n) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

export function getMonthSummary(duties, year, month) {
  const inMonth = duties.filter((d) => {
    const date = getDutyDate(d);
    return date && date.getFullYear() === year && date.getMonth() === month;
  });
  const lastDay = daysInMonth(year, month);
  const first = inMonth.filter((d) => getCutoff(getDutyDate(d)) === 1);
  const second = inMonth.filter((d) => getCutoff(getDutyDate(d)) === 2);

  const byPayType = ["hourly", "daily", "fixed"].map((type) => {
    const list = inMonth.filter((d) => d.payType === type);
    return { type, entries: list.length, total: sumMoney(list.map((d) => d.earnings)) };
  });

  return {
    year,
    month,
    lastDay,
    monthTotals: summarize(inMonth),
    cutoffs: [
      { id: 1, label: "1st – 15th", range: "1st to 15th", ...summarize(first) },
      { id: 2, label: `16th – ${ordinal(lastDay)}`, range: `16th to ${ordinal(lastDay)}`, ...summarize(second) },
    ],
    byPayType,
  };
}

export const shiftMonth = ({ year, month }, delta) => {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};
