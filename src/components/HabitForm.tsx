import { useEffect, useMemo, useState } from "react";
import { HIcon, type IconName } from "./icons/HIcon";
import { ICON_GLYPH_PREFIX, parseGlyph } from "./IconTile";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import type { Habit } from "@/db/schema";
import {
  ALL_DAYS_SCHEDULE,
  countScheduledDays,
  isScheduledOnDow,
  scheduleLabel,
  toggleDowInSchedule,
  WEEKDAY_LETTER_LABELS,
  WEEKDAY_SHORT_LABELS,
} from "@/lib/schedule";

const COLORS = [
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f59e0b",
  "#eab308",
  "#84cc16",
];

/**
 * Curated icon choices for the habit picker. Each entry is an HIcon name —
 * stored in the habit's `emoji` field as `i:<name>` (see `parseGlyph`).
 * The set is deliberately tight (24 options) to feel curated and avoid
 * decision fatigue.
 */
const HABIT_ICON_OPTIONS: IconName[] = [
  "drop", "lotus", "shoe", "book",
  "music", "laptop", "flame", "sun",
  "moon", "sparkles", "target", "trophy",
  "medal", "bell", "home", "chart",
  "calendar", "lightbulb", "pencil", "check",
  "user", "compass", "image", "note",
];

export interface HabitFormInput {
  name: string;
  description?: string | null;
  emoji?: string | null;
  color?: string;
  targetPerWeek?: number;
  targetPerDay?: number | null;
  unit?: string | null;
  isNegative?: boolean;
  tag?: string | null;
  schedule?: number;
  triggerType?: string | null;
  triggerValue?: unknown;
}

interface Props {
  onCreate: (input: HabitFormInput) => Promise<{ id: string } | null>;
  onUpdate?: (id: string, patch: HabitFormInput) => Promise<void>;
  editing?: Habit | null;
  existingTags?: string[];
  onCreated?: (id: string) => void;
  onCloseEdit?: () => void;
}

type GoalMode = "flexible" | "scheduled";

export function HabitForm({
  onCreate,
  onUpdate,
  editing,
  existingTags = [],
  onCreated,
  onCloseEdit,
}: Props) {
  const { isCreateOpen, closeCreate } = useUIStore();
  const isEdit = Boolean(editing);
  const open = isCreateOpen || isEdit;

  const [tab, setTab] = useState<"basics" | "goal" | "look">("basics");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [targetPerWeek, setTargetPerWeek] = useState(7);
  const [targetPerDay, setTargetPerDay] = useState<number | "">("");
  const [unit, setUnit] = useState("");
  const [isNegative, setIsNegative] = useState(false);
  const [tag, setTag] = useState("");
  const [goalMode, setGoalMode] = useState<GoalMode>("flexible");
  const [schedule, setSchedule] = useState<number>(ALL_DAYS_SCHEDULE);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setEmoji(editing.emoji ?? null);
      setColor(editing.color);
      setTargetPerWeek(editing.targetPerWeek);
      setTargetPerDay(editing.targetPerDay ?? "");
      setUnit(editing.unit ?? "");
      setIsNegative(editing.isNegative);
      setTag(editing.tag ?? "");
      const sch = editing.schedule ?? ALL_DAYS_SCHEDULE;
      setSchedule(sch);
      setGoalMode(sch === ALL_DAYS_SCHEDULE ? "flexible" : "scheduled");
      setTab("basics");
    } else if (!isCreateOpen) {
      setName("");
      setDescription("");
      setEmoji(null);
      setColor(COLORS[0]);
      setTargetPerWeek(7);
      setTargetPerDay("");
      setUnit("");
      setIsNegative(false);
      setTag("");
      setSchedule(ALL_DAYS_SCHEDULE);
      setGoalMode("flexible");
      setTouched(false);
      setTab("basics");
    }
  }, [editing, isCreateOpen]);

  const nameError = touched && name.trim().length === 0;
  const scheduledCount = countScheduledDays(schedule);
  const scheduleError =
    goalMode === "scheduled" && scheduledCount === 0;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) return;
    if (isEdit) onCloseEdit?.();
    else closeCreate();
  }

  function handleSetMode(mode: GoalMode) {
    setGoalMode(mode);
    if (mode === "flexible") {
      setSchedule(ALL_DAYS_SCHEDULE);
    } else {
      // Preserve current schedule if not all-days; otherwise start with weekdays
      if (schedule === ALL_DAYS_SCHEDULE) {
        setSchedule(0b0111110); // weekdays default for new scheduled habits
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || scheduleError) return;
    setSubmitting(true);

    const finalSchedule =
      goalMode === "flexible" ? ALL_DAYS_SCHEDULE : schedule;
    const finalTargetPerWeek =
      goalMode === "scheduled" ? scheduledCount : targetPerWeek;

    const input: HabitFormInput = {
      name: name.trim(),
      description: description.trim() || null,
      emoji,
      color,
      targetPerWeek: finalTargetPerWeek,
      targetPerDay: targetPerDay === "" ? null : Number(targetPerDay),
      unit: unit.trim() || null,
      isNegative,
      tag: tag.trim() || null,
      schedule: finalSchedule,
    };

    if (editing && onUpdate) {
      await onUpdate(editing.id, input);
      onCloseEdit?.();
    } else {
      const row = await onCreate(input);
      closeCreate();
      if (row) onCreated?.(row.id);
    }
    setSubmitting(false);
  }

  const tagSuggestions = useMemo(
    () =>
      existingTags
        .filter((t) => t && t.toLowerCase().includes(tag.trim().toLowerCase()))
        .slice(0, 5),
    [existingTags, tag],
  );

  const previewTargetPerWeek =
    goalMode === "scheduled" ? scheduledCount : targetPerWeek;
  const previewScheduleLabel =
    goalMode === "scheduled" ? scheduleLabel(schedule) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar hábito" : "Novo hábito"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste as propriedades do hábito."
              : "Defina um hábito para acompanhar regularmente."}
          </DialogDescription>
        </DialogHeader>

        {/* Live preview */}
        <div
          className="flex items-center gap-3 rounded-lg border p-3"
          style={{
            backgroundImage: `linear-gradient(90deg, ${color}14, transparent 50%)`,
          }}
        >
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xl"
            style={{
              backgroundColor: `${color}22`,
              border: `1.5px solid ${color}`,
            }}
          >
            {emoji ?? (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="truncate font-display text-sm font-semibold">
              {name.trim() || "Nome do hábito"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {previewScheduleLabel ?? `${previewTargetPerWeek}×/semana`}
              {targetPerDay !== "" &&
                ` · ${targetPerDay} ${unit || "un"}/dia`}
              {tag && ` · #${tag}`}
              {isNegative && " · abstinência"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basics">Básico</TabsTrigger>
              <TabsTrigger value="goal">Meta</TabsTrigger>
              <TabsTrigger value="look">Visual</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder={
                    isNegative ? "Não beber refrigerante" : "Ler 30 minutos"
                  }
                  autoFocus
                  required
                  aria-invalid={nameError}
                  className={cn(
                    nameError && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {nameError && (
                  <p className="text-xs text-destructive">
                    O nome é obrigatório.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Antes de dormir"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="negative" className="text-sm font-medium">
                    Hábito negativo
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Marque os dias em que conseguiu evitar.
                  </p>
                </div>
                <Switch
                  id="negative"
                  checked={isNegative}
                  onCheckedChange={setIsNegative}
                />
              </div>
            </TabsContent>

            <TabsContent value="goal" className="space-y-4">
              {/* Mode selector: flexible vs scheduled */}
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => handleSetMode("flexible")}
                  className={cn(
                    "rounded-md px-3 py-2 text-xs font-medium transition-colors",
                    goalMode === "flexible"
                      ? "bg-card text-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Qualquer dia
                </button>
                <button
                  type="button"
                  onClick={() => handleSetMode("scheduled")}
                  className={cn(
                    "rounded-md px-3 py-2 text-xs font-medium transition-colors",
                    goalMode === "scheduled"
                      ? "bg-card text-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Dias específicos
                </button>
              </div>

              {goalMode === "flexible" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="target">Dias por semana</Label>
                  <Input
                    id="target"
                    type="number"
                    min={1}
                    max={7}
                    value={targetPerWeek}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v))
                        setTargetPerWeek(Math.max(1, Math.min(7, v)));
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {targetPerWeek === 7
                      ? "Diário — todo dia da semana"
                      : `${targetPerWeek}×/semana — pode ser qualquer dia`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Escolha os dias</Label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_LETTER_LABELS.map((letter, dow) => {
                      const on = isScheduledOnDow(schedule, dow);
                      return (
                        <button
                          key={dow}
                          type="button"
                          onClick={() =>
                            setSchedule((s) => toggleDowInSchedule(s, dow))
                          }
                          aria-label={WEEKDAY_SHORT_LABELS[dow]}
                          aria-pressed={on}
                          title={WEEKDAY_SHORT_LABELS[dow]}
                          className={cn(
                            "grid h-10 place-items-center rounded-md border text-sm font-semibold transition-all",
                            on
                              ? "border-primary bg-primary text-primary-foreground shadow-card"
                              : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                          )}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                  <p
                    className={cn(
                      "text-[10px]",
                      scheduleError
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {scheduleError
                      ? "Selecione pelo menos um dia"
                      : scheduledCount === 7
                        ? "Igual a 'Qualquer dia' — todo dia da semana"
                        : `${scheduledCount}× / semana · ${scheduleLabel(schedule)}`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tpd">Alvo diário</Label>
                  <Input
                    id="tpd"
                    type="number"
                    min={1}
                    value={targetPerDay}
                    onChange={(e) =>
                      setTargetPerDay(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="opcional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="páginas, km…"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tag">Tag (opcional)</Label>
                <Input
                  id="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="saúde"
                />
                {tagSuggestions.length > 0 && tag && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {tagSuggestions.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTag(t)}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] hover:bg-accent"
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="look" className="space-y-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {(() => {
                        const parsed = parseGlyph(emoji);
                        if (parsed?.kind === "icon") {
                          return <HIcon name={parsed.name} size={18} />;
                        }
                        if (parsed?.kind === "emoji") {
                          return <span className="text-lg">{parsed.value}</span>;
                        }
                        return <HIcon name="sparkles" size={16} />;
                      })()}
                      {emoji ? "Trocar" : "Escolher"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium">
                        Escolha um ícone
                      </span>
                      {emoji && (
                        <button
                          type="button"
                          onClick={() => setEmoji(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {HABIT_ICON_OPTIONS.map((iconName) => {
                        const tokenValue = `${ICON_GLYPH_PREFIX}${iconName}`;
                        const selected = emoji === tokenValue;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setEmoji(tokenValue)}
                            aria-label={iconName}
                            className={cn(
                              "grid h-10 w-10 place-items-center rounded-md transition-colors hover:bg-accent",
                              selected
                                ? "bg-primary/20 text-primary ring-2 ring-primary"
                                : "text-foreground/80",
                            )}
                          >
                            <HIcon name={iconName} size={18} />
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Cor ${c}`}
                      onClick={() => setColor(c)}
                      className="relative grid h-9 w-full place-items-center rounded-lg transition-transform hover:scale-105"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && (
                        <HIcon name="check" size={16} strokeWidth={3} className="text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !name.trim() || scheduleError}
            >
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
