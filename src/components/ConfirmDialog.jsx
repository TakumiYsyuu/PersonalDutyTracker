import { AlertTriangle } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "./Modal.jsx";
import { btnDanger, btnPrimary, btnSecondary } from "./uiStyles.js";

export default function ConfirmDialog({
  open, title, message, detail, confirmLabel = "Confirm", danger = false, onConfirm, onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="max-w-sm">
      <ModalBody className="flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-red-900/20 border border-red-500/30 flex items-center justify-center">
          <AlertTriangle size={20} className="text-red-400" aria-hidden="true" />
        </div>
        <p className="font-body text-sm text-[#e0e1dd]">{message}</p>
        {detail && <p className="font-brand text-xs uppercase tracking-widest text-[#778da9] wrap-break-word max-w-full">{detail}</p>}
        <p className="font-body text-xs text-[#778da9]">This action cannot be undone.</p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className={danger ? btnDanger : btnPrimary}>
          {confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
}
