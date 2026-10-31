import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { ToastContext } from "./toastContext.js";

const STYLES = {
  success: { Icon: CheckCircle2, color: "text-emerald-400", border: "border-emerald-500/40" },
  error: { Icon: AlertCircle, color: "text-red-400", border: "border-red-500/40" },
  info: { Icon: Info, color: "text-[#8fa3bc]", border: "border-[#415a77]" },
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      timers.current.set(id, setTimeout(() => dismiss(id), type === "error" ? 7000 : 3500));
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  const api = useMemo(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 inset-x-4 z-[60] flex flex-col items-center gap-2 pointer-events-none"
      >
        {toasts.map(({ id, type, message }) => {
          const { Icon, color, border } = STYLES[type];
          return (
            <div
              key={id}
              role={type === "error" ? "alert" : "status"}
              className={`pointer-events-auto w-full max-w-md flex items-start gap-3 rounded-xl border ${border} bg-[#1b263b] px-4 py-3 shadow-2xl`}
            >
              <Icon size={18} className={`${color} mt-0.5 shrink-0`} aria-hidden="true" />
              <p className="font-body text-sm text-[#e0e1dd] flex-1 min-w-0 wrap-break-word">{message}</p>
              <button
                onClick={() => dismiss(id)}
                aria-label="Dismiss message"
                className="p-1 -m-1 rounded text-[#778da9] hover:text-[#e0e1dd] transition-colors duration-200"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
