import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HIcon } from "./icons/HIcon";
import { cn } from "@/lib/utils";
import type { HabitFormInput } from "./HabitForm";

/**
 * Three-screen adaptive onboarding (<= 60s to first habit check).
 *
 * 1. Goal — user picks a declared goal (saúde, foco, sono, etc.)
 * 2. Choose a starter habit — 5 BJ Fogg-tiny presets per goal
 * 3. First win — animation + confetti, returns to home with the habit
 *    pre-checked
 *
 * Endowed progress effect: progress bar starts at 35% on screen 1.
 * Progressive disclosure: each step reveals minimal info.
 */

interface Props {
  open: boolean;
  onSkip: () => void;
  onComplete: (input: {
    name: string;
    declaredGoal: GoalId;
    habit: HabitFormInput;
  }) => Promise<void>;
}

type GoalId =
  | "health"
  | "focus"
  | "sleep"
  | "calm"
  | "creativity"
  | "money";

const GOALS: Array<{
  id: GoalId;
  emoji: string;
  title: string;
  desc: string;
  color: string;
}> = [
  { id: "health", emoji: "💪", title: "Saúde", desc: "Corpo em movimento", color: "#22c55e" },
  { id: "focus", emoji: "🎯", title: "Foco", desc: "Mente afiada e produtiva", color: "#3b82f6" },
  { id: "sleep", emoji: "😴", title: "Dormir bem", desc: "Rotina noturna estável", color: "#6366f1" },
  { id: "calm", emoji: "🧘", title: "Calma", desc: "Menos ansiedade", color: "#a855f7" },
  { id: "creativity", emoji: "🎨", title: "Criativo", desc: "Praticar ofício", color: "#ec4899" },
  { id: "money", emoji: "💰", title: "Finanças", desc: "Constância nas economias", color: "#f59e0b" },
];

const PRESETS_BY_GOAL: Record<GoalId, HabitFormInput[]> = {
  health: [
    { name: "Caminhar 10 min", emoji: "👟", color: "#22c55e", targetPerWeek: 7 },
    { name: "Beber 2L de água", emoji: "💧", color: "#06b6d4", targetPerWeek: 7, targetPerDay: 8, unit: "copos" },
    { name: "5 flexões", emoji: "💪", color: "#10b981", targetPerWeek: 7, targetPerDay: 5, unit: "flexões" },
    { name: "Comer 1 fruta", emoji: "🍎", color: "#ef4444", targetPerWeek: 7 },
    { name: "Subir escadas", emoji: "🪜", color: "#84cc16", targetPerWeek: 5 },
  ],
  focus: [
    { name: "1 pomodoro de foco", emoji: "🍅", color: "#3b82f6", targetPerWeek: 5, targetPerDay: 25, unit: "min" },
    { name: "Sem celular nos 1ºs 30 min", emoji: "📵", color: "#6366f1", targetPerWeek: 5 },
    { name: "Listar 3 prioridades", emoji: "📝", color: "#0ea5e9", targetPerWeek: 5 },
    { name: "Pausa consciente 5 min", emoji: "☕", color: "#f59e0b", targetPerWeek: 5 },
    { name: "Inbox zero", emoji: "📥", color: "#06b6d4", targetPerWeek: 3 },
  ],
  sleep: [
    { name: "Sem tela 1h antes de dormir", emoji: "📱", color: "#6366f1", targetPerWeek: 7 },
    { name: "Dormir 7h+", emoji: "😴", color: "#3b82f6", targetPerWeek: 7 },
    { name: "Acordar mesmo horário", emoji: "⏰", color: "#a855f7", targetPerWeek: 7 },
    { name: "Caminhada matinal", emoji: "🌅", color: "#f59e0b", targetPerWeek: 5 },
    { name: "Chá da noite", emoji: "🍵", color: "#84cc16", targetPerWeek: 7 },
  ],
  calm: [
    { name: "Meditar 5 min", emoji: "🧘", color: "#a855f7", targetPerWeek: 7, targetPerDay: 5, unit: "min" },
    { name: "Respirar 4-7-8", emoji: "🌬️", color: "#06b6d4", targetPerWeek: 7 },
    { name: "Anotar 3 gratidões", emoji: "🙏", color: "#f59e0b", targetPerWeek: 7 },
    { name: "10 min ao ar livre", emoji: "🌳", color: "#22c55e", targetPerWeek: 5 },
    { name: "Dia sem redes sociais", emoji: "🚫", color: "#ef4444", targetPerWeek: 1, schedule: 0b0000001 },
  ],
  creativity: [
    { name: "10 min de arte", emoji: "🎨", color: "#ec4899", targetPerWeek: 5, targetPerDay: 10, unit: "min" },
    { name: "Tocar 15 min", emoji: "🎸", color: "#a855f7", targetPerWeek: 4, targetPerDay: 15, unit: "min" },
    { name: "Escrever 200 palavras", emoji: "✍️", color: "#3b82f6", targetPerWeek: 5, targetPerDay: 200, unit: "palavras" },
    { name: "1 foto por dia", emoji: "📸", color: "#06b6d4", targetPerWeek: 7 },
    { name: "Estudar referências 15 min", emoji: "📚", color: "#f59e0b", targetPerWeek: 4 },
  ],
  money: [
    { name: "Anotar gastos do dia", emoji: "💸", color: "#f59e0b", targetPerWeek: 7 },
    { name: "Não comprar por impulso", emoji: "🚫", color: "#ef4444", targetPerWeek: 7, isNegative: true },
    { name: "Estudar finanças 10 min", emoji: "📚", color: "#0ea5e9", targetPerWeek: 5 },
    { name: "Café em casa", emoji: "☕", color: "#6366f1", targetPerWeek: 5 },
    { name: "Conferir investimentos", emoji: "📈", color: "#22c55e", targetPerWeek: 1, schedule: 0b0100000 },
  ],
};

export function OnboardingFlow({ open, onSkip, onComplete }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [habit, setHabit] = useState<HabitFormInput | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Endowed progress: bar starts at 35% even on step 0
  const progressPct = useMemo(() => {
    if (step === 0) return 0.35;
    if (step === 1) return 0.65;
    return 1;
  }, [step]);

  const presets = goal ? PRESETS_BY_GOAL[goal] : [];

  function go(next: 0 | 1 | 2) {
    setStep(next);
  }

  async function handleFinish() {
    if (!habit || !goal) return;
    setSubmitting(true);
    await onComplete({
      name: name.trim() || "Você",
      declaredGoal: goal,
      habit,
    });
    // First win: confetti + brief delay
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#e8ff3a", "#22c55e", "#a3e635"],
    });
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onSkip()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-accent text-[rgb(10,10,10)]">
              <HIcon name="flame" size={14} strokeWidth={2.5} />
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight">
              Streaks
            </span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="font-mono text-[11px] uppercase tracking-wider text-ink-mute hover:text-ink"
          >
            Pular
          </button>
        </div>

        {/* Progress bar — endowed progress effect */}
        <div className="h-1 overflow-hidden bg-surface-3">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: "35%" }}
            animate={{ width: `${progressPct * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Step 0 — Welcome + name + goal */}
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5 p-6"
          >
            <div>
              <div className="font-display text-[28px] font-bold leading-tight tracking-tightest text-ink">
                Bora começar 🌱
              </div>
              <p className="mt-2 text-[14px] leading-[1.5] text-ink-dim">
                Em 60 segundos você vai criar e marcar seu primeiro hábito —
                sem complicação.
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                Como prefere ser chamado?
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                Qual área da sua vida você quer melhorar?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-md border p-3 text-left transition-all",
                      goal === g.id
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <span style={{ fontSize: 22 }}>{g.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-display text-[13px] font-semibold tracking-tighter text-ink">
                        {g.title}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-tight text-ink-dim">
                        {g.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!goal}
              onClick={() => go(1)}
            >
              Continuar
              <HIcon name="chevron-right" size={16} />
            </Button>
          </motion.div>
        )}

        {/* Step 1 — Pick a starter habit */}
        {step === 1 && goal && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5 p-6"
          >
            <div>
              <div className="font-display text-[24px] font-bold leading-tight tracking-tightest text-ink">
                Comece pequeno
              </div>
              <p className="mt-1 text-[13px] leading-[1.5] text-ink-dim">
                Escolha um — você pode crescer depois. A ideia é vencer hoje,
                não impressionar.
              </p>
            </div>

            <div className="space-y-2">
              {presets.map((preset, i) => {
                const isActive =
                  habit?.name === preset.name && habit?.emoji === preset.emoji;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setHabit(preset)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-all",
                      isActive
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-xl"
                      style={{
                        background: `${preset.color}26`,
                        border: `1px solid ${preset.color}55`,
                      }}
                    >
                      {preset.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-[14px] font-semibold tracking-tighter text-ink">
                        {preset.name}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-ink-dim">
                        {preset.targetPerWeek === 7
                          ? "Diário"
                          : `${preset.targetPerWeek}×/semana`}
                        {preset.unit ? ` · ${preset.targetPerDay} ${preset.unit}/dia` : ""}
                      </div>
                    </div>
                    {isActive && (
                      <HIcon name="check" size={18} color="rgb(var(--accent))" strokeWidth={2.5} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => go(0)}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!habit}
                onClick={() => go(2)}
                className="flex-[2]"
              >
                Quase lá
                <HIcon name="chevron-right" size={16} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2 — First win */}
        {step === 2 && habit && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5 p-6"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 240 }}
                className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-4xl"
                style={{
                  background: `${habit.color}26`,
                  border: `2px solid ${habit.color}`,
                }}
              >
                {habit.emoji}
              </motion.div>
              <div className="mt-4 font-display text-[22px] font-bold leading-tight tracking-tightest text-ink">
                Pronto pra primeira vitória?
              </div>
              <p className="mt-2 text-[14px] leading-[1.5] text-ink-dim">
                Seu hábito {habit.name.toLowerCase()} já está no app. Marque
                como feito agora — vai entrar no embalo.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={submitting}
              onClick={handleFinish}
            >
              <HIcon name="check" size={18} strokeWidth={2.5} />
              {submitting ? "Indo…" : "Marcar agora"}
            </Button>
            <p className="text-center font-mono text-[10px] uppercase tracking-wider text-ink-mute">
              +25 XP de boas-vindas
            </p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
