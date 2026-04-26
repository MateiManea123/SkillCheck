import { createContext } from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
}

export const THEME_KEY = "skillcheck.theme.v1";

export const ThemeContext = createContext<ThemeContextValue | null>(null);
