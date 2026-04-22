import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromDateKey } from "@/lib/date";
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
import type { WeeklyCount } from "@/db/queries";

interface Props {
  data: WeeklyCount[];
  color: string;
  target?: number;
}

export function WeeklyChart({ data, color, target = 0 }: Props) {
  const rows = data.map((d, i) => {
    const prev = i > 0 ? data[i - 1].count : 0;
    return {
      label: format(fromDateKey(d.weekStart), "dd/MM", { locale: ptBR }),
      weekStart: d.weekStart,
      count: d.count,
      prev,
      delta: i > 0 ? d.count - prev : 0,
      hitGoal: target > 0 && d.count >= target,
    };
  });

  if (rows.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
          📊
        </div>
        Nenhuma marcação ainda. Complete seu hábito para ver o gráfico.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="hsl(var(--border))"
          vertical={false}
          strokeOpacity={0.6}
        />
        <XAxis
          dataKey="label"
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
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
          content={<RichTooltip color={color} target={target} />}
        />
        <Bar
          dataKey="count"
          radius={[6, 6, 2, 2]}
          animationDuration={500}
        >
          {rows.map((row, idx) => (
            <Cell
              key={idx}
              fill={row.hitGoal ? color : `${color}88`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RichTooltip({
  active,
  payload,
  color,
  target,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      label: string;
      count: number;
      prev: number;
      delta: number;
      hitGoal: boolean;
    };
  }>;
  color: string;
  target: number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pctChange =
    d.prev > 0 ? Math.round((d.delta / d.prev) * 100) : null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-elevated">
      <div className="mb-1 font-medium">Semana de {d.label}</div>
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <span className="font-tabular">
          {d.count} marca{d.count === 1 ? "" : "s"}
        </span>
        {target > 0 && (
          <span className="text-muted-foreground">/ meta {target}</span>
        )}
      </div>
      {pctChange !== null && d.prev > 0 && (
        <div
          className={
            pctChange >= 0 ? "mt-0.5 text-success" : "mt-0.5 text-destructive"
          }
        >
          {pctChange >= 0 ? "↑" : "↓"} {Math.abs(pctChange)}% vs semana
          anterior
        </div>
      )}
      {d.hitGoal && (
        <div className="mt-0.5 text-primary">🎯 Meta atingida</div>
      )}
    </div>
  );
}
