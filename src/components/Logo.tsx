import { HIcon } from "./icons/HIcon";
import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
  withSubtitle?: boolean;
}

const SIZES = {
  sm: { tile: 28, icon: 16, title: "text-[15px]", subtitle: "text-[9px]" },
  md: { tile: 32, icon: 18, title: "text-base", subtitle: "text-[10px]" },
  lg: { tile: 40, icon: 22, title: "text-lg", subtitle: "text-[11px]" },
} as const;

export function LogoMark({
  size = "md",
  className,
}: Omit<Props, "withSubtitle">) {
  const s = SIZES[size];
  return (
    <div
      className={cn(
        "grid place-items-center rounded-[8px] bg-accent text-[rgb(10,10,10)]",
        className,
      )}
      style={{ width: s.tile, height: s.tile }}
    >
      <HIcon name="flame" size={s.icon} strokeWidth={2.25} />
    </div>
  );
}

export function LogoWordmark({
  size = "md",
  className,
  withSubtitle = true,
}: Props) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <div>
        <div
          className={cn(
            "font-display font-bold text-ink tracking-tighter leading-none",
            s.title,
          )}
        >
          Streaks
        </div>
        {withSubtitle && (
          <div
            className={cn(
              "mt-0.5 font-mono uppercase tracking-wider text-ink-mute",
              s.subtitle,
            )}
          >
            Tracker de hábitos
          </div>
        )}
      </div>
    </div>
  );
}
