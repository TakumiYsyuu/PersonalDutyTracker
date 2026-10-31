import { CheckCircle2, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { getGoalStats } from "../Logic/savings.js";
import { formatDate, formatPeso } from "../Logic/format.js";
import { btnPrimary } from "./uiStyles.js";

const Figure = ({ label, value, accent }) => (
  <div className="min-w-0">
    <p className="font-ui text-xs uppercase tracking-widest text-[#778da9] mb-1">{label}</p>
    <p className={`font-brand text-sm font-semibold wrap-break-word ${accent ? "text-emerald-400" : "text-[#e0e1dd]"}`}>{value}</p>
  </div>
);

export default function GoalCard({ goal, onAddMoney, onEdit, onDelete }) {
  const s = getGoalStats(goal);
  const bar = s.completed ? "bg-emerald-400" : "bg-[#8fa3bc]";

  return (
    <article className="bg-[#1b263b] rounded-xl border border-[#415a77] p-5 flex flex-col gap-4 min-w-0" aria-label={goal.name}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-brand text-base font-semibold text-[#e0e1dd] wrap-break-word">{goal.name}</h3>
          <p className="font-body text-xs text-[#778da9]">Created {formatDate(goal.createdAt)}</p>
        </div>
        <span className={`font-ui shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${
          s.completed ? "border-emerald-500/40 text-emerald-400 bg-emerald-900/10" : "border-[#415a77] text-[#778da9] bg-[#0d1b2a]"
        }`}>
          {s.completed && <CheckCircle2 size={12} aria-hidden="true" />}
          {s.completed ? "Completed" : "In progress"}
        </span>
      </div>

      {goal.description && <p className="font-body text-sm text-[#778da9] line-clamp-2 wrap-break-word">{goal.description}</p>}

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-brand text-2xl font-semibold text-[#e0e1dd]">{s.percent}%</span>
          <span className="font-body text-xs text-[#778da9]">
            {s.depositCount} {s.depositCount === 1 ? "deposit" : "deposits"}
          </span>
        </div>
        <div role="progressbar" aria-label={`${goal.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent}
          className="h-3 w-full rounded-full bg-[#0d1b2a] border border-[#415a77] overflow-hidden">
          <div className={`h-full rounded-full ${bar} transition-[width] duration-500 motion-reduce:transition-none`} style={{ width: `${s.percent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 bg-[#0d1b2a] border border-[#415a77] rounded-lg p-3">
        <Figure label="Saved" value={formatPeso(s.saved)} accent />
        <Figure label="Target" value={formatPeso(s.target)} />
        <Figure label="Left" value={formatPeso(s.remaining)} />
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onAddMoney(goal)} className={`${btnPrimary} flex-1 min-w-0 px-3`}>
          <Plus size={16} aria-hidden="true" /> Add Money
        </button>
        <button type="button" onClick={() => onEdit(goal)} aria-label={`Edit ${goal.name}`}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl border border-[#415a77] bg-[#0d1b2a] text-[#778da9] hover:bg-[#415a77] hover:text-[#e0e1dd] transition-colors duration-200">
          <Pencil size={16} />
        </button>
        <button type="button" onClick={() => onDelete(goal)} aria-label={`Delete ${goal.name}`}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl border border-red-500/40 bg-red-900/20 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors duration-200">
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

export const EmptyGoals = ({ onCreate }) => (
  <div className="bg-[#1b263b] rounded-xl border border-dashed border-[#415a77] p-10 flex flex-col items-center gap-3 text-center">
    <PiggyBank size={32} className="text-[#778da9]" aria-hidden="true" />
    <p className="font-ui text-xs uppercase tracking-widest text-[#778da9]">No savings goals yet</p>
    <p className="font-body text-sm text-[#778da9]">Create a goal, then add money to it as you save.</p>
    <button type="button" onClick={onCreate} className={btnPrimary}>
      <Plus size={16} aria-hidden="true" /> Create your first goal
    </button>
  </div>
);
