import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { CompletionRecord, WeeklyCount } from "@/db/queries";
import { generateInsights, type Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";

interface Props {
  completions: CompletionRecord[];
  weekly: WeeklyCount[];
  targetPerWeek: number;
  color: string;
}

const ICONS: Record<Insight["kind"], React.ComponentType<{ className?: string }>> = {
  success: TrendingUp,
  info: ArrowUpRight,
  warning: AlertTriangle,
  milestone: Sparkles,
};

const TONE: Record<Insight["kind"], string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  milestone: "text-primary",
};

/**
 * Renders a string with **bold** segments as <strong>.
 */
function renderWithBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function HabitInsights({
  completions,
  weekly,
  targetPerWeek,
  color,
}: Props) {
  const insights = useMemo(
    () => generateInsights({ completions, weekly, targetPerWeek }),
    [completions, weekly, targetPerWeek],
  );

  if (insights.length === 0) return null;

  return (
    <div
      className="rounded-xl border bg-card p-4"
      style={{
        backgroundImage: `radial-gradient(circle at top left, ${color}12, transparent 60%)`,
      }}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        Resumo
      </div>
      <ul className="space-y-1.5">
        {insights.map((ins, i) => {
          const Icon = ICONS[ins.kind];
          return (
            <motion.li
              key={ins.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              className="flex items-start gap-2 text-sm leading-relaxed"
            >
              <Icon
                className={cn("mt-0.5 h-4 w-4 shrink-0", TONE[ins.kind])}
              />
              <span className="text-muted-foreground">
                {renderWithBold(ins.text)}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
