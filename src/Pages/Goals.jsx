import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import GoalCard, { EmptyGoals } from "../components/GoalCard.jsx";
import GoalFormModal from "../components/GoalFormModal.jsx";
import DepositModal from "../components/DepositModal.jsx";
import SavingsHistory from "../components/SavingsHistory.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/toastContext.js";
import { btnPrimary } from "../components/uiStyles.js";
import { usePersistentCollection } from "../hooks/usePersistentCollection.js";
import { loadGoals, saveGoals } from "../Logic/storage.js";
import { addDeposit, createGoal, getGoalStats, getTotals, updateGoal } from "../Logic/savings.js";
import { formatPeso } from "../Logic/format.js";

const Stat = ({ label, value, sub, accent }) => (
  <div className="bg-[#1b263b] rounded-xl border border-[#415a77] p-4 min-w-0">
    <p className="font-ui text-xs uppercase tracking-widest text-[#778da9] mb-2">{label}</p>
    <p className={`font-brand text-xl sm:text-2xl font-semibold wrap-break-word ${accent ? "text-emerald-400" : "text-[#e0e1dd]"}`}>{value}</p>
    {sub && <p className="font-body text-xs text-[#778da9] mt-1">{sub}</p>}
  </div>
);

const Goals = () => {
  const toast = useToast();
  const [goals, commit] = usePersistentCollection(loadGoals, saveGoals, "savings goals");
  const [formState, setFormState] = useState({ open: false, goal: null });
  const [depositGoalId, setDepositGoalId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totals = useMemo(() => getTotals(goals), [goals]);
  const active = goals.filter((g) => !getGoalStats(g).completed);
  const completed = goals.filter((g) => getGoalStats(g).completed);
  const depositGoal = goals.find((g) => g.id === depositGoalId) ?? null;

  const closeForm = () => setFormState((s) => ({ ...s, open: false }));

  const handleSaveGoal = (values) => {
    const editing = formState.goal;
    if (editing) {
      const updated = updateGoal(editing, values);
      commit((list) => list.map((g) => (g.id === editing.id ? updateGoal(g, values) : g)));
      toast.success(
        getGoalStats(updated).completed && !getGoalStats(editing).completed ?
          `“${updated.name}” is now complete.`
        : `“${updated.name}” updated.`,
      );
    } else {
      const goal = createGoal(values);
      commit((list) => [...list, goal]);
      toast.success(`Goal “${goal.name}” created.`);
    }
    closeForm();
  };

  const handleDeposit = (amount) => {
    const target = depositGoal;
    if (!target) return;
    const after = addDeposit(target, amount);
    const stats = getGoalStats(after);
    commit((list) => list.map((g) => (g.id === target.id ? addDeposit(g, amount) : g)));
    setDepositGoalId(null);
    toast.success(
      stats.completed && !getGoalStats(target).completed ?
        `${formatPeso(amount)} added. “${target.name}” is complete!`
      : `${formatPeso(amount)} added to “${target.name}” — ${stats.percent}% there.`,
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    commit((list) => list.filter((g) => g.id !== id));
    setDeleteTarget(null);
    toast.success(`Goal “${name}” deleted.`);
  };

  const cardProps = {
    onAddMoney: (g) => setDepositGoalId(g.id),
    onEdit: (g) => setFormState({ open: true, goal: g }),
    onDelete: setDeleteTarget,
  };
  const grid = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3";
  const openCreate = () => setFormState({ open: true, goal: null });

  return (
    <>
      <div className="p-4 sm:p-6 flex-1 min-w-0 flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="font-brand text-xl sm:text-2xl font-semibold text-[#e0e1dd] tracking-widest uppercase">Savings Goals</h1>
            <p className="font-body text-sm text-[#778da9]">Set a target, add money as you save, and watch it fill up.</p>
          </div>
          <button type="button" onClick={openCreate} className={`${btnPrimary} w-full sm:w-auto`}>
            <Plus size={16} aria-hidden="true" /> Create New Goal
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Total Saved" value={formatPeso(totals.totalSaved)} accent />
          <Stat label="Total Target" value={formatPeso(totals.totalTarget)} />
          <Stat label="Remaining" value={formatPeso(totals.remaining)} sub="Across active goals" />
          <Stat label="Total Goals" value={totals.totalGoals} sub={`${totals.completedGoals} completed`} />
        </div>

        {goals.length === 0 ?
          <EmptyGoals onCreate={openCreate} />
        : <>
            <section aria-labelledby="active-heading" className="flex flex-col gap-3">
              <h2 id="active-heading" className="font-brand text-sm font-semibold text-[#e0e1dd] tracking-widest uppercase">
                Active Goals <span className="text-[#778da9] font-normal">({active.length})</span>
              </h2>
              {active.length ?
                <div className={grid}>{active.map((g) => <GoalCard key={g.id} goal={g} {...cardProps} />)}</div>
              : <p className="font-body text-sm text-[#778da9]">Every goal is complete. Create a new one to keep saving.</p>}
            </section>

            {completed.length > 0 && (
              <section aria-labelledby="completed-heading" className="flex flex-col gap-3">
                <h2 id="completed-heading" className="font-brand text-sm font-semibold text-[#e0e1dd] tracking-widest uppercase">
                  Completed Goals <span className="text-[#778da9] font-normal">({completed.length})</span>
                </h2>
                <div className={grid}>{completed.map((g) => <GoalCard key={g.id} goal={g} {...cardProps} />)}</div>
              </section>
            )}
          </>
        }

        <SavingsHistory goals={goals} />
      </div>

      <GoalFormModal open={formState.open} goal={formState.goal} onSave={handleSaveGoal} onClose={closeForm} />
      <DepositModal open={depositGoal !== null} goal={depositGoal} onSave={handleDeposit} onClose={() => setDepositGoalId(null)} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Goal"
        message={`Delete “${deleteTarget?.name ?? ""}”?`}
        detail={deleteTarget ? `${deleteTarget.deposits.length} deposit record${deleteTarget.deposits.length === 1 ? "" : "s"} will be removed with it` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default Goals;
