import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HIcon } from "./icons/HIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  loadReminder,
  notificationsSupported,
  requestNotificationPermission,
  saveReminder,
  startReminderTimer,
  type ReminderConfig,
} from "@/lib/reminders";

interface Props {
  /** Current count of pending habits today. */
  pendingCount: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function Reminders({ pendingCount }: Props) {
  const [cfg, setCfg] = useState<ReminderConfig>(() => loadReminder());
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationsSupported() ? Notification.permission : "denied",
  );

  const pendingRef = useRef(pendingCount);
  useEffect(() => {
    pendingRef.current = pendingCount;
  }, [pendingCount]);

  useEffect(() => {
    if (!cfg.enabled) return;
    const stop = startReminderTimer(cfg, () => pendingRef.current);
    return stop;
  }, [cfg]);

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
    toast.success(`Lembrete ativado para ${pad(next.hour)}:${pad(next.minute)}`);
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
      field === "hour"
        ? Math.max(0, Math.min(23, v))
        : Math.max(0, Math.min(59, v));
    const next = { ...cfg, [field]: bounded } as ReminderConfig;
    setCfg(next);
    saveReminder(next);
  }

  const isActive = cfg.enabled && permission === "granted";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Lembretes">
          <HIcon
            name={isActive ? "bell" : "bell-off"}
            size={16}
            className={isActive ? "text-primary" : undefined}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="space-y-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold">
                Lembrete diário
              </h3>
              {isActive && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  <HIcon name="check" size={10} />
                  ativo
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Notifica só se ainda houver hábitos pendentes no horário escolhido.
              Requer a aba aberta.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
            <TimeInput
              label="Hora"
              value={cfg.hour}
              min={0}
              max={23}
              onChange={(v) => handleTimeChange("hour", String(v))}
            />
            <span className="mt-5 font-display text-xl font-semibold text-muted-foreground">
              :
            </span>
            <TimeInput
              label="Minuto"
              value={cfg.minute}
              min={0}
              max={59}
              onChange={(v) => handleTimeChange("minute", String(v))}
            />
            <div className="ml-auto text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Disparo
              </div>
              <div className="font-display font-semibold tabular-nums">
                {pad(cfg.hour)}:{pad(cfg.minute)}
              </div>
            </div>
          </div>

          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisable}
              className="w-full"
            >
              <HIcon name="bell-off" size={16} />
              Desativar lembrete
            </Button>
          ) : (
            <Button size="sm" onClick={handleEnable} className="w-full">
              <HIcon name="bell" size={16} />
              Ativar lembrete
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TimeInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function TimeInput({ label, value, min, max, onChange }: TimeInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-14 text-center font-mono text-base tabular-nums"
      />
    </div>
  );
}
