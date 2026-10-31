import { useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import DutyFormModal from "../components/DutyFormModal.jsx";
import SummaryPanel from "../components/SummaryPanel.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/toastContext.js";
import { usePersistentCollection } from "../hooks/usePersistentCollection.js";
import { loadDuties, saveDuties } from "../Logic/storage.js";
import { summarize } from "../Logic/summary.js";
import { formatDate, formatHours, formatPeso, formatTime } from "../Logic/format.js";

const Pill = ({ children }) => (
  <span className="font-ui text-xs bg-[#1b263b] border border-[#415a77] text-[#778da9] px-2.5 py-1 rounded-full">{children}</span>
);

const Dashboard = () => {
  const toast = useToast();
  const [duties, commit] = usePersistentCollection(loadDuties, saveDuties, "duty records");
  const [formState, setFormState] = useState({ open: false, duty: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  // The log refreshes its numbering from this list; summary is derived from it too.
  const totals = useMemo(() => summarize(duties), [duties]);
  const lastSaved = useRef(null);

  const openNew = () => setFormState({ open: true, duty: null });
  const openEdit = (duty) => setFormState({ open: true, duty });
  const closeForm = () => setFormState((s) => ({ ...s, open: false }));

  const handleSave = (entry) => {
    if (lastSaved.current === entry) return; // guards against a repeated submit event
    lastSaved.current = entry;
    const editing = formState.duty !== null;
    commit((list) => (editing ? list.map((d) => (d.id === entry.id ? entry : d)) : [...list, entry]));
    closeForm();
    toast.success(
      editing ? `Duty updated — ${formatPeso(entry.earnings)}.` : `Duty saved — ${formatPeso(entry.earnings)} earned.`,
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    commit((list) => list.filter((d) => d.id !== id));
    setDeleteTarget(null);
    toast.success("Duty deleted.");
  };

  const deleteIndex = deleteTarget ? duties.findIndex((d) => d.id === deleteTarget.id) : -1;

  return (
    <>
      <div className="p-4 sm:p-6 flex-1 min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-5 bg-[#1b263b] rounded-xl p-5 flex items-center justify-between border border-[#415a77]">
            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="font-brand text-xl sm:text-2xl font-semibold text-[#e0e1dd] tracking-widest uppercase">
                Kinsenas Tracker
              </h1>
              <span className="font-body text-xs tracking-widest text-[#778da9] uppercase">Financial Tracker · by Victor</span>
              <span className="font-ui text-xs text-[#778da9] font-light tracking-wide">Duty Tracker</span>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3 min-w-0">
            <div className="bg-[#1b263b] rounded-xl p-5 border border-[#415a77]">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Duty Log", duties.length, false],
                  ["Total Hours", formatHours(totals.hours), false],
                  ["OT Pay", formatPeso(totals.overtimeEarnings), true],
                  ["Total Pay", formatPeso(totals.total), true],
                ].map(([label, value, money]) => (
                  <div key={label} className="bg-[#0d1b2a] rounded-lg p-3 border border-[#415a77] min-w-0">
                    <p className="font-ui text-xs uppercase tracking-widest text-[#778da9] mb-2">{label}</p>
                    <p className={`font-brand text-lg sm:text-xl font-semibold wrap-break-word ${money ? "text-emerald-400" : "text-[#e0e1dd]"}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" onClick={openNew}
              className="font-ui w-full min-h-14 py-5 rounded-xl border border-[#415a77] bg-[#415a77] hover:bg-[#526b89] text-[#e0e1dd] font-medium text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-colors duration-200">
              <Plus size={16} aria-hidden="true" /> Log New Duty
            </button>
          </div>

          <div className="md:col-span-3 bg-[#1b263b] rounded-xl p-5 border border-[#415a77] flex flex-col gap-4 min-w-0 md:max-h-[34rem]">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="font-brand text-sm font-semibold text-[#e0e1dd] tracking-widest uppercase">Duty Log</h2>
              <span className="font-ui text-xs bg-[#415a77] text-[#e0e1dd] px-3 py-1 rounded-full tracking-wide">
                {duties.length} {duties.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
              {duties.length === 0 ?
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                  <p className="font-ui text-xs uppercase tracking-widest text-[#778da9]">No duties logged yet</p>
                  <p className="font-body text-xs text-[#778da9]">Tap + Log New Duty to get started</p>
                </div>
              : duties.map((d, i) => (
                  <div key={d.id} className="bg-[#0d1b2a] rounded-xl border border-[#415a77] p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${d.status === "complete" ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span className="font-ui text-xs font-medium text-[#778da9] uppercase tracking-widest truncate">
                          {d.payType} · #{i + 1}
                        </span>
                      </div>
                      <span className="font-brand text-sm font-semibold text-emerald-400 shrink-0">{formatPeso(d.earnings)}</span>
                    </div>

                    <p className="font-body text-xs text-[#778da9]">{formatDate(d.dutyIn)}</p>
                    <p className="font-body text-sm font-semibold text-[#e0e1dd]">
                      {formatTime(d.dutyIn)} → {formatTime(d.dutyOut)}
                    </p>

                    {d.status !== "complete" && (
                      <p className="font-body text-xs text-amber-400">
                        {d.status === "incomplete" ? "Incomplete" : "Invalid times"} — edit this duty to fix it. It earns ₱0 until then.
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill>{formatHours(d.hoursWorked)}</Pill>
                      <Pill>{formatHours(d.regularHours)} reg</Pill>
                      <Pill>{formatHours(d.overtime)} OT</Pill>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-[#415a77]">
                      <button type="button" onClick={() => openEdit(d)}
                        className="font-ui min-h-11 pr-3 text-xs text-[#778da9] hover:text-[#e0e1dd] uppercase tracking-widest transition-colors duration-200">
                        Edit
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(d)}
                        className="font-ui min-h-11 pl-3 text-xs text-red-400 hover:text-red-300 uppercase tracking-widest ml-auto transition-colors duration-200">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="md:col-span-5 min-w-0">
            <SummaryPanel duties={duties} />
          </div>
        </div>
      </div>

      <DutyFormModal open={formState.open} duty={formState.duty} existing={duties} onSave={handleSave} onClose={closeForm} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Duty"
        message="Are you sure you want to delete"
        detail={deleteTarget ? `${deleteTarget.payType} · #${deleteIndex + 1} — ${formatPeso(deleteTarget.earnings)}` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default Dashboard;
