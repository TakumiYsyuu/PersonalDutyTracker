import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, WifiOff, Wifi } from "lucide-react";
import { useToast } from "./toastContext.js";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";

const HOUR = 60 * 60 * 1000;

/** Offline indicator + "update ready" banner. Rendered right under the navbar. */
export default function PwaStatus() {
  const toast = useToast();
  const { online, justReconnected } = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [blockedNote, setBlockedNote] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update().catch(() => {}), HOUR);
    },
    onOfflineReady() {
      toast.info("Taláan is ready to open offline.");
    },
    onRegisterError(error) {
      console.error("Service worker registration failed:", error);
    },
  });

  const applyUpdate = async () => {
    // Reloading would throw away anything typed into an open form.
    if (document.querySelector("dialog[open]")) {
      setBlockedNote(true);
      return;
    }
    setBusy(true);
    await updateServiceWorker(true);
  };

  return (
    <>
      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-900/30 border-b border-amber-500/40 px-4 py-2 text-center">
          <WifiOff size={16} className="text-amber-400 shrink-0" aria-hidden="true" />
          <p className="font-body text-xs sm:text-sm text-amber-300">
            You're offline. Your saved duties and goals are still here, and changes are stored on this device.
          </p>
        </div>
      )}
      {online && justReconnected && (
        <div role="status" className="flex items-center justify-center gap-2 bg-emerald-900/20 border-b border-emerald-500/40 px-4 py-2">
          <Wifi size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <p className="font-body text-xs sm:text-sm text-emerald-300">Back online.</p>
        </div>
      )}
      {needRefresh && !dismissed && (
        <div role="status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-[#1b263b] border-b border-[#415a77] px-4 py-2">
          <p className="font-body text-xs sm:text-sm text-[#e0e1dd]">
            {blockedNote ? "Close the open window first, then tap Update now." : "A new version of Taláan is ready."}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={applyUpdate} disabled={busy}
              className="font-ui inline-flex items-center gap-2 min-h-11 px-4 rounded-lg bg-[#415a77] hover:bg-[#526b89] text-xs font-semibold uppercase tracking-widest text-[#e0e1dd] transition-colors duration-200 disabled:opacity-50">
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} aria-hidden="true" />
              {busy ? "Updating…" : "Update now"}
            </button>
            <button type="button" onClick={() => setDismissed(true)}
              className="font-ui min-h-11 px-3 rounded-lg text-xs uppercase tracking-widest text-[#778da9] hover:text-[#e0e1dd] transition-colors duration-200">
              Later
            </button>
          </div>
        </div>
      )}
    </>
  );
}
