import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DbBundle } from "@/db/client";
import { getWeekdayHistogram } from "@/db/queries";

const DOW_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  bundle: DbBundle | null;
  habitId: string | null;
  color: string;
}

export function WeekdayHistogram({ bundle, habitId, color }: Props) {
  const [data, setData] = useState<
    { day: string; rate: number; count: number }[]
  >([]);

  useEffect(() => {
    if (!bundle || !habitId) {
      setData([]);
      return;
    }
    let cancelled = false;
    getWeekdayHistogram(bundle.db, habitId).then((rows) => {
      if (cancelled) return;
      setData(
        rows.map((r) => ({
          day: DOW_LABELS[r.dow],
          rate: Math.round(r.rate * 100),
          count: r.count,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [bundle, habitId]);

  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Sem dados suficientes para o histograma semanal.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          unit="%"
          domain={[0, 100]}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value}%`, "Taxa"]}
        />
        <Bar dataKey="rate" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
