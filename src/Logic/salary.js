import { MAX_HOURS, MAX_MONEY, parseDecimal, round2, roundMoney } from "./money.js";

export const PAY_TYPES = ["hourly", "daily", "fixed"];
const MS_PER_HOUR = 1000 * 60 * 60;

export const parseDateTime = (value) => {
  if (typeof value !== "string" || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Non-negative finite number or 0. Used when reading stored/legacy data.
const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Hours between two datetime-local strings. Because both values carry a full
 * date, overnight shifts (e.g. 22:00 -> 06:00 next day) work naturally.
 * Returns null when the pair can't produce a valid positive duration.
 */
export function getClockedHours(dutyIn, dutyOut) {
  const start = parseDateTime(dutyIn);
  const end = parseDateTime(dutyOut);
  if (!start || !end) return null;
  const hours = (end - start) / MS_PER_HOUR;
  if (hours <= 0 || hours > MAX_HOURS) return null;
  return hours;
}

/**
 * Pure salary calculation for one duty entry.
 *
 * Rules:
 *  - Overtime hours are PART OF the clocked time, never added on top of it.
 *      regular hours = clocked hours - overtime hours
 *  - hourly: regular hours x hourly rate  + OT hours x OT rate
 *  - daily:  day rate (once)              + OT hours x OT rate
 *  - fixed:  the fixed amount only (no overtime)
 *  - Incomplete or invalid duties earn nothing until corrected.
 */
export function computeEntry(input, id) {
  const payType = PAY_TYPES.includes(input?.payType) ? input.payType : "hourly";
  const clocked = getClockedHours(input?.dutyIn, input?.dutyOut);

  let status = "complete";
  if (!parseDateTime(input?.dutyIn) || !input?.dutyOut) status = "incomplete";
  else if (clocked === null) status = "invalid";

  const hoursWorked = clocked ?? 0;
  const hourlyRate = safeNumber(input?.hourlyRate);
  const dayRate = safeNumber(input?.dayRate);
  const otRate = safeNumber(input?.otRate);

  const overtimeHours =
    payType === "fixed" ? 0 : Math.min(safeNumber(input?.overtime), hoursWorked);
  const regularHours = Math.max(hoursWorked - overtimeHours, 0);

  let baseEarnings = 0;
  if (status === "complete") {
    if (payType === "hourly") baseEarnings = regularHours * hourlyRate;
    else baseEarnings = dayRate; // daily and fixed both use the amount field
  }
  const otEarnings = payType === "fixed" ? 0 : overtimeHours * otRate;

  return {
    id: id ?? input?.id,
    payType,
    dutyIn: typeof input?.dutyIn === "string" ? input.dutyIn : "",
    dutyOut: typeof input?.dutyOut === "string" ? input.dutyOut : "",
    overtime: round2(overtimeHours),
    hourlyRate,
    dayRate,
    otRate,
    status,
    hoursWorked: round2(hoursWorked),
    regularHours: round2(regularHours),
    baseEarnings: roundMoney(baseEarnings),
    otEarnings: roundMoney(otEarnings),
    earnings: roundMoney(roundMoney(baseEarnings) + roundMoney(otEarnings)),
  };
}

export const emptyDutyForm = {
  dutyIn: "",
  dutyOut: "",
  overtime: "",
  hourlyRate: "",
  dayRate: "",
  otRate: "",
  payType: "hourly",
};

export const dutyToForm = (d) => ({
  dutyIn: d.dutyIn || "",
  dutyOut: d.dutyOut || "",
  overtime: d.overtime ? String(d.overtime) : "",
  hourlyRate: d.hourlyRate ? String(d.hourlyRate) : "",
  dayRate: d.dayRate ? String(d.dayRate) : "",
  otRate: d.otRate ? String(d.otRate) : "",
  payType: PAY_TYPES.includes(d.payType) ? d.payType : "hourly",
});

/**
 * Validates the duty form. Returns { errors } where errors is keyed by field
 * name; an empty object means the form is valid.
 */
export function validateDutyForm(form, { existing = [], editingId = null } = {}) {
  const errors = {};

  const start = parseDateTime(form.dutyIn);
  const end = parseDateTime(form.dutyOut);
  if (!form.dutyIn) errors.dutyIn = "Enter your duty-in date and time.";
  else if (!start) errors.dutyIn = "That start time isn't valid.";
  if (!form.dutyOut) errors.dutyOut = "Enter your duty-out date and time.";
  else if (!end) errors.dutyOut = "That end time isn't valid.";

  let clocked = null;
  if (start && end) {
    const hours = (end - start) / MS_PER_HOUR;
    if (hours <= 0) errors.dutyOut = "Duty out must be after duty in.";
    else if (hours > MAX_HOURS)
      errors.dutyOut = `A single duty can't be longer than ${MAX_HOURS} hours.`;
    else clocked = hours;
  }

  const money = (field, label, { required }) => {
    const r = parseDecimal(form[field], { max: MAX_MONEY });
    if (r.empty) {
      if (required) errors[field] = `Enter ${label}.`;
    } else if (r.error) errors[field] = r.error;
    else if (required && r.value <= 0) errors[field] = `${label} must be more than ₱0.`;
    return r.value ?? 0;
  };

  if (form.payType === "hourly") money("hourlyRate", "your hourly rate", { required: true });
  else if (form.payType === "daily") money("dayRate", "your day rate", { required: true });
  else if (form.payType === "fixed") money("dayRate", "the fixed pay", { required: true });
  else errors.payType = "Choose a pay type.";

  if (form.payType !== "fixed") {
    const otRate = money("otRate", "an OT rate", { required: false });
    let otHours = 0;
    const h = parseDecimal(form.overtime, { max: MAX_HOURS });
    if (h.error) errors.overtime = h.error;
    else if (!h.empty) {
      otHours = h.value;
      if (clocked !== null && otHours > clocked)
        errors.overtime = "Overtime can't be longer than the total clocked time.";
    }
    if (otHours > 0 && otRate <= 0 && !errors.otRate && !errors.overtime)
      errors.otRate = "Enter an OT rate, or set overtime hours to 0.";
  }

  if (!errors.dutyIn && !errors.dutyOut) {
    const clash = existing.some(
      (d) => d.id !== editingId && d.dutyIn === form.dutyIn && d.dutyOut === form.dutyOut,
    );
    if (clash) errors.dutyOut = "You already logged a duty with these exact times.";
  }

  return { errors };
}
