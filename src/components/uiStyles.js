// Shared class strings, all drawn from the Deep Sea palette in Infos.md.
// #0d1b2a / #1b263b / #415a77 / #778da9 / #e0e1dd, with the documented hover
// shades #526b89 / #8fa3bc / #c9cbc6.

export const labelClass = "font-ui text-xs uppercase tracking-widest text-[#778da9]";

export const inputClass =
  "font-body w-full rounded-lg border bg-[#0d1b2a] px-3 py-2.5 text-sm text-[#e0e1dd] placeholder-[#415a77] " +
  "focus:outline-none focus:border-[#8fa3bc] transition-colors duration-200 disabled:opacity-50";

export const btnPrimary =
  "font-ui inline-flex items-center justify-center gap-2 min-h-11 rounded-xl bg-[#415a77] px-5 py-2.5 text-sm font-semibold " +
  "uppercase tracking-widest text-[#e0e1dd] hover:bg-[#526b89] transition-colors duration-200 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#415a77]";

export const btnSecondary =
  "font-ui inline-flex items-center justify-center gap-2 min-h-11 rounded-xl border border-[#415a77] bg-[#0d1b2a] px-5 py-2.5 text-sm " +
  "font-semibold uppercase tracking-widest text-[#778da9] hover:bg-[#415a77] hover:text-[#e0e1dd] transition-colors duration-200 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const btnDanger =
  "font-ui inline-flex items-center justify-center gap-2 min-h-11 rounded-xl border border-red-500/40 bg-red-900/30 px-5 py-2.5 text-sm " +
  "font-semibold uppercase tracking-widest text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors duration-200 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const iconBtn =
  "inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-[#778da9] hover:bg-[#415a77] hover:text-[#e0e1dd] " +
  "transition-colors duration-200";

export const card = "bg-[#1b263b] rounded-xl border border-[#415a77]";
export const innerCard = "bg-[#0d1b2a] rounded-lg border border-[#415a77]";
