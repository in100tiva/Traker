import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Tiny floating "+N XP" indicator that pops near the click target whenever
 * a habit gets marked. The component listens for a custom `xp:burst` event
 * dispatched by callers — this keeps wiring loose (no prop drilling).
 *
 * Dispatch from anywhere:
 *   window.dispatchEvent(new CustomEvent("xp:burst", {
 *     detail: { amount: 12, x: 320, y: 540 }
 *   }));
 */

interface Burst {
  id: number;
  amount: number;
  x: number;
  y: number;
}

interface BurstDetail {
  amount: number;
  x?: number;
  y?: number;
  rarity?: "common" | "rare" | "epic";
  message?: string;
}

export function XpBurstHost() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    function handler(ev: Event) {
      const detail = (ev as CustomEvent<BurstDetail>).detail;
      if (!detail) return;
      const id = ++idRef.current;
      const burst: Burst = {
        id,
        amount: detail.amount,
        x: detail.x ?? window.innerWidth / 2,
        y: detail.y ?? window.innerHeight / 2,
      };
      setBursts((prev) => [...prev, burst]);
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 1100);
    }
    window.addEventListener("xp:burst", handler);
    return () => window.removeEventListener("xp:burst", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 0, scale: 0.7 }}
            animate={{ opacity: 1, y: -56, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.95 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute font-display font-bold tracking-tighter text-accent"
            style={{
              left: b.x,
              top: b.y,
              transform: "translate(-50%, -50%)",
              fontSize: 22,
              textShadow:
                "0 0 16px rgba(232,255,58,0.6), 0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            +{b.amount} XP
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Helper for callers — prevents typos and coerces missing position to
 * the centre of the viewport.
 */
export function fireXpBurst(amount: number, sourceEl?: Element | null) {
  if (typeof window === "undefined") return;
  let x: number | undefined;
  let y: number | undefined;
  if (sourceEl && "getBoundingClientRect" in sourceEl) {
    const r = (sourceEl as Element).getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  }
  window.dispatchEvent(
    new CustomEvent("xp:burst", {
      detail: { amount, x, y },
    }),
  );
}
