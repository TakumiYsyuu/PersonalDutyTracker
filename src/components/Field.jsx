import { labelClass } from "./uiStyles.js";

/** Label + control + inline error, wired together for screen readers. */
export default function Field({ id, label, error, hint, children }) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
        style: { borderColor: error ? "#f87171" : "#415a77" },
      })}
      {error ?
        <p id={`${id}-error`} role="alert" className="font-body text-xs text-red-400">
          {error}
        </p>
      : hint ?
        <p id={`${id}-hint`} className="font-body text-xs text-[#778da9]">
          {hint}
        </p>
      : null}
    </div>
  );
}
