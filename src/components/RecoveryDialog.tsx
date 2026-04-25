import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HIcon } from "./icons/HIcon";
import { IconTile } from "./IconTile";
import { cn } from "@/lib/utils";
import type { Habit } from "@/db/schema";

/**
 * RecoveryDialog — shown when we detect a real streak break (yesterday was
 * a scheduled day and the user missed it, AND the previous streak was ≥3).
 *
 * The tone is empathetic, not punitive. The user sees:
 *  - the avatar of the broken habit + the streak it lost
 *  - "A vida acontece 💜" line (variant: streak_break_copy flag)
 *  - a primary "Usar proteção" CTA (if a freeze is available) which
 *    restores the streak, or
 *  - a soft "Recomeçar sem culpa" CTA which closes the dialog
 *
 * Social proof line cites a reassuring stat to ease churn pressure.
 */

interface Props {
  open: boolean;
  habit: Habit;
  brokenStreak: number;
  freezesRemaining: number;
  /** Variant from feature flag streak_break_copy */
  variant?: "empathetic" | "direct";
  onUseFreeze: () => Promise<void> | void;
  onResetWithoutGuilt: () => void;
  onClose: () => void;
}

export function RecoveryDialog({
  open,
  habit,
  brokenStreak,
  freezesRemaining,
  variant = "empathetic",
  onUseFreeze,
  onResetWithoutGuilt,
  onClose,
}: Props) {
  const canFreeze = freezesRemaining > 0;
  const empathic = variant === "empathetic";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220 }}
              className="grid h-12 w-12 place-items-center rounded-xl"
              style={{
                background: "rgba(168, 85, 247, 0.15)",
                border: "1.5px solid rgba(168, 85, 247, 0.4)",
              }}
            >
              <span className="text-[24px]">💜</span>
            </motion.div>
            <div>
              <DialogTitle className="font-display text-[18px] tracking-tighter">
                {empathic ? "A vida acontece" : "Sequência quebrada"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[12px]">
                {empathic
                  ? "Tudo bem perder um dia. O que importa é não desistir do segundo."
                  : "Você não marcou ontem — a sequência foi interrompida."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Habit summary */}
        <div className="flex items-center gap-3 rounded-md border border-border bg-bg p-3.5">
          <IconTile
            emoji={habit.emoji}
            iconName={habit.emoji ? undefined : "check"}
            size={44}
            bg={`${habit.color}26`}
          />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[15px] font-semibold tracking-tighter text-ink">
              {habit.name}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-ink-dim">
              Sequência interrompida em{" "}
              <span className="font-semibold text-ink">
                {brokenStreak} dia{brokenStreak === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        {/* Choices */}
        <div className="space-y-2">
          {canFreeze && (
            <button
              type="button"
              onClick={onUseFreeze}
              className={cn(
                "group flex w-full items-start gap-3 rounded-md border p-4 text-left transition-all",
                "border-info/40 bg-info/5 hover:border-info hover:bg-info/10",
              )}
            >
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-info"
                style={{ background: "rgba(125, 211, 252, 0.12)" }}
              >
                <HIcon name="sparkles" size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[14px] font-semibold text-ink">
                  Usar proteção de sequência
                </div>
                <div className="mt-0.5 text-[12px] leading-[1.4] text-ink-dim">
                  Restaura o streak de {brokenStreak} dias. Você tem{" "}
                  {freezesRemaining} {freezesRemaining === 1 ? "proteção" : "proteções"} este mês.
                </div>
              </div>
              <HIcon
                name="chevron-right"
                size={14}
                color="rgb(125, 211, 252)"
              />
            </button>
          )}

          <button
            type="button"
            onClick={onResetWithoutGuilt}
            className={cn(
              "flex w-full items-start gap-3 rounded-md border border-border bg-surface p-4 text-left transition-all hover:border-border-strong",
            )}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-2 text-ink">
              <HIcon name="check" size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[14px] font-semibold text-ink">
                Recomeçar sem culpa
              </div>
              <div className="mt-0.5 text-[12px] leading-[1.4] text-ink-dim">
                {empathic
                  ? "Marca hoje e a sequência reinicia em 1. Toda hora é hora de recomeçar."
                  : "Fechar e marcar hoje normalmente."}
              </div>
            </div>
            <HIcon name="chevron-right" size={14} color="rgb(var(--text-mute))" />
          </button>
        </div>

        {/* Social proof — only when empathetic */}
        {empathic && (
          <div className="rounded-md border border-dashed border-border bg-surface/40 px-3.5 py-2.5 text-center">
            <p className="text-[11.5px] leading-[1.4] text-ink-dim">
              <span className="font-semibold text-ink">92%</span> das pessoas
              que voltam em até 48h chegam mais longe que quem nunca quebrou.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
