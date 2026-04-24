import type { ReactNode } from "react";

interface Props {
  /** 0..1 or 0..100. Values > 1 are treated as percentage. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Dark-first circular progress ring matching the Streaks design.
 * Transitions are handled via SVG stroke-dashoffset for smooth animation.
 */
export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  color,
  trackColor,
  className,
  children,
}: Props) {
  const pct = Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  const strokeColor = color ?? "rgb(var(--accent))";
  const track = trackColor ?? "rgb(var(--surface-3))";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={strokeColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      {children && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
