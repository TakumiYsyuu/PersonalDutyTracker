import { useRef, useState } from "react";
import Modal, { ModalBody, ModalFooter } from "./Modal.jsx";
import Field from "./Field.jsx";
import { btnPrimary, btnSecondary, inputClass } from "./uiStyles.js";
import { DESCRIPTION_MAX, NAME_MAX, validateGoalForm } from "../Logic/savings.js";
import { formatPeso } from "../Logic/format.js";

const toForm = (goal) =>
  goal ?
    {
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      startingAmount: goal.startingAmount ? String(goal.startingAmount) : "",
      description: goal.description,
    }
  : { name: "", targetAmount: "", startingAmount: "", description: "" };

function GoalForm({ goal, onSave, onCancel }) {
  const [form, setForm] = useState(() => toForm(goal));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const formRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting.current) return;
    const { errors: found, values } = validateGoalForm(form);
    // A new goal can't start already past its target; an edited one may (it just completes).
    if (!goal && !found.targetAmount && !found.startingAmount && values.startingAmount > values.targetAmount)
      found.startingAmount = "Starting savings can't be more than the target.";
    setErrors(found);
    const firstBad = Object.keys(found)[0];
    if (firstBad) {
      formRef.current?.querySelector(`[name="${firstBad}"]`)?.focus();
      return;
    }
    submitting.current = true;
    setSaving(true);
    onSave(values);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
      <ModalBody className="flex flex-col gap-5">
        <Field id="goal-name" label="Goal name" error={errors.name}>
          {(a11y) => (
            <input {...a11y} name="name" value={form.name} onChange={handleChange} maxLength={NAME_MAX}
              placeholder="e.g. New Headphones" className={inputClass} autoComplete="off" />
          )}
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field id="goal-target" label="Target price (₱)" error={errors.targetAmount}>
            {(a11y) => (
              <input {...a11y} name="targetAmount" type="text" inputMode="decimal" value={form.targetAmount}
                onChange={handleChange} placeholder="1000" className={inputClass} autoComplete="off" />
            )}
          </Field>
          <Field id="goal-start" label="Current savings (₱)" error={errors.startingAmount}
            hint={goal ? "Starting balance before any deposits." : "Optional. Money you've already set aside."}>
            {(a11y) => (
              <input {...a11y} name="startingAmount" type="text" inputMode="decimal" value={form.startingAmount}
                onChange={handleChange} placeholder="0" className={inputClass} autoComplete="off" />
            )}
          </Field>
        </div>
        <Field id="goal-description" label="Description (optional)" error={errors.description}>
          {(a11y) => (
            <textarea {...a11y} name="description" rows={3} maxLength={DESCRIPTION_MAX} value={form.description} onChange={handleChange}
              placeholder="Why do you want this?" className={`${inputClass} resize-none`} />
          )}
        </Field>
        {goal && (
          <p className="font-body text-xs text-[#778da9]">
            {goal.deposits.length} {goal.deposits.length === 1 ? "deposit" : "deposits"} on record
            ({formatPeso(goal.deposits.reduce((s, d) => s + d.amount, 0))}). Editing this goal never removes them.
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Saving…" : goal ? "Save Changes" : "Create Goal"}
        </button>
      </ModalFooter>
    </form>
  );
}

export default function GoalFormModal({ open, goal, onSave, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={goal ? "Edit Goal" : "New Goal"} subtitle="What are you saving for?">
      <GoalForm goal={goal} onSave={onSave} onCancel={onClose} />
    </Modal>
  );
}
