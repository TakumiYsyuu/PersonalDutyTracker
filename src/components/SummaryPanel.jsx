import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { card, innerCard, iconBtn } from "./uiStyles.js";
import { getMonthSummary, shiftMonth } from "../Logic/summary.js";
import { formatHours, formatMonthYear, formatPeso } from "../Logic/format.js";

const currentMonth = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
};

const Metric = ({ label, value, accent }) => (
  <div className={`${innerCard} p-3 min-w-0`}>
    <p className="font-ui text-xs uppercase tracking-widest text-[#778da9] mb-2">{label}</p>
    <p className={`font-brand text-lg sm:text-xl font-semibold wrap-break-word ${accent ? "text-emerald-400" : "text-[#e0e1dd]"}`}>
      {value}
    </p>
  </div>
);

export default function SummaryPanel({ duties }) {
  const [view, setView] = useState(currentMonth);
  const [tab, setTab] = useState("month"); // "month" | 1 | 2

  const summary = useMemo(() => getMonthSummary(duties, view.year, view.month), [duties, view]);
  const [first, second] = summary.cutoffs;
  const shown = tab === "month" ? summary.monthTotals : tab === 1 ? first : second;
  const isCurrent = view.year === currentMonth().year && view.month === currentMonth().month;

  const tabs = [
    { id: "month", label: "Whole month" },
    { id: 1, label: first.label },
    { id: 2, label: second.label },
  ];

  return (
    <section aria-labelledby="summary-heading" className={`${card} p-4 sm:p-5 flex flex-col gap-4 min-w-0`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="summary-heading" className="font-brand text-sm font-semibold text-[#e0e1dd] tracking-widest uppercase">
          Earnings Summary
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" className={iconBtn} aria-label="Previous month" onClick={() => setView((v) => shiftMonth(v, -1))}>
            <ChevronLeft size={18} />
          </button>
          <span className="font-ui text-sm text-[#e0e1dd] text-center min-w-36" aria-live="polite">
            {formatMonthYear(view.year, view.month)}
          </span>
          <button type="button" className={iconBtn} aria-label="Next month" onClick={() => setView((v) => shiftMonth(v, 1))}>
            <ChevronRight size={18} />
          </button>
          {!isCurrent && (
            <button type="button" onClick={() => setView(currentMonth())}
              className="font-ui ml-1 min-h-11 px-3 rounded-lg text-xs uppercase tracking-widest text-[#778da9] hover:bg-[#415a77] hover:text-[#e0e1dd] transition-colors duration-200">
              This month
            </button>
          )}
        </div>
      </div>

      <div role="tablist" aria-label="Summary period" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`font-ui min-h-11 px-3 rounded-lg text-xs font-semibold uppercase tracking-widest border transition-colors duration-200 ${
              tab === t.id ?
                "bg-[#415a77] border-[#778da9] text-[#e0e1dd]"
              : "bg-[#0d1b2a] border-[#415a77] text-[#778da9] hover:bg-[#415a77] hover:text-[#e0e1dd]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {shown.entries === 0 && (
        <p className="font-body text-xs text-[#778da9]">
          No duties logged in this period. Duties count toward the month and kinsena they started in.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Total Earnings" value={formatPeso(shown.total)} accent />
        <Metric label="Regular Earnings" value={formatPeso(shown.regularEarnings)} />
        <Metric label="Overtime Earnings" value={formatPeso(shown.overtimeEarnings)} />
        <Metric label="Duty Entries" value={shown.entries} />
        <Metric label="Total Hours" value={formatHours(shown.hours)} />
        <Metric label="Regular Hours" value={formatHours(shown.regularHours)} />
        <Metric label="Overtime Hours" value={formatHours(shown.overtimeHours)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`${innerCard} p-4 flex flex-col gap-2`}>
          <p className="font-ui text-xs uppercase tracking-widest text-[#778da9] mb-1">Kinsena breakdown</p>
          {summary.cutoffs.map((c) => (
            <div key={c.id} className="flex items-baseline justify-between gap-3 font-body text-sm text-[#e0e1dd]">
              <span className="min-w-0">
                {c.label}
                <span className="text-xs text-[#778da9]"> · {c.entries} {c.entries === 1 ? "duty" : "duties"}</span>
              </span>
              <span className="font-semibold shrink-0">{formatPeso(c.total)}</span>
            </div>
          ))}
          <div className="border-t border-[#415a77] my-1" />
          <div className="flex justify-between gap-3 font-body text-sm font-semibold text-[#e0e1dd]">
            <span>Month total</span>
            <span className="text-emerald-400">{formatPeso(summary.monthTotals.total)}</span>
          </div>
        </div>

        <div className={`${innerCard} p-4 flex flex-col gap-2`}>
          <p className="font-ui text-xs uppercase tracking-widest text-[#778da9] mb-1">Monthly salary breakdown</p>
          {summary.byPayType.map((p) => (
            <div key={p.type} className="flex items-baseline justify-between gap-3 font-body text-sm text-[#e0e1dd]">
              <span className="capitalize">
                {p.type}
                <span className="text-xs text-[#778da9]"> · {p.entries}</span>
              </span>
              <span>{formatPeso(p.total)}</span>
            </div>
          ))}
          <div className="border-t border-[#415a77] my-1" />
          <div className="flex justify-between gap-3 font-body text-xs text-[#778da9]">
            <span>Regular</span>
            <span>{formatPeso(summary.monthTotals.regularEarnings)}</span>
          </div>
          <div className="flex justify-between gap-3 font-body text-xs text-[#778da9]">
            <span>Overtime</span>
            <span>{formatPeso(summary.monthTotals.overtimeEarnings)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
