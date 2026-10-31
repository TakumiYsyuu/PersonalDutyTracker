import { useRef, useState } from "react";
import Modal, { ModalBody, ModalFooter } from "./Modal.jsx";
import Field from "./Field.jsx";
import { btnPrimary, btnSecondary, inputClass } from "./uiStyles.js";
import { getGoalStats, validateDeposit } from "../Logic/savings.js";
import { formatPeso } from "../Logic/format.js";
import { roundMoney } from "../Logic/money.js";

function DepositForm({ goal, onSave, onCancel }) {
  const stats = getGoalStats(goal);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const check = validateDeposit(amount, stats.remaining);
  const newSaved = check.value ? roundMoney(stats.saved + check.value) : stats.saved;
  const newPercent = Math.min(100, Math.floor((newSaved / stats.target) * 100));

  const handleChange = (value) => {
    setAmount(value);
    setError("");
    setNeedsConfirm(false); // any edit cancels a pending over-target confirmation
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting.current) return;
    const result = validateDeposit(amount, stats.remaining);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.exceeds && !needsConfirm) {
      setNeedsConfirm(true);
      return;
    }
    submitting.current = true;
    setSaving(true);
    onSave(result.value);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
      <ModalBody className="flex flex-col gap-5">
        <div className="bg-[#0d1b2a] border border-[#415a77] rounded-lg p-4 flex flex-col gap-1">
          <p className="font-brand text-sm font-semibold text-[#e0e1dd] wrap-break-word">{goal.name}</p>
          <p className="font-body text-xs text-[#778da9]">
            {formatPeso(stats.saved)} saved of {formatPeso(stats.target)} · {formatPeso(stats.remaining)} to go
          </p>
        </div>

        <Field id="deposit-amount" label="Amount to add (₱)" error={error}>
          {(a11y) => (
            <input {...a11y} type="text" inputMode="decimal" value={amount} placeholder="0.00" autoComplete="off"
              onChange={(e) => handleChange(e.target.value)} className={inputClass} />
          )}
        </Field>

        {stats.remaining > 0 && (
          <button type="button" onClick={() => handleChange(String(stats.remaining))}
            className="font-ui self-start min-h-11 px-4 rounded-lg border border-[#415a77] text-xs uppercase tracking-widest text-[#778da9] hover:bg-[#415a77] hover:text-[#e0e1dd] transition-colors duration-200">
            Fill remaining · {formatPeso(stats.remaining)}
          </button>
        )}

        {check.value > 0 && (
          <p className="font-body text-xs text-[#778da9]" aria-live="polite">
            New balance <span className="text-[#e0e1dd]">{formatPeso(newSaved)}</span> · {newPercent}%
          </p>
        )}

        {needsConfirm && (
          <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-900/10 p-3 font-body text-sm text-amber-300">
            {stats.remaining === 0 ?
              "This goal is already complete."
            : `This is ${formatPeso(roundMoney(check.value - stats.remaining))} more than the ${formatPeso(stats.remaining)} still needed.`}{" "}
            Press “Add anyway” to deposit {formatPeso(check.value)} regardless.
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Adding…" : needsConfirm ? "Add anyway" : "Add Money"}
        </button>
      </ModalFooter>
    </form>
  );
}

export default function DepositModal({ open, goal, onSave, onClose }) {
  return (
    <Modal open={open && goal !== null} onClose={onClose} title="Add Money" subtitle="Record a deposit toward this goal" size="max-w-md">
      {goal && <DepositForm goal={goal} onSave={onSave} onCancel={onClose} />}
    </Modal>
  );
}
