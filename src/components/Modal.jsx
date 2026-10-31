import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { iconBtn } from "./uiStyles.js";

/**
 * Accessible modal built on the native <dialog>.
 * Layout is header / scrolling body / footer, so the close button and the
 * action buttons stay on screen however tall the content is.
 * Children are only mounted while open, so forms reset every time.
 */
export default function Modal({ open, onClose, title, subtitle, size = "max-w-lg", children }) {
  const ref = useRef(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  // Fires for Escape, backdrop clicks, and dialog.close(). Only report a close
  // the parent doesn't already know about.
  const handleClose = () => {
    if (openRef.current) onClose?.();
  };

  const titleId = `${title.replace(/\W+/g, "-").toLowerCase()}-title`;

  return (
    <dialog ref={ref} onClose={handleClose} aria-labelledby={titleId} className="modal modal-middle">
      <div
        className={`modal-box flex flex-col bg-[#1b263b] border border-[#415a77] rounded-xl p-0 overflow-hidden w-11/12 ${size} max-h-[calc(100dvh-2rem)]`}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#415a77] bg-[#1b263b]">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 id={titleId} className="font-brand text-base font-semibold text-[#e0e1dd] tracking-widest uppercase truncate">
              {title}
            </h3>
            {subtitle && <p className="font-body text-xs text-[#778da9]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={`${iconBtn} shrink-0`}>
            <X size={18} />
          </button>
        </div>
        {open && children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Close dialog">close</button>
      </form>
    </dialog>
  );
}

export const ModalBody = ({ children, className = "" }) => (
  <div className={`flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 ${className}`}>{children}</div>
);

export const ModalFooter = ({ children, className = "grid grid-cols-2 gap-3" }) => (
  <div className={`shrink-0 px-5 sm:px-6 py-4 border-t border-[#415a77] bg-[#1b263b] ${className}`}>{children}</div>
);
