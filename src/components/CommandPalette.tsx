import { useEffect } from "react";
import { HIcon } from "./icons/HIcon";
import { HabitGlyph } from "./HabitGlyph";
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
  onOpenCommunity?: () => void;
  onOpenAdmin?: () => void;
  onOpenProfile?: () => void;
  onOpenBjFogg?: () => void;
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
  onOpenCommunity,
  onOpenAdmin,
  onOpenProfile,
  onOpenBjFogg,
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
            <HIcon name="plus" size={16} />
            Novo hábito
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(onGoToday)}>
            <HIcon name="home" size={16} />
            Ir para Hoje
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(onToggleTheme)}>
            <HIcon name={theme === "dark" ? "sun" : "moon"} size={16} />
            Tema {theme === "dark" ? "claro" : "escuro"}
          </CommandItem>
          <CommandItem onSelect={run(onToggleArchivedView)}>
            <HIcon
              name={showArchived ? "archive-restore" : "archive"}
              size={16}
            />
            {showArchived ? "Ver ativos" : "Ver arquivados"}
          </CommandItem>
          <CommandItem onSelect={run(onOpenShortcuts)}>
            <HIcon name="keyboard" size={16} />
            Atalhos de teclado
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        {(onOpenCommunity || onOpenAdmin || onOpenProfile || onOpenBjFogg) && (
          <CommandGroup heading="Descobrir">
            {onOpenProfile && (
              <CommandItem onSelect={run(onOpenProfile)}>
                <HIcon name="user" size={16} />
                Seu perfil
              </CommandItem>
            )}
            {onOpenCommunity && (
              <CommandItem onSelect={run(onOpenCommunity)}>
                <HIcon name="compass" size={16} />
                Comunidade
              </CommandItem>
            )}
            {onOpenBjFogg && (
              <CommandItem onSelect={run(onOpenBjFogg)}>
                <HIcon name="sparkles" size={16} />
                Criar hábito guiado (BJ Fogg)
              </CommandItem>
            )}
            {onOpenAdmin && (
              <CommandItem onSelect={run(onOpenAdmin)}>
                <HIcon name="chart" size={16} />
                Painel admin
                <CommandShortcut>⌃⇧A</CommandShortcut>
              </CommandItem>
            )}
          </CommandGroup>
        )}
        <CommandGroup heading="Dados">
          <CommandItem onSelect={run(onExport)}>
            <HIcon name="download" size={16} />
            Exportar backup
          </CommandItem>
          <CommandItem onSelect={run(onImport)}>
            <HIcon name="upload" size={16} />
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
                    {h.emoji ? (
                      <HabitGlyph emoji={h.emoji} size={12} />
                    ) : (
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
                  <HIcon name={h.pausedAt ? "play" : "pause"} size={16} />
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
                  <HIcon name="archive" size={16} />
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
                  <HIcon name="archive-restore" size={16} />
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
