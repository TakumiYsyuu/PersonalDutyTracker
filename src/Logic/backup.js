import { PAY_TYPES, computeEntry, parseDateTime } from "./salary.js";
import { normalizeGoal } from "./savings.js";
import { STORAGE_KEYS, readRaw, writeRaw, removeKey } from "./storage.js";
import { localDateStamp } from "./format.js";
import { MAX_MONEY, makeId } from "./money.js";

export const BACKUP_APP = "talaan";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export function buildBackup({ duties, goals }, now = new Date()) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    // Pay rates live on each duty entry; there is no separate salary settings
    // store in Taláan. Currency is recorded for forward compatibility.
    settings: { currency: "PHP" },
    data: { duties, goals },
  };
}

export const backupFilename = (now = new Date()) => `talaan-backup-${localDateStamp(now)}.json`;

export function downloadBackup(backup, now = new Date()) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename(now);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const isMoney = (v, { allowZero = true } = {}) =>
  typeof v === "number" && Number.isFinite(v) && v <= MAX_MONEY && (allowZero ? v >= 0 : v > 0);

function checkDuty(d, i) {
  const where = `Duty #${i + 1}`;
  if (!d || typeof d !== "object" || Array.isArray(d)) return `${where} is not a valid record.`;
  if (!PAY_TYPES.includes(d.payType)) return `${where} has an unknown pay type.`;
  if (!parseDateTime(d.dutyIn)) return `${where} has an invalid duty-in time.`;
  if (!parseDateTime(d.dutyOut)) return `${where} has an invalid duty-out time.`;
  for (const f of ["hourlyRate", "dayRate", "otRate", "overtime"]) {
    if (d[f] !== undefined && d[f] !== "" && !isMoney(Number(d[f]))) return `${where} has an invalid ${f}.`;
  }
  if (d.id !== undefined && typeof d.id !== "string") return `${where} has an invalid id.`;
  return null;
}

function checkGoal(g, i) {
  const where = `Goal #${i + 1}`;
  if (!g || typeof g !== "object" || Array.isArray(g)) return `${where} is not a valid record.`;
  if (typeof g.name !== "string" || !g.name.trim()) return `${where} has no name.`;
  if (!isMoney(g.targetAmount, { allowZero: false })) return `${where} has an invalid target amount.`;
  if (g.startingAmount !== undefined && !isMoney(g.startingAmount)) return `${where} has an invalid starting amount.`;
  if (!Array.isArray(g.deposits)) return `${where} has no deposit list.`;
  for (const [j, dep] of g.deposits.entries()) {
    if (!dep || !isMoney(dep.amount, { allowZero: false }) || !parseDateTime(dep.at))
      return `${where}, deposit #${j + 1} is invalid.`;
  }
  return null;
}

const firstDuplicate = (list) => {
  const seen = new Set();
  for (const item of list) {
    if (typeof item?.id !== "string") continue;
    if (seen.has(item.id)) return item.id;
    seen.add(item.id);
  }
  return null;
};

/**
 * Validates a backup file's text. Nothing is written here: the caller gets
 * either { ok:false, error } or { ok:true, duties, goals } with clean data.
 */
export function parseBackup(text) {
  if (typeof text !== "string" || text.length === 0) return { ok: false, error: "The file is empty." };
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: "The file is too large to be a Taláan backup." };

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file isn't valid JSON. It may be corrupted." };
  }
  if (!json || typeof json !== "object" || Array.isArray(json) || json.app !== BACKUP_APP)
    return { ok: false, error: "This doesn't look like a Taláan backup file." };
  if (!Number.isInteger(json.version) || json.version < 1)
    return { ok: false, error: "The backup has no valid version number." };
  if (json.version > BACKUP_VERSION)
    return { ok: false, error: "This backup was made by a newer version of Taláan. Update the app and try again." };
  if (!json.data || !Array.isArray(json.data.duties) || !Array.isArray(json.data.goals))
    return { ok: false, error: "The backup is missing its duty or savings data." };

  const { duties: rawDuties, goals: rawGoals } = json.data;
  for (const [i, d] of rawDuties.entries()) {
    const problem = checkDuty(d, i);
    if (problem) return { ok: false, error: problem };
  }
  for (const [i, g] of rawGoals.entries()) {
    const problem = checkGoal(g, i);
    if (problem) return { ok: false, error: problem };
  }
  if (firstDuplicate(rawDuties)) return { ok: false, error: "The backup contains duplicate duty records." };
  if (firstDuplicate(rawGoals)) return { ok: false, error: "The backup contains duplicate savings goals." };

  // Recompute from raw inputs so imported totals are always trustworthy.
  const duties = rawDuties.map((d) => computeEntry(d, d.id || makeId()));
  const goals = rawGoals.map(normalizeGoal);
  if (goals.some((g) => g === null)) return { ok: false, error: "One of the savings goals couldn't be read." };
  return { ok: true, duties, goals };
}

/** Replaces stored data with imported data; rolls back if the second write fails. */
export function applyBackup({ duties, goals }) {
  const prevDuties = readRaw(STORAGE_KEYS.duties);
  const prevGoals = readRaw(STORAGE_KEYS.goals);
  const restore = (key, value) => (value === null ? removeKey(key) : writeRaw(key, value));

  if (!writeRaw(STORAGE_KEYS.duties, JSON.stringify(duties))) return false;
  if (!writeRaw(STORAGE_KEYS.goals, JSON.stringify(goals))) {
    restore(STORAGE_KEYS.duties, prevDuties);
    restore(STORAGE_KEYS.goals, prevGoals);
    return false;
  }
  return true;
}
