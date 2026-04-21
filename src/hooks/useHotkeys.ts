import { useEffect } from "react";

export interface Hotkey {
  key: string; // "n", " ", "?", "ArrowLeft", etc.
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  description: string;
  handler: (e: KeyboardEvent) => void;
}

function isTypingContext(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useHotkeys(hotkeys: Hotkey[]) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (isTypingContext(e.target)) return;
      for (const h of hotkeys) {
        if (e.key.toLowerCase() !== h.key.toLowerCase()) continue;
        if (!!h.ctrl !== e.ctrlKey) continue;
        if (!!h.meta !== e.metaKey) continue;
        if (!!h.shift !== e.shiftKey) continue;
        e.preventDefault();
        h.handler(e);
        return;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hotkeys]);
}
