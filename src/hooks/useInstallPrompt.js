import { useSyncExternalStore } from "react";

// The browser may fire `beforeinstallprompt` before React mounts, so the
// listener lives at module level and components subscribe to it.
let deferredPrompt = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

if (typeof window !== "undefined") {
  installed = isStandalone();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // we show our own button instead of the mini-infobar
    deferredPrompt = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getCanInstall = () => deferredPrompt !== null && !installed;

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribe, getCanInstall, () => false);

  const install = async () => {
    if (!deferredPrompt) return null;
    const prompt = deferredPrompt;
    prompt.prompt();
    const choice = await prompt.userChoice; // a prompt can only be used once
    deferredPrompt = null;
    notify();
    return choice.outcome;
  };

  return { canInstall, install };
}
