// Shared numeric helpers. Money is handled in centavos internally so sums such
// as 0.1 + 0.2 never drift.

export const MAX_MONEY = 1_000_000_000;
export const MAX_HOURS = 24;

export const toCents = (pesos) => Math.round(Number(pesos) * 100);
export const fromCents = (cents) => cents / 100;

export const roundMoney = (value) => fromCents(toCents(value));
export const round2 = (value) => Math.round(Number(value) * 100) / 100;

export const sumMoney = (values) =>
  fromCents(values.reduce((total, v) => total + toCents(v || 0), 0));

/**
 * Strictly parses a user-typed decimal. Returns
 * { value } on success or { error } with a readable message.
 * Blank input returns { empty: true }.
 */
export function parseDecimal(raw, { max = MAX_MONEY, decimals = 2 } = {}) {
  const text = String(raw ?? "")
    .trim()
    .replace(/,/g, "");
  if (text === "") return { empty: true };
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!pattern.test(text)) {
    return {
      error:
        decimals === 0 ?
          "Enter a whole number."
        : `Enter a valid number (up to ${decimals} decimal places, no negatives).`,
    };
  }
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: "Enter a valid number." };
  if (value > max) return { error: "That number is too large." };
  return { value };
}

export const makeId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
