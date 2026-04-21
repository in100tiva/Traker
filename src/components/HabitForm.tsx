import { useEffect, useMemo, useState } from "react";
import { Check, Smile } from "lucide-react";
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

const EMOJIS = [
  "📚", "✍️", "🎨", "🎵", "🎸",
  "🧘", "🏃", "💪", "🚴", "🏊",
  "💧", "🥗", "🍎", "☕", "🍵",
  "😴", "🧠", "💊", "🦷", "🧴",
  "💼", "💻", "📱", "📝", "📊",
  "💰", "🎯", "⏰", "📅", "✅",
  "🌱", "🌞", "🌙", "⭐", "🔥",
  "❤️", "😊", "🙏", "✨", "🎉",
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
}

interface Props {
  onCreate: (input: HabitFormInput) => Promise<{ id: string } | null>;
  onUpdate?: (id: string, patch: HabitFormInput) => Promise<void>;
  editing?: Habit | null;
  existingTags?: string[];
  onCreated?: (id: string) => void;
  onCloseEdit?: () => void;
}

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
      setTouched(false);
      setTab("basics");
    }
  }, [editing, isCreateOpen]);

  const nameError = touched && name.trim().length === 0;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) return;
    if (isEdit) onCloseEdit?.();
    else closeCreate();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    setSubmitting(true);
    const input: HabitFormInput = {
      name: name.trim(),
      description: description.trim() || null,
      emoji,
      color,
      targetPerWeek,
      targetPerDay: targetPerDay === "" ? null : Number(targetPerDay),
      unit: unit.trim() || null,
      isNegative,
      tag: tag.trim() || null,
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
              {targetPerWeek}×/semana
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
                  className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
                />
                {nameError && (
                  <p className="text-xs text-destructive">O nome é obrigatório.</p>
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
              <div className="grid grid-cols-2 gap-3">
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
                    {targetPerWeek === 7 ? "Diário" : `${targetPerWeek}× / semana`}
                  </p>
                </div>
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="páginas, km…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag">Tag</Label>
                  <Input
                    id="tag"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="saúde"
                    list="tag-suggestions"
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
              </div>
            </TabsContent>

            <TabsContent value="look" className="space-y-4">
              <div className="space-y-2">
                <Label>Emoji</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {emoji ? (
                        <span className="text-lg">{emoji}</span>
                      ) : (
                        <Smile className="h-4 w-4" />
                      )}
                      {emoji ? "Trocar" : "Escolher"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium">Escolha um emoji</span>
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
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEmoji(e)}
                          className={cn(
                            "grid h-8 w-8 place-items-center rounded-md text-lg transition-colors hover:bg-accent",
                            emoji === e && "bg-primary/20 ring-2 ring-primary",
                          )}
                        >
                          {e}
                        </button>
                      ))}
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
                      className={cn(
                        "relative grid h-9 w-full place-items-center rounded-lg transition-transform hover:scale-105",
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && (
                        <Check
                          className="h-4 w-4 text-white"
                          strokeWidth={3}
                        />
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
            <Button type="submit" disabled={submitting || !name.trim()}>
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
