"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type Theme =
  | "light"
  | "dark"
  | "ocean-blue"
  | "forest-green"
  | "sunset"
  | "rose"
  | "midnight"
  | "lavender"
  | "charcoal"
  | "emerald";

export const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: "light", label: "Light", swatch: "#ffffff" },
  { id: "dark", label: "Dark", swatch: "#1f1f1f" },
  { id: "ocean-blue", label: "Ocean Blue", swatch: "#2563eb" },
  { id: "forest-green", label: "Forest Green", swatch: "#16a34a" },
  { id: "sunset", label: "Sunset", swatch: "#f97316" },
  { id: "rose", label: "Rose", swatch: "#e11d48" },
  { id: "midnight", label: "Midnight", swatch: "#0f172a" },
  { id: "lavender", label: "Lavender", swatch: "#a855f7" },
  { id: "charcoal", label: "Charcoal", swatch: "#404040" },
  { id: "emerald", label: "Emerald", swatch: "#10b981" },
];

const DARK_FEEL: readonly Theme[] = [
  "dark",
  "forest-green",
  "midnight",
  "charcoal",
];

type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isDarkFeel(theme: Theme): boolean {
  return DARK_FEEL.includes(theme);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (isDarkFeel(theme)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

const VALID_THEMES = new Set<string>(THEMES.map((t) => t.id));

function parseTheme(value: string | null): Theme {
  if (value && VALID_THEMES.has(value)) return value as Theme;
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const initial = parseTheme(localStorage.getItem("theme"));
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  const resolvedTheme: ResolvedTheme = isDarkFeel(theme) ? "dark" : "light";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
