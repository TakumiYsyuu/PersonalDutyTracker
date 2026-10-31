import { useEffect, useRef, useState } from "react";

/** online: current connectivity. justReconnected: true for a few seconds after it returns. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [justReconnected, setJustReconnected] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const goOffline = () => {
      clearTimeout(timer.current);
      setJustReconnected(false);
      setOnline(false);
    };
    const goOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setJustReconnected(false), 4000);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearTimeout(timer.current);
    };
  }, []);

  return { online, justReconnected };
}
