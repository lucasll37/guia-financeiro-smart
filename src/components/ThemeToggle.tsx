import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { updatePreferences } = useUserPreferences();

  // Sincronizar next-themes com useUserPreferences
  useEffect(() => {
    if (theme) {
      updatePreferences({ theme: theme as "light" | "dark" | "system" });
    }
  }, [theme]);

  const cycleTheme = () => {
    const themes = ["light", "dark", "system"] as const;
    const currentIndex = themes.indexOf(theme as typeof themes[number]);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-5 w-5" />;
      case "dark":
        return <Moon className="h-5 w-5" />;
      case "system":
        return <Monitor className="h-5 w-5" />;
      default:
        return <Sun className="h-5 w-5" />;
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label="Alternar tema"
      title={`Tema atual: ${theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema"}`}
    >
      {getIcon()}
    </Button>
  );
};
