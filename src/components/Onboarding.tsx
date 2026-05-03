import { useState } from "react";
import { HIcon } from "./icons/HIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { HabitFormInput } from "./HabitForm";

// Bitmask helpers for clarity in the preset table
// bit 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const EVERY_DAY = 0b1111111; // 127
const WEEKDAYS = 0b0111110; // 62 — Mon..Fri
const MON_WED_FRI = 0b0101010; // 42 — academia/quintal clássico
const SUN = 0b0000001; // 1 — só domingo (faxina)

const PRESETS: (HabitFormInput & { id: string; emoji: string })[] = [
  {
    id: "read",
    emoji: "📚",
    name: "Ler 20 páginas",
    color: "#a855f7",
    targetPerWeek: 7,
    targetPerDay: 20,
    unit: "páginas",
    schedule: EVERY_DAY,
  },
  {
    id: "meditate",
    emoji: "🧘",
    name: "Meditar 10 minutos",
    color: "#3b82f6",
    targetPerWeek: 7,
    targetPerDay: 10,
    unit: "min",
    schedule: EVERY_DAY,
  },
  {
    id: "gym",
    emoji: "🏋️",
    name: "Academia (seg/qua/sex)",
    color: "#ef4444",
    targetPerWeek: 3,
    schedule: MON_WED_FRI,
  },
  {
    id: "water",
    emoji: "💧",
    name: "Beber 2L de água",
    color: "#06b6d4",
    targetPerWeek: 7,
    targetPerDay: 8,
    unit: "copos",
    schedule: EVERY_DAY,
  },
  {
    id: "yard",
    emoji: "🌿",
    name: "Limpar o quintal (domingo)",
    color: "#84cc16",
    targetPerWeek: 1,
    schedule: SUN,
  },
  {
    id: "room",
    emoji: "🧹",
    name: "Arrumar o quarto",
    color: "#f59e0b",
    targetPerWeek: 1,
    schedule: SUN,
  },
  {
    id: "journal",
    emoji: "📝",
    name: "Jornalzinho (dias úteis)",
    color: "#f59e0b",
    targetPerWeek: 5,
    schedule: WEEKDAYS,
  },
  {
    id: "sleep",
    emoji: "😴",
    name: "Dormir 8h",
    color: "#6366f1",
    targetPerWeek: 7,
    schedule: EVERY_DAY,
  },
];

interface Props {
  open: boolean;
  onCreate: (inputs: HabitFormInput[]) => Promise<void>;
  onSkip: () => void;
}

export function Onboarding({ open, onCreate, onSkip }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    setSubmitting(true);
    const inputs = PRESETS.filter((p) => selected.has(p.id)).map((p) => {
      const { id: _id, emoji: _emoji, ...rest } = p;
      return rest;
    });
    await onCreate(inputs);
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onSkip()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HIcon name="sparkles" size={20} className="text-primary" />
            Bem-vindo ao Traker
          </DialogTitle>
          <DialogDescription>
            Escolha alguns hábitos para começar — ou pule e crie os seus.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {PRESETS.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors hover:bg-accent",
                  isSelected && "border-primary bg-primary/10",
                )}
              >
                <span className="text-2xl" aria-hidden="true">
                  {p.emoji}
                </span>
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {p.targetPerWeek === 7
                    ? "Todo dia"
                    : `${p.targetPerWeek}×/semana`}
                </span>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onSkip} disabled={submitting}>
            Pular
          </Button>
          <Button
            onClick={handleCreate}
            disabled={submitting || selected.size === 0}
          >
            Criar {selected.size > 0 ? `${selected.size} ` : ""}
            {selected.size === 1 ? "hábito" : "hábitos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
