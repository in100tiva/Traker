import { HIcon, type IconName } from "./icons/HIcon";
import { useUIStore, type ActiveView } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

interface NavItem {
  id: ActiveView;
  icon: IconName;
  label: string;
}

const ITEMS: NavItem[] = [
  { id: "today", icon: "home", label: "Hoje" },
  { id: "habits", icon: "check", label: "Hábitos" },
  { id: "stats", icon: "chart", label: "Análise" },
  { id: "calendar", icon: "calendar", label: "Calendário" },
  { id: "achievements", icon: "trophy", label: "Conquistas" },
];

/**
 * Floating pill-shaped bottom nav (mobile). 5 destinations; the active one
 * expands to show its label, others collapse to icon-only for a clean look.
 */
export function BottomNav() {
  const { activeView, setView } = useUIStore();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 10px) + 10px)",
        paddingTop: 10,
        background:
          "linear-gradient(180deg, rgba(10,10,10,0) 0%, rgb(10 10 10 / 0.7) 35%, rgb(10 10 10 / 0.92) 100%)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div
        className="flex max-w-full items-center gap-1 rounded-pill border border-border bg-surface-2 p-1.5 shadow-elevated"
        style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.55)" }}
      >
        {ITEMS.map((it) => {
          const active = activeView === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setView(it.id)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-pill text-[13px] font-semibold transition-all",
                active
                  ? "bg-accent px-3.5 text-[rgb(10,10,10)]"
                  : "bg-transparent px-2.5 text-ink-dim",
              )}
              aria-current={active ? "page" : undefined}
            >
              <HIcon
                name={it.icon}
                size={active ? 16 : 18}
                strokeWidth={active ? 2 : 1.75}
              />
              {active && <span>{it.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
