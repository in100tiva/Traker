import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS: { key: string; description: string }[] = [
  { key: "N", description: "Novo hábito" },
  { key: "Space", description: "Marcar hoje no hábito selecionado" },
  { key: "T", description: "Ir para visão 'Hoje'" },
  { key: "J / ↓", description: "Próximo hábito" },
  { key: "K / ↑", description: "Hábito anterior" },
  { key: "← / →", description: "Navegar meses no heatmap" },
  { key: "/", description: "Focar na busca" },
  { key: "?", description: "Mostrar/ocultar atalhos" },
  { key: "Esc", description: "Fechar modais" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsHelp({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de teclado
          </DialogTitle>
          <DialogDescription>
            Aceleradores para navegar e marcar hábitos sem o mouse.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">
                {s.key}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

interface ButtonProps {
  onOpen: () => void;
}
export function ShortcutsHelpButton({ onOpen }: ButtonProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onOpen} aria-label="Atalhos">
      <Keyboard className="h-4 w-4" />
    </Button>
  );
}
