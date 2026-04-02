export type WebchatThemePreference = "system" | "light" | "dark";
export type WebchatResolvedTheme = "light" | "dark";

const WEBCHAT_THEME_STORAGE_KEY = "mugallim-webchat-theme";

function isThemePreference(value: string | null): value is WebchatThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function loadWebchatThemePreference(): WebchatThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedValue = window.localStorage.getItem(WEBCHAT_THEME_STORAGE_KEY);
  return isThemePreference(storedValue) ? storedValue : "system";
}

export function saveWebchatThemePreference(themePreference: WebchatThemePreference): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WEBCHAT_THEME_STORAGE_KEY, themePreference);
}

export function resolveWebchatTheme(
  themePreference: WebchatThemePreference,
  systemPrefersDark: boolean,
): WebchatResolvedTheme {
  if (themePreference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return themePreference;
}
