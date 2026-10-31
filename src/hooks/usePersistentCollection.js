import { useCallback, useRef, useState } from "react";
import { useToast } from "../components/toastContext.js";

/**
 * Holds a list that mirrors a LocalStorage key.
 * `commit` takes an updater (current list -> next list), updates state, and
 * saves. State is always updated so the app keeps working even if the browser
 * refuses to store data; in that case the user is told clearly.
 */
export function usePersistentCollection(load, save, label) {
  const toast = useToast();
  const [items, setItems] = useState(load);
  const latest = useRef(items);

  const commit = useCallback(
    (updater) => {
      const next = updater(latest.current);
      latest.current = next;
      setItems(next);
      const saved = save(next);
      if (!saved) {
        toast.error(`Couldn't save your ${label} to this device. Export a backup so nothing is lost.`);
      }
      return saved;
    },
    [save, label, toast],
  );

  return [items, commit];
}
