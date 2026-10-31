import { useEffect, useRef, useState } from "react";
import { Menu, Settings, House, Flag, X, Download, Upload, Trash2 } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "./Modal.jsx";
import { ImportDialog, EraseDialog } from "./DataDialogs.jsx";
import { useToast } from "./toastContext.js";
import { btnSecondary } from "./uiStyles.js";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";
import { applyBackup, buildBackup, downloadBackup, MAX_BACKUP_BYTES, parseBackup } from "../Logic/backup.js";
import { eraseAllData, loadDuties, loadGoals } from "../Logic/storage.js";
import "../App.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", Icon: House },
  { id: "goals", label: "Goals", Icon: Flag },
];

const topBtn =
  "inline-flex items-center justify-center gap-2 min-h-11 min-w-11 p-2 rounded-lg text-[#778da9] hover:bg-[#1b263b] hover:text-[#e0e1dd] transition-colors duration-200";

const settingsBtn =
  "font-ui w-full min-h-12 flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0d1b2a] border border-[#415a77] text-[#e0e1dd] hover:bg-[#415a77] hover:border-[#778da9] transition-colors duration-200 text-sm font-medium tracking-wide";

const NavBar = ({ page, onNavigate, onDataChanged }) => {
  const toast = useToast();
  const { canInstall, install } = useInstallPrompt();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importState, setImportState] = useState({ open: false, fileName: "", result: null, error: "" });
  const [eraseOpen, setEraseOpen] = useState(false);
  const fileInput = useRef(null);

  // Escape closes the sidebar (native dialogs handle their own Escape).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const go = (id) => {
    setMenuOpen(false);
    onNavigate(id);
  };

  const handleInstall = async () => {
    setSettingsOpen(false);
    const outcome = await install();
    if (outcome === "accepted") toast.success("Taláan is being installed.");
  };

  const handleExport = () => {
    const backup = buildBackup({ duties: loadDuties(), goals: loadGoals() });
    try {
      downloadBackup(backup);
      setSettingsOpen(false);
      toast.success(
        `Backup downloaded (${backup.data.duties.length} duties, ${backup.data.goals.length} goals).`,
      );
    } catch {
      toast.error("Couldn't create the backup file. Please try again.");
    }
  };

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again later
    if (!file) return;
    setSettingsOpen(false);
    let result;
    if (file.size > MAX_BACKUP_BYTES) result = { ok: false, error: "The file is too large to be a Taláan backup." };
    else {
      try {
        result = parseBackup(await file.text());
      } catch {
        result = { ok: false, error: "The file couldn't be read." };
      }
    }
    setImportState({ open: true, fileName: file.name, result, error: "" });
  };

  const confirmImport = () => {
    if (!importState.result?.ok) return;
    if (applyBackup(importState.result)) {
      setImportState((s) => ({ ...s, open: false }));
      onDataChanged();
      toast.success("Backup imported. Your data has been restored.");
    } else {
      setImportState((s) => ({
        ...s,
        result: null,
        error: "Your browser wouldn't store the data (storage may be full or blocked). Your existing data was left untouched.",
      }));
    }
  };

  const confirmErase = () => {
    const ok = eraseAllData();
    setEraseOpen(false);
    onDataChanged();
    if (ok) toast.success("All data erased.");
    else toast.error("Some data couldn't be erased. Check your browser's storage settings.");
  };

  return (
    <>
      <header className="w-full bg-[#0d1b2a] border-b border-[#1b263b] px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={() => setMenuOpen((p) => !p)} aria-label="Open menu" aria-expanded={menuOpen} className={topBtn}>
            <Menu size={20} />
          </button>
          <span className="font-brand font-bold text-lg text-[#e0e1dd] tracking-widest uppercase truncate">Taláan</span>
        </div>

        <div className="flex items-center gap-1">
          {canInstall && (
            <button type="button" onClick={handleInstall} aria-label="Install app" className={topBtn}>
              <Download size={20} />
              <span className="hidden sm:inline font-ui text-xs uppercase tracking-widest">Install</span>
            </button>
          )}
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" className={topBtn}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings" subtitle="Manage your data and preferences" size="max-w-md">
        <ModalBody className="flex flex-col gap-2">
          {canInstall && (
            <>
              <button type="button" onClick={handleInstall} className={settingsBtn}>
                <Download size={16} className="text-[#8fa3bc]" aria-hidden="true" /> Install App
              </button>
              <div className="border-t border-[#415a77] my-1" />
            </>
          )}
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={handleFileChosen} aria-label="Choose a Taláan backup file" />
          <button type="button" onClick={() => fileInput.current?.click()} className={settingsBtn}>
            <Upload size={16} className="text-emerald-400" aria-hidden="true" /> Import Data
          </button>
          <button type="button" onClick={handleExport} className={settingsBtn}>
            <Download size={16} className="text-[#778da9]" aria-hidden="true" /> Export Data
          </button>
          <div className="border-t border-[#415a77] my-1" />
          <button type="button" onClick={() => { setSettingsOpen(false); setEraseOpen(true); }}
            className={`${settingsBtn} border-red-900/50 text-red-400 hover:bg-red-900/20 hover:border-red-500`}>
            <Trash2 size={16} aria-hidden="true" /> Erase All Data
          </button>
        </ModalBody>
        <ModalFooter className="flex justify-end">
          <button type="button" onClick={() => setSettingsOpen(false)} className={btnSecondary}>Close</button>
        </ModalFooter>
      </Modal>

      <ImportDialog
        open={importState.open}
        fileName={importState.fileName}
        result={importState.result}
        error={importState.error}
        onConfirm={confirmImport}
        onClose={() => setImportState((s) => ({ ...s, open: false }))}
      />
      <EraseDialog open={eraseOpen} onConfirm={confirmErase} onClose={() => setEraseOpen(false)} />

      {menuOpen && <div className="fixed inset-0 z-20 bg-black/40" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <aside
        aria-label="Main navigation"
        inert={!menuOpen}
        className={`fixed top-0 left-0 h-full z-30 bg-[#1b263b] w-[40vw] min-w-55 max-w-xs flex flex-col shadow-2xl transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="font-brand text-xs tracking-widest uppercase text-[#778da9]">Menu</span>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu"
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-[#778da9] hover:bg-[#415a77] hover:text-[#e0e1dd] transition-colors duration-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4 pt-4 px-6 pb-5 flex-wrap">
          <div className="h-16 w-16 sm:h-14 sm:w-14 rounded-full bg-[#415a77] border-2 border-[#778da9] flex items-center justify-center shrink-0 overflow-hidden">
            <span className="font-brand text-[#e0e1dd] text-lg font-semibold">NU</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-ui text-[#e0e1dd] font-semibold text-base truncate">NameUser</span>
            <span className="font-body text-[#778da9] text-sm truncate">@nameuser</span>
          </div>
        </div>

        <div className="mx-5 border-t border-[#415a77]" />

        <nav className="flex flex-col gap-2 px-4 pt-5" aria-label="Pages">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = page === id;
            return (
              <button key={id} type="button" onClick={() => go(id)} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-4 min-h-12 py-3 rounded-lg transition-colors duration-200 w-full text-left ${
                  active ?
                    "bg-[#415a77] text-[#e0e1dd] hover:bg-[#526b89]"
                  : "bg-transparent text-[#778da9] hover:bg-[#415a77] hover:text-[#e0e1dd]"
                }`}>
                <Icon size={18} className="shrink-0" aria-hidden="true" />
                <span className="font-ui text-sm font-medium truncate">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default NavBar;
