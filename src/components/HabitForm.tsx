import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
];

interface Props {
  onCreate: (input: {
    name: string;
    description?: string | null;
    color?: string;
    targetPerWeek?: number;
  }) => Promise<{ id: string } | null>;
  onCreated?: (id: string) => void;
}

export function HabitForm({ onCreate, onCreated }: Props) {
  const { isCreateOpen, closeCreate } = useUIStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [targetPerWeek, setTargetPerWeek] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const row = await onCreate({
      name: name.trim(),
      description: description.trim() || null,
      color,
      targetPerWeek,
    });
    setSubmitting(false);
    setName("");
    setDescription("");
    setColor(COLORS[0]);
    setTargetPerWeek(7);
    closeCreate();
    if (row) onCreated?.(row.id);
  }

  return (
    <Dialog open={isCreateOpen} onOpenChange={(o) => !o && closeCreate()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo hábito</DialogTitle>
          <DialogDescription>
            Defina um hábito para acompanhar regularmente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ler 30 minutos"
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
          <div className="space-y-2">
            <Label htmlFor="target">Meta semanal</Label>
            <div className="flex items-center gap-3">
              <Input
                id="target"
                type="number"
                min={1}
                max={7}
                value={targetPerWeek}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setTargetPerWeek(Math.max(1, Math.min(7, v)));
                }}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {targetPerWeek === 7 ? "dias por semana (diário)" : "dias por semana"}
              </span>
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
              onClick={closeCreate}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
