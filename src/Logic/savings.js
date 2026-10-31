import { MAX_MONEY, makeId, parseDecimal, sumMoney, roundMoney, toCents } from "./money.js";

export const NAME_MAX = 60;
export const DESCRIPTION_MAX = 200;

/**
 * Goal shape (persisted):
 * {
 *   id, name, description, targetAmount,
 *   startingAmount,            // money already saved when the goal was created
 *   createdAt, completedAt,    // ISO strings, completedAt is null while active
 *   deposits: [{ id, amount, at }]
 * }
 * The saved amount is ALWAYS derived (startingAmount + deposits), never stored,
 * so it can't drift out of sync with the deposit history.
 */

export const getSaved = (goal) =>
  sumMoney([goal.startingAmount, ...goal.deposits.map((d) => d.amount)]);

export function getGoalStats(goal) {
  const saved = getSaved(goal);
  const target = goal.targetAmount;
  const remaining = roundMoney(Math.max(target - saved, 0));
  const completed = toCents(saved) >= toCents(target);
  const ratio = target > 0 ? Math.min(saved / target, 1) : 0;
  return {
    saved,
    target,
    remaining,
    completed,
    // Floor so a goal at 99.6% never reads "100%" before it is actually done.
    percent: completed ? 100 : Math.floor(ratio * 100),
    depositCount: goal.deposits.length,
  };
}

// Keeps completedAt in step with the derived completion state.
const reconcile = (goal, now) => {
  const { completed } = getGoalStats(goal);
  if (completed && !goal.completedAt) return { ...goal, completedAt: now };
  if (!completed && goal.completedAt) return { ...goal, completedAt: null };
  return goal;
};

export function createGoal({ name, description, targetAmount, startingAmount }, now = new Date().toISOString()) {
  return reconcile(
    {
      id: makeId(),
      name: name.trim(),
      description: (description || "").trim(),
      targetAmount: roundMoney(targetAmount),
      startingAmount: roundMoney(startingAmount || 0),
      createdAt: now,
      completedAt: null,
      deposits: [],
    },
    now,
  );
}

// Edits never touch the deposit list.
export function updateGoal(goal, { name, description, targetAmount, startingAmount }, now = new Date().toISOString()) {
  return reconcile(
    {
      ...goal,
      name: name.trim(),
      description: (description || "").trim(),
      targetAmount: roundMoney(targetAmount),
      startingAmount: roundMoney(startingAmount || 0),
    },
    now,
  );
}

export function addDeposit(goal, amount, now = new Date().toISOString()) {
  return reconcile(
    { ...goal, deposits: [...goal.deposits, { id: makeId(), amount: roundMoney(amount), at: now }] },
    now,
  );
}

export function getTotals(goals) {
  const stats = goals.map(getGoalStats);
  const active = stats.filter((s) => !s.completed);
  return {
    totalSaved: sumMoney(stats.map((s) => s.saved)),
    totalTarget: sumMoney(stats.map((s) => s.target)),
    remaining: sumMoney(active.map((s) => s.remaining)),
    totalGoals: goals.length,
    completedGoals: stats.length - active.length,
    activeGoals: active.length,
  };
}

/** Every deposit across all goals, newest first, with running balances. */
export function getTransactions(goals) {
  const rows = [];
  for (const goal of goals) {
    let balanceCents = toCents(goal.startingAmount);
    const ordered = [...goal.deposits].sort((a, b) => new Date(a.at) - new Date(b.at));
    for (const dep of ordered) {
      const before = balanceCents;
      balanceCents += toCents(dep.amount);
      rows.push({
        id: dep.id,
        goalId: goal.id,
        goalName: goal.name,
        amount: dep.amount,
        at: dep.at,
        previousBalance: before / 100,
        newBalance: balanceCents / 100,
      });
    }
  }
  return rows.sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function validateGoalForm(form) {
  const errors = {};
  const name = (form.name || "").trim();
  if (!name) errors.name = "Give your goal a name.";
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`;

  if ((form.description || "").length > DESCRIPTION_MAX)
    errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;

  const target = parseDecimal(form.targetAmount, { max: MAX_MONEY });
  if (target.empty) errors.targetAmount = "Enter a target price.";
  else if (target.error) errors.targetAmount = target.error;
  else if (target.value <= 0) errors.targetAmount = "Target must be more than ₱0.";

  const start = parseDecimal(form.startingAmount, { max: MAX_MONEY });
  if (start.error) errors.startingAmount = start.error;

  return {
    errors,
    values: {
      name,
      description: (form.description || "").trim(),
      targetAmount: target.value,
      startingAmount: start.value ?? 0,
    },
  };
}

/** Deposit validation. `remaining` lets the caller know whether to ask for confirmation. */
export function validateDeposit(raw, remaining) {
  const r = parseDecimal(raw, { max: MAX_MONEY });
  if (r.empty) return { error: "Enter an amount." };
  if (r.error) return { error: r.error };
  if (r.value <= 0) return { error: "Deposit must be more than ₱0." };
  return { value: r.value, exceeds: toCents(r.value) > toCents(remaining) };
}

/** Defensive loader: returns a clean goal or null if the record is unusable. */
export function normalizeGoal(raw) {
  if (!raw || typeof raw !== "object") return null;
  const target = Number(raw.targetAmount);
  const start = Number(raw.startingAmount ?? 0);
  if (typeof raw.name !== "string" || !raw.name.trim()) return null;
  if (!Number.isFinite(target) || target <= 0) return null;
  const deposits = Array.isArray(raw.deposits) ?
      raw.deposits
        .filter((d) => d && Number.isFinite(Number(d.amount)) && Number(d.amount) > 0 && !Number.isNaN(new Date(d.at).getTime()))
        .map((d) => ({ id: typeof d.id === "string" && d.id ? d.id : makeId(), amount: roundMoney(d.amount), at: new Date(d.at).toISOString() }))
    : [];
  const createdAt = !Number.isNaN(new Date(raw.createdAt).getTime()) ? new Date(raw.createdAt).toISOString() : new Date().toISOString();
  return reconcile(
    {
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId(),
      name: raw.name.trim().slice(0, NAME_MAX),
      description: typeof raw.description === "string" ? raw.description.slice(0, DESCRIPTION_MAX) : "",
      targetAmount: roundMoney(target),
      startingAmount: Number.isFinite(start) && start >= 0 ? roundMoney(start) : 0,
      createdAt,
      completedAt: raw.completedAt && !Number.isNaN(new Date(raw.completedAt).getTime()) ? new Date(raw.completedAt).toISOString() : null,
      deposits,
    },
    createdAt,
  );
}
