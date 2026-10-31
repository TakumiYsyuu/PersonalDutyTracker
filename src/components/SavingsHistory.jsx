import { useMemo, useState } from "react";
import { getTransactions } from "../Logic/savings.js";
import { formatDateTime, formatPeso } from "../Logic/format.js";
import { btnSecondary, card, inputClass, labelClass } from "./uiStyles.js";

const PAGE = 10;

export default function SavingsHistory({ goals }) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE);

  const all = useMemo(() => getTransactions(goals), [goals]);
  // If the selected goal was deleted, fall back to everything.
  const activeFilter = goals.some((g) => g.id === filter) ? filter : "all";
  const rows = activeFilter === "all" ? all : all.filter((t) => t.goalId === activeFilter);
  const shown = rows.slice(0, limit);

  return (
    <section aria-labelledby="history-heading" className={`${card} p-4 sm:p-5 flex flex-col gap-4 min-w-0`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="history-heading" className="font-brand text-sm font-semibold text-[#e0e1dd] tracking-widest uppercase">
          Savings History
        </h2>
        {goals.length > 1 && (
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <label htmlFor="history-filter" className={labelClass}>Goal</label>
            <select id="history-filter" value={activeFilter} onChange={(e) => { setFilter(e.target.value); setLimit(PAGE); }}
              className={`${inputClass} min-h-11`} style={{ borderColor: "#415a77", colorScheme: "dark" }}>
              <option value="all">All goals</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {rows.length === 0 ?
        <p className="font-body text-sm text-[#778da9] py-6 text-center">No deposits yet. They'll show up here when you add money to a goal.</p>
      : <>
          <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1.2fr_1fr_1fr] gap-3 px-3 font-ui text-xs uppercase tracking-widest text-[#778da9]">
            <span>Goal</span><span>Deposit</span><span>Date</span><span>Before</span><span>After</span>
          </div>
          <ul className="flex flex-col gap-2">
            {shown.map((t) => (
              <li key={t.id} className="bg-[#0d1b2a] border border-[#415a77] rounded-lg p-3 grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1.2fr_1fr_1fr] gap-x-3 gap-y-2 items-center font-body text-sm text-[#e0e1dd]">
                <span className="col-span-2 sm:col-span-1 font-semibold wrap-break-word min-w-0">{t.goalName}</span>
                <span className="text-emerald-400 font-semibold">+{formatPeso(t.amount)}</span>
                <span className="text-xs text-[#778da9] text-right sm:text-left">{formatDateTime(t.at)}</span>
                <span className="text-xs text-[#778da9]"><span className="sm:hidden">Before </span>{formatPeso(t.previousBalance)}</span>
                <span className="text-xs text-[#e0e1dd] text-right sm:text-left"><span className="sm:hidden text-[#778da9]">After </span>{formatPeso(t.newBalance)}</span>
              </li>
            ))}
          </ul>
          {rows.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + PAGE)} className={`${btnSecondary} self-center`}>
              Show more ({rows.length - limit} left)
            </button>
          )}
        </>
      }
    </section>
  );
}
