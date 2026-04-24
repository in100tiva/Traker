import { cn } from "@/lib/utils";

interface Props {
  value: React.ReactNode;
  label: string;
  accent?: boolean;
  className?: string;
}

export function StatCard({ value, label, accent, className }: Props) {
  return (
    <div
      className={cn(
        "flex-1 rounded-md border px-3 py-2.5 text-center",
        accent
          ? "border-accent-ring bg-accent-soft"
          : "border-border bg-surface-2",
        className,
      )}
    >
      <div
        className={cn(
          "font-display text-[17px] font-semibold leading-[1.1] tracking-tighter",
          accent ? "text-accent" : "text-ink",
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-ink-dim">
        {label}
      </div>
    </div>
  );
}
