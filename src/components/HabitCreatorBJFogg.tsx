import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HIcon } from "./icons/HIcon";
import { HabitGlyph } from "./HabitGlyph";
import { cn } from "@/lib/utils";
import type { HabitFormInput } from "./HabitForm";

/**
 * Habit creator following the BJ Fogg model — 3 guided steps:
 *
 * 1. Gatilho (Anchor)  — when does this happen? "Depois de tomar café"
 * 2. Ação mínima (Tiny) — the absolute smallest version: "1 flexão"
 * 3. Recompensa (Reward) — celebrate immediately: "dancinha 🎉"
 *
 * Live preview composes a sentence: "Depois de X, eu vou Y, e depois Z".
 *
 * Returns a HabitFormInput on submit (so the existing create() pipeline
 * can persist it). triggerType/triggerValue is also populated for habit
 * stacking on the schema side.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing habits — used to power the "after habit X" anchor option. */
  anchorOptions?: { id: string; name: string; emoji?: string | null }[];
  onCreate: (
    input: HabitFormInput & {
      triggerType: TriggerType;
      triggerValue: TriggerValue;
    },
  ) => Promise<void>;
}

export type TriggerType = "after_habit" | "time" | "place" | "free";

export interface TriggerValue {
  habitId?: string;
  hour?: number;
  minute?: number;
  place?: string;
  description?: string;
}

const ANCHOR_TEMPLATES: Array<{
  id: string;
  emoji: string;
  description: string;
  triggerType: TriggerType;
  triggerValue: TriggerValue;
}> = [
  {
    id: "after-coffee",
    emoji: "☕",
    description: "depois do meu café",
    triggerType: "free",
    triggerValue: { description: "Depois do café" },
  },
  {
    id: "after-brush",
    emoji: "🦷",
    description: "depois de escovar os dentes",
    triggerType: "free",
    triggerValue: { description: "Depois de escovar os dentes" },
  },
  {
    id: "morning",
    emoji: "🌅",
    description: "ao acordar (7:00)",
    triggerType: "time",
    triggerValue: { hour: 7, minute: 0 },
  },
  {
    id: "lunch",
    emoji: "🍽️",
    description: "na hora do almoço (12:30)",
    triggerType: "time",
    triggerValue: { hour: 12, minute: 30 },
  },
  {
    id: "evening",
    emoji: "🌙",
    description: "antes de dormir (22:00)",
    triggerType: "time",
    triggerValue: { hour: 22, minute: 0 },
  },
];

const REWARDS = [
  "dancinha 🎉",
  "alongar 🙆",
  "dizer pra mim mesmo 'foi'",
  "respirar fundo 😌",
  "café gostoso ☕",
  "cinco minutos de música 🎵",
];

export function HabitCreatorBJFogg({
  open,
  onOpenChange,
  anchorOptions = [],
  onCreate,
}: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [anchorTemplate, setAnchorTemplate] =
    useState<(typeof ANCHOR_TEMPLATES)[number] | null>(null);
  const [anchorHabitId, setAnchorHabitId] = useState<string | null>(null);
  const [tinyAction, setTinyAction] = useState("");
  const [emoji, setEmoji] = useState("✅");
  const [reward, setReward] = useState(REWARDS[0]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep(0);
    setAnchorTemplate(null);
    setAnchorHabitId(null);
    setTinyAction("");
    setEmoji("✅");
    setReward(REWARDS[0]);
  }

  function handleClose(open: boolean) {
    if (!open) {
      reset();
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  }

  // Compose preview "Depois de X, eu vou Y, e depois Z."
  const anchorText =
    anchorHabitId && anchorOptions.length
      ? `depois de ${anchorOptions.find((a) => a.id === anchorHabitId)?.name.toLowerCase()}`
      : anchorTemplate?.description;

  const previewLine = anchorText
    ? `Depois de ${anchorText.replace(/^depois de /i, "").replace(/^do /i, "do ").replace(/^da /i, "da ")}, eu vou ${tinyAction || "_____"}, e depois ${reward}.`
    : `Eu vou ${tinyAction || "_____"}, e depois ${reward}.`;

  const canFinish = anchorText && tinyAction.trim().length > 0;

  async function handleSubmit() {
    if (!canFinish) return;
    setSubmitting(true);

    let triggerType: TriggerType = "free";
    let triggerValue: TriggerValue = { description: anchorText ?? "" };

    if (anchorHabitId) {
      triggerType = "after_habit";
      triggerValue = {
        habitId: anchorHabitId,
        description: anchorText ?? "",
      };
    } else if (anchorTemplate) {
      triggerType = anchorTemplate.triggerType;
      triggerValue = anchorTemplate.triggerValue;
    }

    await onCreate({
      name: tinyAction.trim(),
      emoji,
      color: "#22c55e",
      targetPerWeek: 7,
      triggerType,
      triggerValue,
    });
    setSubmitting(false);
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hábito guiado</DialogTitle>
          <DialogDescription>
            Use o método BJ Fogg: gatilho + ação mínima + recompensa imediata.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-pill transition-colors",
                i <= step ? "bg-accent" : "bg-surface-3",
              )}
            />
          ))}
        </div>

        {/* Live preview — always visible */}
        <div className="rounded-md border border-border bg-bg p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
            Preview
          </div>
          <motion.div
            key={previewLine}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="mt-1.5 font-display text-[15px] leading-snug text-ink"
          >
            {previewLine}
          </motion.div>
        </div>

        {/* Step 0 — Anchor */}
        {step === 0 && (
          <div className="space-y-3">
            <div>
              <Label className="font-mono text-[11px] uppercase tracking-wider text-ink-mute">
                Quando? (escolha um gatilho)
              </Label>
            </div>
            {anchorOptions.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                  Encadear com hábito existente
                </div>
                {anchorOptions.slice(0, 4).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setAnchorHabitId(h.id);
                      setAnchorTemplate(null);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-all",
                      anchorHabitId === h.id
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <HabitGlyph emoji={h.emoji} size={20} />
                    <div className="text-[13px] text-ink">
                      <span className="text-ink-dim">depois de </span>
                      <span className="font-semibold">
                        {h.name.toLowerCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                Gatilhos comuns
              </div>
              {ANCHOR_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setAnchorTemplate(t);
                    setAnchorHabitId(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-all",
                    anchorTemplate?.id === t.id
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <span style={{ fontSize: 20 }}>{t.emoji}</span>
                  <span className="text-[13px] text-ink-dim">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={!anchorTemplate && !anchorHabitId}
              onClick={() => setStep(1)}
            >
              Próximo
              <HIcon name="chevron-right" size={14} />
            </Button>
          </div>
        )}

        {/* Step 1 — Tiny action */}
        {step === 1 && (
          <div className="space-y-3">
            <Label className="font-mono text-[11px] uppercase tracking-wider text-ink-mute">
              O que? (a menor ação possível)
            </Label>
            <Input
              value={tinyAction}
              onChange={(e) => setTinyAction(e.target.value)}
              placeholder="Ex: 1 flexão · 1 página · 5 respirações"
              autoFocus
            />
            <div className="rounded-md border border-dashed border-border bg-bg/50 p-3 text-[12px] leading-[1.5] text-ink-dim">
              <strong className="font-semibold text-ink">Regra de ouro:</strong>{" "}
              tão pequeno que você consegue fazer mesmo nos piores dias. Subir
              só depois que virar automático.
            </div>

            <div>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                Emoji
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "✅",
                  "💪",
                  "📚",
                  "🧘",
                  "💧",
                  "🏃",
                  "🍎",
                  "🎯",
                  "✍️",
                  "🌅",
                  "🌙",
                  "🎵",
                ].map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-md text-lg transition-all",
                      emoji === e
                        ? "bg-accent-soft ring-2 ring-accent"
                        : "bg-surface-2 hover:bg-surface-3",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="md" onClick={() => setStep(0)}>
                Voltar
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                disabled={tinyAction.trim().length === 0}
                onClick={() => setStep(2)}
              >
                Próximo
                <HIcon name="chevron-right" size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Reward */}
        {step === 2 && (
          <div className="space-y-3">
            <Label className="font-mono text-[11px] uppercase tracking-wider text-ink-mute">
              E depois? (recompensa imediata)
            </Label>
            <p className="text-[12px] leading-[1.5] text-ink-dim">
              Logo após a ação mínima, faça uma celebração curta. Isso ensina
              o cérebro que esse comportamento é bom.
            </p>
            <div className="space-y-1.5">
              {REWARDS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReward(r)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border p-2.5 text-left transition-all",
                    reward === r
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  <span className="text-[13px] text-ink">{r}</span>
                  {reward === r && (
                    <HIcon
                      name="check"
                      size={14}
                      color="rgb(var(--accent))"
                      strokeWidth={2.5}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                disabled={!canFinish || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Criando…" : "Criar hábito"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border pt-3" />
      </DialogContent>
    </Dialog>
  );
}
