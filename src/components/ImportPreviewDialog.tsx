import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromDateKey } from "@/lib/date";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  FileText,
  Pause,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExportPayload } from "@/db/queries";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  payload: ExportPayload | null;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

export function ImportPreviewDialog({
  open,
  payload,
  onCancel,
  onConfirm,
  confirming,
}: Props) {
  const stats = useMemo(() => {
    if (!payload) return null;
    const habits = payload.habits ?? [];
    const completions = payload.completions ?? [];
    const settings = payload.settings ?? [];

    const active = habits.filter((h) => !h.archivedAt && !h.pausedAt).length;
    const paused = habits.filter((h) => !h.archivedAt && h.pausedAt).length;
    const archived = habits.filter((h) => h.archivedAt).length;
    const notes = completions.filter((c) => c.note && c.note.length > 0).length;

    let dateRange: string | null = null;
    if (completions.length > 0) {
      const dates = completions.map((c) => c.date).sort();
      dateRange = `${format(fromDateKey(dates[0]), "dd MMM yyyy", { locale: ptBR })} → ${format(fromDateKey(dates[dates.length - 1]), "dd MMM yyyy", { locale: ptBR })}`;
    }

    let exportedAt: string | null = null;
    try {
      exportedAt = payload.exportedAt
        ? format(parseISO(payload.exportedAt), "dd 'de' MMMM, HH:mm", {
            locale: ptBR,
          })
        : null;
    } catch {
      exportedAt = payload.exportedAt ?? null;
    }

    return {
      active,
      paused,
      archived,
      totalHabits: habits.length,
      completions: completions.length,
      notes,
      settings: settings.length,
      dateRange,
      exportedAt,
      version: payload.version,
    };
  }, [payload]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar backup</DialogTitle>
          <DialogDescription>
            {stats?.exportedAt
              ? `Arquivo exportado em ${stats.exportedAt}.`
              : "Confira o conteúdo antes de confirmar."}
          </DialogDescription>
        </DialogHeader>

        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                icon={CheckCircle2}
                tone="success"
                label="Ativos"
                value={stats.active}
              />
              <StatCard
                icon={Pause}
                tone="warning"
                label="Pausados"
                value={stats.paused}
              />
              <StatCard
                icon={Archive}
                tone="muted"
                label="Arquivados"
                value={stats.archived}
              />
            </div>

            <div className="rounded-lg border bg-muted/40 p-3">
              <ul className="space-y-1.5 text-sm">
                <DetailLine
                  icon={FileText}
                  label="Marcações"
                  value={stats.completions.toString()}
                />
                {stats.notes > 0 && (
                  <DetailLine
                    icon={FileText}
                    label="Dias com nota"
                    value={stats.notes.toString()}
                  />
                )}
                {stats.dateRange && (
                  <DetailLine
                    icon={FileText}
                    label="Período"
                    value={stats.dateRange}
                  />
                )}
                <DetailLine
                  icon={Settings2}
                  label="Preferências incluídas"
                  value={stats.settings > 0 ? "sim" : "não"}
                />
              </ul>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Isso <strong>substituirá todos os dados atuais</strong> do
                Traker neste navegador. A operação não pode ser desfeita (além
                de importar outro backup).
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={confirming}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={confirming || !stats}>
            {confirming ? "Importando…" : `Importar ${stats?.totalHabits ?? 0} hábitos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TONES = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
  label: string;
  value: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border p-2 text-center",
        TONES[tone],
      )}
    >
      <Icon className="mb-1 h-4 w-4" />
      <div className="font-display text-xl font-semibold leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider opacity-80">
        {label}
      </div>
    </div>
  );
}

function DetailLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="tabular-nums">{value}</span>
    </li>
  );
}
