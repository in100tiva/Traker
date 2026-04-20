import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyCount } from "@/db/queries";

interface Props {
  data: WeeklyCount[];
  color: string;
}

export function WeeklyChart({ data, color }: Props) {
  const rows = data.map((d) => ({
    label: format(parseISO(d.weekStart), "dd/MM", { locale: ptBR }),
    count: d.count,
  }));

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Nenhuma marcação ainda. Complete seu hábito para ver o gráfico.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
