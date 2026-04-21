import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import type { Habit } from "@/db/schema";

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
];

export interface HabitFormInput {
  name: string;
  description?: string | null;
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
  onCreated?: (id: string) => void;
  onCloseEdit?: () => void;
}

export function HabitForm({
  onCreate,
  onUpdate,
  editing,
  onCreated,
  onCloseEdit,
}: Props) {
  const { isCreateOpen, closeCreate } = useUIStore();
  const isEdit = Boolean(editing);
  const open = isCreateOpen || isEdit;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [targetPerWeek, setTargetPerWeek] = useState(7);
  const [targetPerDay, setTargetPerDay] = useState<number | "">("");
  const [unit, setUnit] = useState("");
  const [isNegative, setIsNegative] = useState(false);
  const [tag, setTag] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setColor(editing.color);
      setTargetPerWeek(editing.targetPerWeek);
      setTargetPerDay(editing.targetPerDay ?? "");
      setUnit(editing.unit ?? "");
      setIsNegative(editing.isNegative);
      setTag(editing.tag ?? "");
    } else if (!isCreateOpen) {
      // reset when dialog closes
      setName("");
      setDescription("");
      setColor(COLORS[0]);
      setTargetPerWeek(7);
      setTargetPerDay("");
      setUnit("");
      setIsNegative(false);
      setTag("");
    }
  }, [editing, isCreateOpen]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) return;
    if (isEdit) onCloseEdit?.();
    else closeCreate();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const input: HabitFormInput = {
      name: name.trim(),
      description: description.trim() || null,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar hábito" : "Novo hábito"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste as propriedades do hábito."
              : "Defina um hábito para acompanhar regularmente."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isNegative ? "Não beber refrigerante" : "Ler 30 minutos"}
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Antes de dormir"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="negative" className="text-sm font-medium">
                Hábito negativo
              </Label>
              <p className="text-xs text-muted-foreground">
                Marque os dias em que conseguiu evitar (abstinência).
              </p>
            </div>
            <Switch
              id="negative"
              checked={isNegative}
              onCheckedChange={setIsNegative}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target">Meta semanal</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag">Tag (opcional)</Label>
              <Input
                id="tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="saúde"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tpd">Alvo diário</Label>
              <Input
                id="tpd"
                type="number"
                min={1}
                value={targetPerDay}
                onChange={(e) =>
                  setTargetPerDay(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="(opcional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="páginas, km…"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    color === c
                      ? "scale-110 border-foreground"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
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
