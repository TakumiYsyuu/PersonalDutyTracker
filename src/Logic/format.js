// Display helpers. Everything user-facing goes through here so that currency,
// hours, and dates look the same on every page.

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export const formatPeso = (value) => {
  const n = Number(value);
  return pesoFormatter.format(Number.isFinite(n) ? n : 0);
};

export const formatHours = (value) => {
  const n = Number(value);
  return `${(Number.isFinite(n) ? n : 0).toFixed(2)} hrs`;
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value) => {
  const d = toDate(value);
  return d ?
      d.toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
};

export const formatTime = (value) => {
  const d = toDate(value);
  return d ?
      d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
    : "—";
};

export const formatDateTime = (value) => {
  const d = toDate(value);
  return d ?
      d.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
};

export const formatMonthYear = (year, month) =>
  new Date(year, month, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

// Local calendar date as YYYY-MM-DD (used for backup filenames).
export const localDateStamp = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
