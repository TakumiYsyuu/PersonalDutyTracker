import test from "node:test";
import assert from "node:assert/strict";

import { computeEntry, validateDutyForm, emptyDutyForm } from "../src/Logic/salary.js";
import { summarize, getMonthSummary, shiftMonth } from "../src/Logic/summary.js";
import {
  createGoal, addDeposit, updateGoal, getGoalStats, getTotals, getTransactions,
  validateGoalForm, validateDeposit, normalizeGoal,
} from "../src/Logic/savings.js";
import { buildBackup, parseBackup, backupFilename } from "../src/Logic/backup.js";
import { loadDuties, loadGoals, eraseAllData, STORAGE_KEYS } from "../src/Logic/storage.js";
import { formatPeso } from "../src/Logic/format.js";
import { parseDecimal } from "../src/Logic/money.js";

// Minimal in-memory localStorage for the storage tests.
const mockStorage = (initial = {}) => {
  const data = { ...initial };
  globalThis.localStorage = {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
  return data;
};

const duty = (over = {}) => ({
  payType: "hourly", dutyIn: "2026-10-05T08:00", dutyOut: "2026-10-05T17:00",
  hourlyRate: 100, overtime: 0, otRate: 0, dayRate: 0, ...over,
});

// ---------- salary ----------
test("hourly: 9 clocked hours, no overtime", () => {
  const e = computeEntry(duty());
  assert.equal(e.hoursWorked, 9);
  assert.equal(e.regularHours, 9);
  assert.equal(e.overtime, 0);
  assert.equal(e.earnings, 900);
});

test("overtime is part of clocked time and is not counted twice", () => {
  const e = computeEntry(duty({ overtime: 2, otRate: 150 }));
  assert.equal(e.hoursWorked, 9, "total stays 9, not 11");
  assert.equal(e.regularHours, 7);
  assert.equal(e.baseEarnings, 700);
  assert.equal(e.otEarnings, 300);
  assert.equal(e.earnings, 1000);
});

test("daily: day rate once plus overtime", () => {
  const e = computeEntry(duty({ payType: "daily", dayRate: 800, overtime: 1.5, otRate: 120 }));
  assert.equal(e.baseEarnings, 800);
  assert.equal(e.otEarnings, 180);
  assert.equal(e.earnings, 980);
});

test("fixed: amount only, overtime ignored", () => {
  const e = computeEntry(duty({ payType: "fixed", dayRate: 1200, overtime: 3, otRate: 500 }));
  assert.equal(e.earnings, 1200);
  assert.equal(e.overtime, 0);
});

test("overnight shift crossing midnight", () => {
  const e = computeEntry(duty({ dutyIn: "2026-10-05T22:00", dutyOut: "2026-10-06T06:00", hourlyRate: 100 }));
  assert.equal(e.hoursWorked, 8);
  assert.equal(e.earnings, 800);
});

test("fractional hours", () => {
  const e = computeEntry(duty({ dutyIn: "2026-10-05T08:00", dutyOut: "2026-10-05T12:30", hourlyRate: 100 }));
  assert.equal(e.hoursWorked, 4.5);
  assert.equal(e.earnings, 450);
});

test("incomplete, reversed, over-24h and garbage times earn nothing and don't throw", () => {
  for (const bad of [
    { dutyOut: "" },
    { dutyIn: "" },
    { dutyOut: "2026-10-05T07:00" },
    { dutyOut: "2026-10-06T09:00" },
    { dutyIn: "not-a-date" },
    { dutyIn: null, dutyOut: undefined },
  ]) {
    const e = computeEntry(duty({ payType: "daily", dayRate: 800, ...bad }));
    assert.equal(e.earnings, 0);
    assert.equal(e.hoursWorked, 0);
    assert.notEqual(e.status, "complete");
  }
});

test("legacy entry whose stored totals double-counted overtime is corrected", () => {
  const legacy = { dutyIn: "2026-10-05T08:00", dutyOut: "2026-10-05T17:00", overtime: 2, hourlyRate: 100, otRate: 150, payType: "hourly", hoursWorked: 11, earnings: 1000 };
  assert.equal(computeEntry(legacy, "x").hoursWorked, 9);
});

test("overtime larger than the shift is clamped when reading stored data", () => {
  const e = computeEntry(duty({ overtime: 20, otRate: 100 }));
  assert.equal(e.overtime, 9);
  assert.equal(e.regularHours, 0);
});

test("floating point money stays exact", () => {
  const e = computeEntry(duty({ hourlyRate: 0.1, dutyOut: "2026-10-05T11:00" }));
  assert.equal(e.earnings, 0.3);
});

// ---------- duty validation ----------
const valid = { ...emptyDutyForm, dutyIn: "2026-10-05T08:00", dutyOut: "2026-10-05T17:00", hourlyRate: "100" };

test("valid form passes", () => assert.deepEqual(validateDutyForm(valid).errors, {}));

test("required fields, ordering, length", () => {
  assert.ok(validateDutyForm({ ...valid, dutyIn: "" }).errors.dutyIn);
  assert.ok(validateDutyForm({ ...valid, dutyOut: "" }).errors.dutyOut);
  assert.ok(validateDutyForm({ ...valid, dutyOut: "2026-10-05T07:00" }).errors.dutyOut);
  assert.ok(validateDutyForm({ ...valid, dutyOut: "2026-10-07T08:00" }).errors.dutyOut);
  assert.ok(validateDutyForm({ ...valid, dutyIn: "garbage" }).errors.dutyIn);
});

test("negative, zero, blank and non-numeric money rejected", () => {
  for (const v of ["-5", "0", "", "abc", "1e3", "1.234"])
    assert.ok(validateDutyForm({ ...valid, hourlyRate: v }).errors.hourlyRate, `hourlyRate "${v}"`);
  assert.ok(validateDutyForm({ ...valid, payType: "daily", dayRate: "-1" }).errors.dayRate);
  assert.ok(validateDutyForm({ ...valid, payType: "fixed", dayRate: "" }).errors.dayRate);
});

test("overtime rules", () => {
  assert.ok(validateDutyForm({ ...valid, overtime: "-1", otRate: "10" }).errors.overtime);
  assert.ok(validateDutyForm({ ...valid, overtime: "10", otRate: "10" }).errors.overtime, "more than 9h clocked");
  assert.ok(validateDutyForm({ ...valid, overtime: "2", otRate: "" }).errors.otRate);
  assert.deepEqual(validateDutyForm({ ...valid, overtime: "2", otRate: "150" }).errors, {});
});

test("exact duplicate times blocked on create but not when editing the same entry", () => {
  const existing = [{ id: "a", dutyIn: valid.dutyIn, dutyOut: valid.dutyOut }];
  assert.ok(validateDutyForm(valid, { existing }).errors.dutyOut);
  assert.deepEqual(validateDutyForm(valid, { existing, editingId: "a" }).errors, {});
});

// ---------- summaries ----------
test("month and kinsena split uses duty-in date, no duplicates, no leakage", () => {
  const mk = (id, dutyIn, dutyOut) => computeEntry(duty({ dutyIn, dutyOut }), id);
  const list = [
    mk("a", "2026-10-01T08:00", "2026-10-01T17:00"),   // 1st cutoff, 900
    mk("b", "2026-10-15T22:00", "2026-10-16T06:00"),   // starts 15th -> 1st cutoff, 800
    mk("c", "2026-10-16T08:00", "2026-10-16T17:00"),   // 2nd cutoff, 900
    mk("d", "2026-10-31T08:00", "2026-10-31T17:00"),   // 2nd cutoff, 900
    mk("e", "2026-09-30T08:00", "2026-09-30T17:00"),   // other month
    mk("f", "2026-11-01T08:00", "2026-11-01T17:00"),   // other month
  ];
  const s = getMonthSummary(list, 2026, 9);
  assert.equal(s.monthTotals.entries, 4);
  assert.equal(s.monthTotals.total, 3500);
  assert.equal(s.cutoffs[0].entries, 2);
  assert.equal(s.cutoffs[0].total, 1700);
  assert.equal(s.cutoffs[1].entries, 2);
  assert.equal(s.cutoffs[1].total, 1800);
  assert.equal(s.cutoffs[0].total + s.cutoffs[1].total, s.monthTotals.total);
  assert.equal(s.cutoffs[1].label, "16th – 31st");
  assert.equal(getMonthSummary([], 2026, 8).cutoffs[1].label, "16th – 30th");
  assert.equal(getMonthSummary([], 2027, 1).cutoffs[1].label, "16th – 28th");
  assert.equal(getMonthSummary(list, 2026, 8).monthTotals.entries, 1);
});

test("summary fields: hours, OT hours, regular vs OT earnings", () => {
  const list = [
    computeEntry(duty({ overtime: 2, otRate: 150 }), "a"),
    computeEntry(duty({ dutyIn: "2026-10-06T08:00", dutyOut: "2026-10-06T16:00" }), "b"),
  ];
  const t = summarize(list);
  assert.equal(t.hours, 17);
  assert.equal(t.overtimeHours, 2);
  assert.equal(t.regularHours, 15);
  assert.equal(t.overtimeEarnings, 300);
  assert.equal(t.regularEarnings, 1500);
  assert.equal(t.total, 1800);
  assert.equal(t.total, t.regularEarnings + t.overtimeEarnings);
});

test("month navigation wraps years; February length", () => {
  assert.deepEqual(shiftMonth({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 });
  assert.equal(getMonthSummary([], 2028, 1).lastDay, 29);
  assert.equal(getMonthSummary([], 2027, 1).lastDay, 28);
});

test("undated entries are ignored by monthly views instead of crashing", () => {
  const list = [computeEntry({ payType: "hourly", dutyIn: "", dutyOut: "" }, "z")];
  assert.equal(getMonthSummary(list, 2026, 9).monthTotals.entries, 0);
});

// ---------- savings ----------
test("headphones example: 200 + 300 + 100 = 600, remaining 400, 60%", () => {
  let g = createGoal({ name: "New Headphones", targetAmount: 1000, startingAmount: 0 });
  for (const [i, amt] of [200, 300, 100].entries()) g = addDeposit(g, amt, `2026-10-0${i + 1}T10:00:00.000Z`);
  const s = getGoalStats(g);
  assert.equal(s.saved, 600);
  assert.equal(s.remaining, 400);
  assert.equal(s.percent, 60);
  assert.equal(s.depositCount, 3);
  assert.equal(s.completed, false);
  const tx = getTransactions([g]);
  assert.deepEqual(tx.map((t) => [t.amount, t.previousBalance, t.newBalance]), [[100, 500, 600], [300, 200, 500], [200, 0, 200]]);
});

test("goal completes at exactly the target and stamps completedAt", () => {
  let g = createGoal({ name: "G", targetAmount: 1000, startingAmount: 0 });
  g = addDeposit(g, 1000, "2026-10-01T00:00:00.000Z");
  assert.equal(getGoalStats(g).completed, true);
  assert.equal(getGoalStats(g).percent, 100);
  assert.equal(g.completedAt, "2026-10-01T00:00:00.000Z");
});

test("99.9% is not displayed as 100%", () => {
  let g = createGoal({ name: "G", targetAmount: 1000, startingAmount: 0 });
  g = addDeposit(g, 999.5);
  assert.equal(getGoalStats(g).percent, 99);
  assert.equal(getGoalStats(g).completed, false);
});

test("raising the target re-opens a completed goal; deposits are untouched", () => {
  let g = createGoal({ name: "G", targetAmount: 500, startingAmount: 100 });
  g = addDeposit(g, 400);
  assert.equal(getGoalStats(g).completed, true);
  const before = g.deposits;
  g = updateGoal(g, { name: "Renamed", description: "d", targetAmount: 800, startingAmount: 100 });
  assert.equal(getGoalStats(g).completed, false);
  assert.equal(g.completedAt, null);
  assert.equal(getGoalStats(g).remaining, 300);
  assert.equal(getGoalStats(g).percent, 62);
  assert.strictEqual(g.deposits, before, "history preserved");
});

test("deposit validation: zero, negative, garbage, over-target flag", () => {
  for (const v of ["0", "-5", "", "abc", "1e2", "5.555"]) assert.ok(validateDeposit(v, 100).error, v);
  assert.deepEqual(validateDeposit("100", 100), { value: 100, exceeds: false });
  assert.deepEqual(validateDeposit("100.01", 100), { value: 100.01, exceeds: true });
  assert.deepEqual(validateDeposit("1,000", 5000), { value: 1000, exceeds: false });
});

test("goal form validation", () => {
  assert.ok(validateGoalForm({ name: " ", targetAmount: "100" }).errors.name);
  assert.ok(validateGoalForm({ name: "x", targetAmount: "0" }).errors.targetAmount);
  assert.ok(validateGoalForm({ name: "x", targetAmount: "-1" }).errors.targetAmount);
  assert.ok(validateGoalForm({ name: "x", targetAmount: "" }).errors.targetAmount);
  assert.ok(validateGoalForm({ name: "x", targetAmount: "10", startingAmount: "-1" }).errors.startingAmount);
  const ok = validateGoalForm({ name: " Phone ", targetAmount: "1,500.50", startingAmount: "" });
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.values.name, "Phone");
  assert.equal(ok.values.targetAmount, 1500.5);
});

test("totals: saved, target, remaining (active only), counts", () => {
  const a = addDeposit(createGoal({ name: "A", targetAmount: 1000, startingAmount: 0 }), 500);
  const b = addDeposit(createGoal({ name: "B", targetAmount: 3000, startingAmount: 0 }), 2000);
  const c = addDeposit(createGoal({ name: "C", targetAmount: 4000, startingAmount: 0 }), 4500); // over-funded, completed
  const t = getTotals([a, b, c]);
  assert.equal(t.totalSaved, 7000);
  assert.equal(t.totalTarget, 8000);
  assert.equal(t.remaining, 1500, "only active goals count: 500 + 1000");
  assert.equal(t.totalGoals, 3);
  assert.equal(t.completedGoals, 1);
  assert.deepEqual(getTotals([]), { totalSaved: 0, totalTarget: 0, remaining: 0, totalGoals: 0, completedGoals: 0, activeGoals: 0 });
});

test("normalizeGoal rejects junk and repairs partial data", () => {
  assert.equal(normalizeGoal(null), null);
  assert.equal(normalizeGoal({ name: "", targetAmount: 5 }), null);
  assert.equal(normalizeGoal({ name: "x", targetAmount: -5 }), null);
  const g = normalizeGoal({ name: "x", targetAmount: 100, deposits: [{ amount: 10, at: "2026-01-01" }, { amount: -5, at: "2026-01-01" }, "junk"] });
  assert.equal(g.deposits.length, 1);
});

// ---------- parseDecimal / format ----------
test("parseDecimal", () => {
  assert.deepEqual(parseDecimal("12.5"), { value: 12.5 });
  assert.ok(parseDecimal("  ").empty);
  assert.ok(parseDecimal("-1").error);
  assert.ok(parseDecimal("2000000000").error);
});

test("peso formatting", () => {
  assert.equal(formatPeso(1000), "₱1,000.00");
  assert.equal(formatPeso(NaN), "₱0.00");
});

// ---------- backup ----------
const sampleState = () => ({
  duties: [computeEntry(duty({ overtime: 2, otRate: 150 }), "d1")],
  goals: [addDeposit(createGoal({ name: "Phone", targetAmount: 5000, startingAmount: 100 }), 250)],
});

test("export -> import round-trips exactly", () => {
  const state = sampleState();
  const text = JSON.stringify(buildBackup(state));
  const r = parseBackup(text);
  assert.equal(r.ok, true);
  assert.deepEqual(r.duties, state.duties);
  assert.deepEqual(r.goals, state.goals);
});

test("backup filename carries the date", () => {
  assert.equal(backupFilename(new Date(2026, 9, 31)), "talaan-backup-2026-10-31.json");
});

test("corrupted / foreign / newer / malformed backups are rejected", () => {
  const good = buildBackup(sampleState());
  const clone = () => JSON.parse(JSON.stringify(good));
  const rejects = (obj, why) => assert.equal(parseBackup(typeof obj === "string" ? obj : JSON.stringify(obj)).ok, false, why);
  rejects("", "empty");
  rejects("{not json", "bad json");
  rejects("[1,2,3]", "array");
  rejects({ foo: 1 }, "foreign");
  rejects({ ...clone(), app: "other" }, "wrong app");
  rejects({ ...clone(), version: 99 }, "newer version");
  rejects({ ...clone(), version: "1" }, "bad version type");
  rejects({ ...clone(), data: { duties: [] } }, "missing goals");
  let c = clone(); c.data.duties[0].payType = "weekly"; rejects(c, "bad pay type");
  c = clone(); c.data.duties[0].dutyIn = "nope"; rejects(c, "bad time");
  c = clone(); c.data.duties[0].hourlyRate = -5; rejects(c, "negative rate");
  c = clone(); c.data.duties.push(c.data.duties[0]); rejects(c, "duplicate duty ids");
  c = clone(); c.data.goals[0].targetAmount = 0; rejects(c, "zero target");
  c = clone(); c.data.goals[0].deposits[0].amount = -1; rejects(c, "negative deposit");
  c = clone(); c.data.goals[0].name = ""; rejects(c, "nameless goal");
  assert.match(parseBackup("{bad").error, /JSON/);
});

// ---------- storage ----------
test("corrupted storage is quarantined, not crashed on or silently destroyed", () => {
  const data = mockStorage({ [STORAGE_KEYS.duties]: "{oops", [STORAGE_KEYS.goals]: "[[[" });
  assert.deepEqual(loadDuties(), []);
  assert.deepEqual(loadGoals(), []);
  assert.equal(data["corrupt_backup_duties"], "{oops");
});

test("first-version data (no ids, double-counted OT) migrates safely with a backup", () => {
  const legacy = [{ dutyIn: "2026-10-05T08:00", dutyOut: "2026-10-05T17:00", overtime: 2, hourlyRate: 100, otRate: 150, payType: "hourly", hoursWorked: 11, regularHours: 7, earnings: 1000 }];
  const data = mockStorage({ [STORAGE_KEYS.duties]: JSON.stringify(legacy) });
  const duties = loadDuties();
  assert.equal(duties.length, 1);
  assert.ok(duties[0].id);
  assert.equal(duties[0].hoursWorked, 9);
  assert.equal(duties[0].earnings, 1000);
  assert.deepEqual(JSON.parse(data["duties_pre_v2_backup"]), legacy, "original preserved");
  assert.equal(JSON.parse(data[STORAGE_KEYS.duties])[0].id, duties[0].id, "ids persisted");
});

test("erase removes every Taláan key and nothing else", () => {
  const data = mockStorage({ duties: "[]", talaan_goals: "[]", "corrupt_backup_duties": "x", duties_pre_v2_backup: "[]", other_app: "keep" });
  assert.equal(eraseAllData(), true);
  assert.deepEqual(Object.keys(data), ["other_app"]);
});

test("storage that throws does not crash loaders", () => {
  globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("blocked"); } };
  assert.deepEqual(loadDuties(), []);
  assert.deepEqual(loadGoals(), []);
});

test("computeEntry keeps the id it is given (new duties must always get one)", () => {
  assert.equal(computeEntry(duty(), "abc").id, "abc");
});
