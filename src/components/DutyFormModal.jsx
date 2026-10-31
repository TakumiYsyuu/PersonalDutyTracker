import { useRef, useState } from "react";
import Modal, { ModalBody, ModalFooter } from "./Modal.jsx";
import Field from "./Field.jsx";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "./uiStyles.js";
import { computeEntry, dutyToForm, emptyDutyForm, validateDutyForm } from "../Logic/salary.js";
import { formatHours, formatPeso } from "../Logic/format.js";
import { makeId } from "../Logic/money.js";

const dateInputStyle = (value) => ({
  colorScheme: "dark",
  color: value ? "#e0e1dd" : "#778da9",
});

const Row = ({ label, value, strong }) => (
  <div className={`flex justify-between gap-3 font-body ${strong ? "text-sm text-[#e0e1dd]" : "text-xs text-[#778da9]"}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

function DutyForm({ duty, existing, onSave, onCancel }) {
  const [form, setForm] = useState(duty ? dutyToForm(duty) : emptyDutyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false); // blocks double taps before React re-renders
  const formRef = useRef(null);

  const editingId = duty?.id ?? null;
  const preview = computeEntry(form);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const handleChange = (e) => set(e.target.name, e.target.value);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting.current) return;
    const { errors: found } = validateDutyForm(form, { existing, editingId });
    setErrors(found);
    const firstBad = Object.keys(found)[0];
    if (firstBad) {
      formRef.current?.querySelector(`[name="${firstBad}"]`)?.focus();
      return;
    }
    submitting.current = true;
    setSaving(true);
    onSave(computeEntry(form, editingId ?? makeId()));
  };

  const money = (name, label, placeholder = "0") => (
    <Field id={`duty-${name}`} label={label} error={errors[name]}>
      {(a11y) => (
        <input {...a11y} type="text" inputMode="decimal" name={name} value={form[name]} placeholder={placeholder}
          onChange={handleChange} className={inputClass} autoComplete="off" />
      )}
    </Field>
  );

  const overtimeFields = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {form.payType === "hourly" ? money("hourlyRate", "Hourly Rate (₱)") : money("dayRate", "Day Rate (₱)")}
        {money("otRate", "OT Rate/Hr (₱)")}
      </div>
      <Field id="duty-overtime" label="Overtime Hours" error={errors.overtime}
        hint="Overtime is part of your total clocked time, not extra on top of it.">
        {(a11y) => (
          <input {...a11y} type="text" inputMode="decimal" name="overtime" value={form.overtime} placeholder="0"
            onChange={handleChange} className={inputClass} autoComplete="off" />
        )}
      </Field>
    </>
  );

  const showWarning = preview.status === "invalid" && form.dutyIn && form.dutyOut;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
      <ModalBody className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className={labelClass} id="pay-type-label">Pay Type</span>
          <div role="group" aria-labelledby="pay-type-label" className="grid grid-cols-3 gap-2">
            {["hourly", "daily", "fixed"].map((type) => (
              <button key={type} type="button" aria-pressed={form.payType === type}
                onClick={() => set("payType", type)}
                className={`font-ui min-h-11 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-widest border transition-colors duration-200 ${
                  form.payType === type ?
                    "bg-[#415a77] border-[#778da9] text-[#e0e1dd]"
                  : "bg-[#0d1b2a] border-[#415a77] text-[#778da9] hover:bg-[#415a77] hover:text-[#e0e1dd]"
                }`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field id="duty-dutyIn" label="Duty In" error={errors.dutyIn}>
            {(a11y) => (
              <input {...a11y} type="datetime-local" name="dutyIn" value={form.dutyIn} onChange={handleChange}
                style={{ ...a11y.style, ...dateInputStyle(form.dutyIn) }} className={inputClass} />
            )}
          </Field>
          <Field id="duty-dutyOut" label="Duty Out" error={errors.dutyOut}>
            {(a11y) => (
              <input {...a11y} type="datetime-local" name="dutyOut" value={form.dutyOut} onChange={handleChange}
                min={form.dutyIn || undefined}
                style={{ ...a11y.style, ...dateInputStyle(form.dutyOut) }} className={inputClass} />
            )}
          </Field>
        </div>

        {form.payType !== "fixed" && overtimeFields}
        {form.payType === "fixed" && money("dayRate", "Fixed Pay (₱)")}

        <div className="bg-[#0d1b2a] border border-[#415a77] rounded-xl p-4 flex flex-col gap-2" aria-live="polite">
          <p className="font-ui text-xs uppercase tracking-widest text-[#778da9] mb-1">Live Preview</p>
          {showWarning && (
            <p className="font-body text-xs text-amber-400">
              These times can't be calculated yet. Check that duty out is after duty in and under 24 hours.
            </p>
          )}
          <Row strong label="Total clocked" value={formatHours(preview.hoursWorked)} />
          {form.payType !== "fixed" && (
            <>
              <Row label="Regular hrs" value={formatHours(preview.regularHours)} />
              <Row label="OT hrs" value={formatHours(preview.overtime)} />
            </>
          )}
          <div className="border-t border-[#415a77] my-1" />
          {form.payType === "fixed" ?
            <Row label="Fixed pay" value={formatPeso(preview.baseEarnings)} />
          : <>
              <Row label={form.payType === "hourly" ? "Base pay" : "Day rate"} value={formatPeso(preview.baseEarnings)} />
              <Row label={`OT (${preview.overtime}h × ${formatPeso(preview.otRate)})`} value={formatPeso(preview.otEarnings)} />
            </>
          }
          <div className="border-t border-[#415a77] my-1" />
          <Row strong label="Total" value={<span className="text-emerald-400 font-semibold">{formatPeso(preview.earnings)}</span>} />
        </div>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Saving…" : editingId ? "Update Duty" : "Save Duty"}
        </button>
      </ModalFooter>
    </form>
  );
}

export default function DutyFormModal({ open, duty, existing, onSave, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={duty ? "Edit Duty" : "Log New Duty"} subtitle="Fill in your duty details below">
      <DutyForm duty={duty} existing={existing} onSave={onSave} onCancel={onClose} />
    </Modal>
  );
}
