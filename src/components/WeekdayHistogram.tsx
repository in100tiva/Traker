import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
        Sem dados suficientes ainda.
      </div>
    );
  }

  const maxRate = Math.max(...data.map((d) => d.rate));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="hsl(var(--border))"
          vertical={false}
          strokeOpacity={0.6}
        />
        <XAxis
          dataKey="day"
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          dy={4}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          unit="%"
          domain={[0, 100]}
          width={30}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as {
              day: string;
              rate: number;
              count: number;
            };
            return (
              <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-elevated">
                <div className="font-medium">{d.day}</div>
                <div className="text-muted-foreground">
                  {d.rate}% · {d.count} marca{d.count === 1 ? "" : "s"}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="rate" radius={[6, 6, 2, 2]} animationDuration={500}>
          {data.map((d, idx) => (
            <Cell
              key={idx}
              fill={d.rate === maxRate ? color : `${color}88`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
