import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/settings";

interface Props {
  theme: Theme;
  onChange: (t: Theme) => void;
}

export function ThemeToggle({ theme, onChange }: Props) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onChange(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
