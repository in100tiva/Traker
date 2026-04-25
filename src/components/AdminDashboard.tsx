import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HIcon } from "./icons/HIcon";
import { cn } from "@/lib/utils";
import {
  abandonedHabits,
  activationStats,
  churnRiskFromDays,
  daysSinceLastEvent,
  eventsByHour,
  retentionStats,
} from "@/lib/analytics";
import { listFlags, variantFor, type FlagId } from "@/lib/feature-flags";
import type { DbBundle } from "@/db/client";
import {
  getRecentXp,
  getSetting,
  getXpTotal,
  listEvents,
  setSetting,
} from "@/db/queries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: DbBundle | null;
}

interface EventLite {
  type: string;
  payload: unknown;
  createdAt: Date | string;
}

interface XpRow {
  id: string;
  amount: number;
  kind: string;
  createdAt: Date | string;
  habitId: string | null;
  payload: unknown;
}

const FLAG_LABELS: Record<FlagId, string> = {
  celebration_intensity: "Intensidade da celebração",
  streak_break_copy: "Copy quando streak quebra",
  drop_frequency: "Frequência de drops",
  onboarding_steps: "Passos do onboarding",
  home_layout: "Layout da home",
};

/**
 * Hidden admin dashboard. Activated via Cmd/Ctrl+Shift+A or by typing the
 * "Painel admin" command in the Command Palette.
 *
 * Shows all the analytics signals computed locally:
 *  - Activation hours since install
 *  - D1/D7/D30 retention
 *  - Churn bucket (active/at_risk/dormant/churned)
 *  - Events by hour (histogram)
 *  - Top abandoned habits
 *  - Recent XP log
 *  - Feature flags variant + override toggle
 */
export function AdminDashboard({ open, onOpenChange, bundle }: Props) {
  const [events, setEvents] = useState<EventLite[]>([]);
  const [xp, setXp] = useState<XpRow[]>([]);
  const [installId, setInstallId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<
    Partial<Record<FlagId, string>>
  >({});
  const [totalXp, setTotalXp] = useState(0);

  useEffect(() => {
    if (!open || !bundle) return;
    let cancelled = false;
    (async () => {
      const ev = await listEvents(bundle.db, 1000);
      const xpRows = await getRecentXp(bundle.db, 30);
      const total = await getXpTotal(bundle.db);
      const install = await getSetting<{ installId: string }>(
        bundle.db,
        "install",
      );
      const ovs =
        (await getSetting<Partial<Record<FlagId, string>>>(
          bundle.db,
          "feature_overrides",
        )) ?? {};
      if (cancelled) return;
      setEvents(
        ev.map((e) => ({
          type: e.type,
          payload: e.payload,
          createdAt: e.createdAt,
        })),
      );
      setXp(
        xpRows.map((r) => ({
          id: r.id,
          amount: r.amount,
          kind: r.kind,
          createdAt: r.createdAt,
          habitId: r.habitId,
          payload: r.payload,
        })),
      );
      setTotalXp(total);
      setInstallId(install?.installId ?? null);
      setOverrides(ovs);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bundle]);

  async function setOverride(flagId: FlagId, value: string | null) {
    if (!bundle) return;
    const next = { ...overrides };
    if (value === null) delete next[flagId];
    else next[flagId] = value;
    setOverrides(next);
    await setSetting(bundle.db, "feature_overrides", next);
  }

  const activation = activationStats(events);
  const retention = retentionStats(events);
  const sinceLast = daysSinceLastEvent(events);
  const churn = churnRiskFromDays(sinceLast);
  const hourBuckets = eventsByHour(events, "habit_check");
  const abandoned = abandonedHabits(events, 14);
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-3 p-0">
        <DialogHeader className="border-b border-border p-4 pr-12">
          <DialogTitle className="font-display text-[18px] tracking-tighter">
            Painel admin
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Sinais locais de retenção, eventos e flags. Tudo lê o seu próprio
            DB — não há outros usuários.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4">
          <Tabs defaultValue="retention">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="retention">Retenção</TabsTrigger>
              <TabsTrigger value="activity">Atividade</TabsTrigger>
              <TabsTrigger value="flags">Flags</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>

            {/* RETENTION */}
            <TabsContent value="retention" className="mt-3 space-y-3 pb-4">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Card
                  label="Ativação"
                  value={
                    activation.isActivated
                      ? `${activation.hoursToActivation ?? 0}h`
                      : "—"
                  }
                  sub={activation.isActivated ? "até primeiro check" : "ainda não"}
                  tone={activation.isActivated ? "good" : "muted"}
                />
                <Card
                  label="D1"
                  value={retention.d1 ? "✓" : "—"}
                  sub="ativo no dia +1"
                  tone={retention.d1 ? "good" : "muted"}
                />
                <Card
                  label="D7"
                  value={retention.d7 ? "✓" : "—"}
                  sub="ativo no dia +7"
                  tone={retention.d7 ? "good" : "muted"}
                />
                <Card
                  label="D30"
                  value={retention.d30 ? "✓" : "—"}
                  sub="ativo no dia +30"
                  tone={retention.d30 ? "good" : "muted"}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <Card
                  label="Dias ativos"
                  value={retention.daysActive.toString()}
                  sub="desde o install"
                />
                <Card
                  label="Sem usar há"
                  value={
                    sinceLast === null ? "—" : `${sinceLast}d`
                  }
                  sub={churnLabel(churn)}
                  tone={churnTone(churn)}
                />
                <Card
                  label="XP total"
                  value={totalXp.toString()}
                  sub="acumulado"
                />
              </div>

              {/* Hour histogram */}
              <div className="rounded-md border border-border bg-bg p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  Marcações por hora · pico {peakHour}h
                </div>
                <div className="mt-2 flex items-end gap-1 h-20">
                  {hourBuckets.map((c, h) => {
                    const max = Math.max(1, ...hourBuckets);
                    const h100 = Math.round((c / max) * 100);
                    return (
                      <div
                        key={h}
                        className="flex flex-1 flex-col items-center justify-end"
                      >
                        <div
                          className="w-full rounded-sm bg-accent"
                          style={{
                            height: `${h100}%`,
                            opacity: c === 0 ? 0.1 : 1,
                          }}
                          title={`${h}h: ${c}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-mute">
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                  <span>18h</span>
                  <span>24h</span>
                </div>
              </div>

              {/* Abandoned habits */}
              {abandoned.length > 0 && (
                <div className="rounded-md border border-border bg-bg p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                    Hábitos abandonados (14+ dias sem marcar)
                  </div>
                  <ul className="mt-2 space-y-1">
                    {abandoned.slice(0, 5).map((a) => (
                      <li
                        key={a.habitId}
                        className="flex items-center justify-between rounded-sm px-1.5 py-1 text-[12px]"
                      >
                        <span className="font-mono text-ink truncate">
                          {a.habitId.slice(0, 8)}…
                        </span>
                        <span className="font-mono text-ink-dim tabular-nums">
                          {a.totalChecks} checks · {a.daysSinceLastCheck}d
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            {/* ACTIVITY */}
            <TabsContent value="activity" className="mt-3 space-y-3 pb-4">
              <div className="rounded-md border border-border bg-bg p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  XP recente (30)
                </div>
                <div className="mt-2 max-h-72 overflow-y-auto">
                  <table className="w-full text-[11.5px]">
                    <thead className="font-mono text-[9px] uppercase tracking-wider text-ink-mute">
                      <tr>
                        <th className="px-1 py-1 text-left">Quando</th>
                        <th className="px-1 py-1 text-left">Tipo</th>
                        <th className="px-1 py-1 text-right">XP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {xp.map((r) => (
                        <tr key={r.id} className="border-t border-border/50">
                          <td className="px-1 py-1 font-mono text-ink-dim">
                            {new Date(r.createdAt).toLocaleString("pt-BR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-1 py-1 font-mono text-ink">
                            {r.kind}
                          </td>
                          <td className="px-1 py-1 text-right font-mono tabular-nums text-accent">
                            +{r.amount}
                          </td>
                        </tr>
                      ))}
                      {xp.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-1 py-3 text-center text-ink-mute"
                          >
                            Sem XP ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* FLAGS */}
            <TabsContent value="flags" className="mt-3 space-y-2 pb-4">
              <div className="rounded-md border border-dashed border-border bg-surface-2/50 p-3 font-mono text-[10.5px] text-ink-dim">
                Bucketing determinístico por install_id ·{" "}
                <span className="text-ink">
                  {installId?.slice(0, 8) ?? "—"}…
                </span>
              </div>
              {listFlags().map((flag) => {
                const live = variantFor(installId ?? "anon", flag.id, overrides);
                const bucket = variantFor(installId ?? "anon", flag.id);
                return (
                  <div
                    key={flag.id}
                    className="rounded-md border border-border bg-bg p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-display text-[13px] font-semibold tracking-tighter text-ink">
                          {FLAG_LABELS[flag.id]}
                        </div>
                        <div className="font-mono text-[10px] text-ink-mute">
                          bucket: {bucket}
                          {overrides[flag.id] && (
                            <span className="ml-2 text-warning">
                              · override
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {flag.variants.map((v) => (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() =>
                              setOverride(
                                flag.id,
                                overrides[flag.id] === v.value ? null : v.value,
                              )
                            }
                            className={cn(
                              "h-7 rounded-pill border px-2.5 font-mono text-[11px] transition-colors",
                              live === v.value
                                ? "border-accent bg-accent text-[rgb(10,10,10)]"
                                : "border-border bg-transparent text-ink-dim hover:bg-surface-2 hover:text-ink",
                            )}
                          >
                            {v.value}
                          </button>
                        ))}
                        {overrides[flag.id] && (
                          <button
                            type="button"
                            onClick={() => setOverride(flag.id, null)}
                            className="grid h-7 w-7 place-items-center rounded-pill text-ink-mute hover:bg-surface-2"
                            aria-label="Limpar override"
                          >
                            <HIcon name="x" size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* RAW EVENTS */}
            <TabsContent value="raw" className="mt-3 space-y-2 pb-4">
              <div className="rounded-md border border-border bg-bg p-3">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  Últimos eventos ({events.length})
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <tbody>
                      {events.slice(0, 100).map((e, i) => (
                        <tr key={i} className="border-t border-border/40">
                          <td className="w-32 px-1 py-1 font-mono text-ink-dim">
                            {new Date(e.createdAt).toLocaleString("pt-BR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-1 py-1 font-mono text-ink">
                            {e.type}
                          </td>
                          <td className="max-w-[260px] truncate px-1 py-1 font-mono text-[10px] text-ink-mute">
                            {e.payload ? JSON.stringify(e.payload) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Card({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "muted" | "warning" | "danger" | "neutral";
}) {
  const colors: Record<typeof tone, string> = {
    good: "text-success",
    muted: "text-ink-mute",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-ink",
  };
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <div className="font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-mute">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-[20px] font-bold tracking-tighter leading-none",
          colors[tone],
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 font-mono text-[10px] text-ink-dim">{sub}</div>
      )}
    </div>
  );
}

function churnLabel(c: ReturnType<typeof churnRiskFromDays>) {
  if (c === "active") return "ativo";
  if (c === "at_risk") return "em risco";
  if (c === "dormant") return "dormente";
  return "churned";
}

function churnTone(c: ReturnType<typeof churnRiskFromDays>) {
  if (c === "active") return "good" as const;
  if (c === "at_risk") return "warning" as const;
  if (c === "dormant") return "warning" as const;
  return "danger" as const;
}
