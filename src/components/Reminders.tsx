import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loadReminder,
  notificationsSupported,
  requestNotificationPermission,
  saveReminder,
  startReminderTimer,
  type ReminderConfig,
} from "@/lib/reminders";

interface Props {
  /** Returns how many active habits still lack a completion today. */
  getPendingCount: () => number;
}

export function Reminders({ getPendingCount }: Props) {
  const [cfg, setCfg] = useState<ReminderConfig>(() => loadReminder());
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationsSupported() ? Notification.permission : "denied",
  );

  useEffect(() => {
    if (!cfg.enabled) return;
    const stop = startReminderTimer(cfg, getPendingCount);
    return stop;
  }, [cfg, getPendingCount]);

  async function handleEnable() {
    if (!notificationsSupported()) {
      toast.error("Notificações não suportadas neste navegador");
      return;
    }
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm !== "granted") {
      toast.error("Permissão de notificação negada");
      return;
    }
    const next = { ...cfg, enabled: true };
    setCfg(next);
    saveReminder(next);
    toast.success(
      `Lembrete ativado para ${String(next.hour).padStart(2, "0")}:${String(next.minute).padStart(2, "0")}`,
    );
  }

  function handleDisable() {
    const next = { ...cfg, enabled: false };
    setCfg(next);
    saveReminder(next);
    toast.success("Lembretes desativados");
  }

  function handleTimeChange(field: "hour" | "minute", value: string) {
    const v = Number(value);
    if (!Number.isFinite(v)) return;
    const bounded =
      field === "hour" ? Math.max(0, Math.min(23, v)) : Math.max(0, Math.min(59, v));
    const next = { ...cfg, [field]: bounded } as ReminderConfig;
    setCfg(next);
    saveReminder(next);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-label="Lembretes"
      >
        {cfg.enabled && permission === "granted" ? (
          <Bell className="h-4 w-4 text-primary" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        Lembretes
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-md border bg-card p-4 shadow-lg">
          <h3 className="mb-2 text-sm font-semibold">Lembrete diário</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Notificação enviada se ainda houver hábitos pendentes no horário
            escolhido. Requer a aba aberta.
          </p>
          <div className="mb-3 flex items-end gap-2">
            <div>
              <Label htmlFor="rh" className="text-xs">
                Hora
              </Label>
              <Input
                id="rh"
                type="number"
                min={0}
                max={23}
                value={cfg.hour}
                onChange={(e) => handleTimeChange("hour", e.target.value)}
                className="w-16"
              />
            </div>
            <div>
              <Label htmlFor="rm" className="text-xs">
                Minuto
              </Label>
              <Input
                id="rm"
                type="number"
                min={0}
                max={59}
                value={cfg.minute}
                onChange={(e) => handleTimeChange("minute", e.target.value)}
                className="w-16"
              />
            </div>
          </div>
          {cfg.enabled && permission === "granted" ? (
            <Button variant="outline" size="sm" onClick={handleDisable} className="w-full">
              <BellOff className="h-4 w-4" />
              Desativar
            </Button>
          ) : (
            <Button size="sm" onClick={handleEnable} className="w-full">
              <Bell className="h-4 w-4" />
              Ativar lembrete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
