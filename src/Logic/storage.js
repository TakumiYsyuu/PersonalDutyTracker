import { computeEntry, PAY_TYPES } from "./salary.js";
import { normalizeGoal } from "./savings.js";
import { makeId } from "./money.js";

// "duties" is the key the original app already used, so existing data is kept.
export const STORAGE_KEYS = {
  duties: "duties",
  goals: "talaan_goals",
};
const DUTIES_PRE_MIGRATION_BACKUP = "duties_pre_v2_backup";
const CORRUPT_PREFIX = "corrupt_backup_";

const store = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // access can throw when storage is blocked
  }
};

export const readRaw = (key) => {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

export const writeRaw = (key, value) => {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    return false; // quota exceeded, private mode, etc.
  }
};

export const removeKey = (key) => {
  try {
    store()?.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

// Keeps unreadable data around for recovery instead of overwriting it.
const quarantine = (key, raw) => {
  writeRaw(`${CORRUPT_PREFIX}${key}`, raw);
};

function readJSONArray(key) {
  const raw = readRaw(key);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  quarantine(key, raw);
  return [];
}

/** Rebuilds every duty from its raw inputs so stored totals can never be stale. */
export function normalizeDuties(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    let id = typeof item.id === "string" && item.id ? item.id : makeId();
    if (seen.has(id)) id = makeId(); // never allow two records with one id
    seen.add(id);
    out.push(computeEntry({ ...item, payType: PAY_TYPES.includes(item.payType) ? item.payType : "hourly" }, id));
  }
  return out;
}

export function loadDuties() {
  const raw = readJSONArray(STORAGE_KEYS.duties);
  // Entries from the first version have no id. Keep a copy of them once before
  // converting, so the conversion can never cost anyone their records.
  if (raw.some((d) => d && typeof d === "object" && !d.id) && readRaw(DUTIES_PRE_MIGRATION_BACKUP) === null) {
    writeRaw(DUTIES_PRE_MIGRATION_BACKUP, JSON.stringify(raw));
  }
  const duties = normalizeDuties(raw);
  if (raw.length) writeRaw(STORAGE_KEYS.duties, JSON.stringify(duties));
  return duties;
}

export const saveDuties = (duties) => writeRaw(STORAGE_KEYS.duties, JSON.stringify(duties));

export function loadGoals() {
  const seen = new Set();
  return readJSONArray(STORAGE_KEYS.goals)
    .map(normalizeGoal)
    .filter(Boolean)
    .map((g) => {
      if (!seen.has(g.id)) {
        seen.add(g.id);
        return g;
      }
      const id = makeId();
      seen.add(id);
      return { ...g, id };
    });
}

export const saveGoals = (goals) => writeRaw(STORAGE_KEYS.goals, JSON.stringify(goals));

/** Removes every key Taláan owns. Returns true only if nothing failed. */
export function eraseAllData() {
  const keys = [
    STORAGE_KEYS.duties,
    STORAGE_KEYS.goals,
    DUTIES_PRE_MIGRATION_BACKUP,
    `${CORRUPT_PREFIX}${STORAGE_KEYS.duties}`,
    `${CORRUPT_PREFIX}${STORAGE_KEYS.goals}`,
  ];
  return keys.map(removeKey).every(Boolean);
}
