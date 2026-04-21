import { motion } from "framer-motion";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

interface Props {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 140,
  stroke = 12,
  color,
  label,
  sublabel,
  className,
}: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - pct);
  const displayPct = Math.round(pct * 100);
  const strokeColor = color ?? "hsl(var(--primary))";

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            filter:
              pct > 0 ? `drop-shadow(0 0 6px ${strokeColor})` : undefined,
          }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div
            className="font-display text-3xl font-bold leading-none tracking-tight font-tabular"
            style={{ color: pct >= 1 ? strokeColor : undefined }}
          >
            <CountUp
              end={displayPct}
              duration={0.8}
              useEasing
              preserveValue
            />
            <span className="ml-0.5 text-base font-normal text-muted-foreground">
              %
            </span>
          </div>
          {label && (
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">
              {label}
            </div>
          )}
          {sublabel && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {sublabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
