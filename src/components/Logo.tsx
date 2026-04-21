import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { wrap: "h-6 w-6", stroke: 2.5 },
  md: { wrap: "h-8 w-8", stroke: 2.5 },
  lg: { wrap: "h-10 w-10", stroke: 2.5 },
} as const;

export function LogoMark({ className, size = "md" }: Props) {
  const s = SIZES[size];
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30",
        s.wrap,
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[60%] w-[60%] text-primary"
      >
        <path
          d="M4 12.5L9.5 18L20 7"
          stroke="currentColor"
          strokeWidth={s.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark size="sm" />
      <span className="font-display text-xl font-bold tracking-tight">
        Traker
      </span>
    </div>
  );
}
