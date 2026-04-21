import { useEffect } from "react";
import {
  Archive,
  ArchiveRestore,
  Download,
  Home,
  Keyboard,
  Moon,
  Pause,
  Play,
  Plus,
  Sun,
  Upload,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { Habit } from "@/db/schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: Habit[];
  onOpenCreate: () => void;
  onOpenShortcuts: () => void;
  onToggleTheme: () => void;
  onToggleArchivedView: () => void;
  onSelectHabit: (id: string) => void;
  onArchive: (id: string, name: string) => void;
  onUnarchive: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onExport: () => void;
  onImport: () => void;
  theme: "light" | "dark";
  showArchived: boolean;
  onGoToday: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  habits,
  onOpenCreate,
  onOpenShortcuts,
  onToggleTheme,
  onToggleArchivedView,
  onSelectHabit,
  onArchive,
  onUnarchive,
  onPause,
  onResume,
  onExport,
  onImport,
  theme,
  showArchived,
  onGoToday,
}: Props) {
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (
        (e.key === "k" || e.key === "K") &&
        (e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const close = () => onOpenChange(false);
  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  const activeHabits = habits.filter((h) => !h.archivedAt);
  const archivedHabits = habits.filter((h) => h.archivedAt);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar hábitos ou digitar um comando…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Ações">
          <CommandItem onSelect={run(onOpenCreate)}>
            <Plus />
            Novo hábito
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(onGoToday)}>
            <Home />
            Ir para Hoje
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(onToggleTheme)}>
            {theme === "dark" ? <Sun /> : <Moon />}
            Tema {theme === "dark" ? "claro" : "escuro"}
          </CommandItem>
          <CommandItem onSelect={run(onToggleArchivedView)}>
            {showArchived ? <ArchiveRestore /> : <Archive />}
            {showArchived ? "Ver ativos" : "Ver arquivados"}
          </CommandItem>
          <CommandItem onSelect={run(onOpenShortcuts)}>
            <Keyboard />
            Atalhos de teclado
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Dados">
          <CommandItem onSelect={run(onExport)}>
            <Download />
            Exportar backup
          </CommandItem>
          <CommandItem onSelect={run(onImport)}>
            <Upload />
            Importar backup
          </CommandItem>
        </CommandGroup>
        {activeHabits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Hábitos ativos">
              {activeHabits.map((h) => (
                <CommandItem
                  key={h.id}
                  onSelect={run(() => onSelectHabit(h.id))}
                  value={`go ${h.name} ${h.tag ?? ""}`}
                >
                  <span
                    className="grid h-5 w-5 place-items-center rounded text-xs"
                    style={{ backgroundColor: `${h.color}33` }}
                  >
                    {h.emoji ?? (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: h.color }}
                      />
                    )}
                  </span>
                  Abrir: {h.name}
                  {h.tag && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      #{h.tag}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Pausar / retomar">
              {activeHabits.map((h) => (
                <CommandItem
                  key={h.id}
                  onSelect={run(() =>
                    h.pausedAt ? onResume(h.id) : onPause(h.id),
                  )}
                  value={`${h.pausedAt ? "resume" : "pause"} ${h.name}`}
                >
                  {h.pausedAt ? <Play /> : <Pause />}
                  {h.pausedAt ? "Retomar" : "Pausar"}: {h.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Arquivar">
              {activeHabits.map((h) => (
                <CommandItem
                  key={h.id}
                  onSelect={run(() => onArchive(h.id, h.name))}
                  value={`archive ${h.name}`}
                >
                  <Archive />
                  Arquivar: {h.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {archivedHabits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Arquivados">
              {archivedHabits.map((h) => (
                <CommandItem
                  key={h.id}
                  onSelect={run(() => onUnarchive(h.id))}
                  value={`unarchive ${h.name}`}
                >
                  <ArchiveRestore />
                  Restaurar: {h.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
