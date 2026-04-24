import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromDateKey } from "@/lib/date";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { DateKey } from "@/lib/date";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: DateKey | null;
  initialNote: string | null;
  habitName: string;
  done: boolean;
  onSave: (note: string | null) => void;
  onToggleDone: () => void;
}

export function DayNoteDialog({
  open,
  onOpenChange,
  date,
  initialNote,
  habitName,
  done,
  onSave,
  onToggleDone,
}: Props) {
  const [value, setValue] = useState(initialNote ?? "");

  useEffect(() => {
    setValue(initialNote ?? "");
  }, [initialNote, date]);

  function handleSave() {
    onSave(value.trim() || null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {date &&
              format(fromDateKey(date), "EEEE, d 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
          </DialogTitle>
          <DialogDescription>{habitName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            variant={done ? "secondary" : "primary"}
            onClick={onToggleDone}
            className="w-full"
          >
            {done ? "Desmarcar esse dia" : "Marcar como feito"}
          </Button>
          <Textarea
            placeholder="Notas do dia (opcional)…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar nota</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
