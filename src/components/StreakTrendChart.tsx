import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DbBundle } from "@/db/client";
import { getStreakHistory } from "@/db/queries";

interface Props {
  bundle: DbBundle | null;
  habitId: string | null;
  color: string;
}

export function StreakTrendChart({ bundle, habitId, color }: Props) {
  const [data, setData] = useState<{ label: string; streak: number }[]>([]);

  useEffect(() => {
    if (!bundle || !habitId) {
      setData([]);
      return;
    }
    let cancelled = false;
    getStreakHistory(bundle.db, habitId, 90).then((rows) => {
      if (cancelled) return;
      setData(
        rows.map((r) => ({
          label: format(parseISO(r.date), "dd/MM", { locale: ptBR }),
          streak: r.streak,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [bundle, habitId]);

  if (data.length === 0 || data.every((d) => d.streak === 0)) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Sem histórico suficiente para a tendência de streak.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="streakFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.5} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--muted-foreground))" }}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="streak"
          stroke={color}
          strokeWidth={2}
          fill="url(#streakFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
