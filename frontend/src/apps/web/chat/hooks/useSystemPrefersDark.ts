import { useEffect, useState } from "react";

const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";

export default function useSystemPrefersDark() {
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(DARK_THEME_QUERY).matches : true,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_THEME_QUERY);
    const handleThemeChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleThemeChange);
      return () => {
        mediaQuery.removeEventListener("change", handleThemeChange);
      };
    }

    mediaQuery.addListener(handleThemeChange);
    return () => {
      mediaQuery.removeListener(handleThemeChange);
    };
  }, []);

  return systemPrefersDark;
}
