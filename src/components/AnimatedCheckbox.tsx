import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  color?: string;
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  "aria-label"?: string;
}

export function AnimatedCheckbox({
  checked,
  color,
  size = 40,
  onClick,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const accent = color ?? "hsl(var(--primary))";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full outline-none transition-colors",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: checked ? accent : "transparent",
        border: `2px solid ${checked ? accent : "hsl(var(--border))"}`,
        boxShadow: checked ? `0 0 16px -4px ${accent}` : undefined,
      }}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.05 }}
      aria-label={ariaLabel ?? (checked ? "Marcado" : "Não marcado")}
      aria-pressed={checked}
    >
      <AnimatePresence initial={false} mode="wait">
        {checked && (
          <motion.svg
            key="check"
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none"
            style={{ width: size * 0.55, height: size * 0.55 }}
            initial={{ pathLength: 0, opacity: 0, scale: 0.6 }}
            animate={{ pathLength: 1, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <motion.path
              d="M4 12.5L9.5 18L20 7"
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
