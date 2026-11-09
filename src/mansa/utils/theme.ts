import { safeStorage } from "./storage";

export type AppTheme = "dark" | "light";

const THEME_STORAGE_KEY = "afhub-theme";
export const THEME_CHANGE_EVENT = "afhub-theme-changed";

export function getAppTheme(): AppTheme {
  return safeStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

export function setAppTheme(theme: AppTheme): void {
  safeStorage.setItem(THEME_STORAGE_KEY, theme);
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
  }
}
