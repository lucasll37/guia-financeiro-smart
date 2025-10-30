import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export const ThemeToggle = () => {
  const { preferences, updatePreferences } = useUserPreferences();

  useEffect(() => {
    // Aplicar tema ao montar o componente
    const applyTheme = (theme: "light" | "dark" | "system") => {
      if (theme === "system") {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.classList.toggle("dark", systemPrefersDark);
      } else {
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
    };

    applyTheme(preferences.theme);
  }, [preferences.theme]);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const newTheme = isDark ? "light" : "dark";
    updatePreferences({ theme: newTheme });
  };

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Alternar tema"
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
};
