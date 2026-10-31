import { useState } from "react";
import { AlertTriangle, FileCheck2 } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "./Modal.jsx";
import Field from "./Field.jsx";
import { btnDanger, btnSecondary, inputClass } from "./uiStyles.js";

/**
 * Shown after a backup file has been read. A rejected file shows why and
 * offers nothing destructive; a valid one asks before replacing anything.
 */
export function ImportDialog({ open, fileName, result, error, onConfirm, onClose }) {
  const valid = result?.ok === true;
  return (
    <Modal open={open} onClose={onClose} title="Import Backup" subtitle={fileName} size="max-w-md">
      <ModalBody className="flex flex-col gap-4">
        {valid ?
          <>
            <div className="flex items-start gap-3">
              <FileCheck2 size={20} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="font-body text-sm text-[#e0e1dd]">
                This backup is valid and contains <strong>{result.duties.length}</strong> duty{" "}
                {result.duties.length === 1 ? "record" : "records"} and <strong>{result.goals.length}</strong> savings{" "}
                {result.goals.length === 1 ? "goal" : "goals"}.
              </p>
            </div>
            <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-900/10 p-3 font-body text-sm text-amber-300">
              Importing replaces ALL duties and savings goals currently on this device. Export a backup first if you
              want to keep them.
            </div>
          </>
        : <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-900/10 p-3">
            <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="font-body text-sm text-red-300">
              <p className="font-semibold">This file can't be imported.</p>
              <p className="mt-1">{error || result?.error}</p>
              <p className="mt-2 text-xs text-[#778da9]">Nothing on this device was changed.</p>
            </div>
          </div>
        }
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={onClose} className={btnSecondary}>{valid ? "Cancel" : "Close"}</button>
        {valid && <button type="button" onClick={onConfirm} className={btnDanger}>Replace Data</button>}
      </ModalFooter>
    </Modal>
  );
}

const CONFIRM_WORD = "ERASE";

function EraseForm({ onConfirm, onCancel }) {
  const [text, setText] = useState("");
  const ready = text.trim().toUpperCase() === CONFIRM_WORD;
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onConfirm();
      }}
      className="flex flex-col min-h-0 flex-1"
    >
      <ModalBody className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="font-body text-sm text-[#e0e1dd] flex flex-col gap-2">
            <p>This permanently deletes, from this device:</p>
            <ul className="list-disc pl-5 text-[#778da9]">
              <li>every duty record and its earnings</li>
              <li>every savings goal and its deposit history</li>
              <li>recovery copies Taláan keeps of older data</li>
            </ul>
            <p className="text-xs text-[#778da9]">It can't be undone. Export a backup first if you might need this data.</p>
          </div>
        </div>
        <Field id="erase-confirm" label={`Type ${CONFIRM_WORD} to confirm`}>
          {(a11y) => (
            <input {...a11y} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off"
              autoCapitalize="characters" placeholder={CONFIRM_WORD} className={inputClass} />
          )}
        </Field>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
        <button type="submit" disabled={!ready} className={btnDanger}>Erase Everything</button>
      </ModalFooter>
    </form>
  );
}

export function EraseDialog({ open, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Erase All Data" size="max-w-md">
      <EraseForm onConfirm={onConfirm} onCancel={onClose} />
    </Modal>
  );
}

