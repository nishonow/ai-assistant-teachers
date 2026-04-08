import { useEffect } from "react";

import type { WebchatResolvedTheme } from "../utils/theme";

const THEME_COLORS: Record<WebchatResolvedTheme, string> = {
  dark: "#07101a",
  light: "#f7f9fc",
};

const THEME_COLOR_META_SELECTOR = 'meta[name="theme-color"]';
const DYNAMIC_THEME_META_ATTR = "data-webchat-theme-color";
const DYNAMIC_THEME_META_SELECTOR = `meta[name="theme-color"][${DYNAMIC_THEME_META_ATTR}="true"]`;

export function useThemeColor(resolvedTheme: WebchatResolvedTheme) {
  useEffect(() => {
    const color = THEME_COLORS[resolvedTheme];

    const themeColorMetas = Array.from(
      document.querySelectorAll<HTMLMetaElement>(THEME_COLOR_META_SELECTOR),
    );

    themeColorMetas.forEach((meta) => {
      meta.content = color;
    });

    let dynamicThemeMeta = document.querySelector<HTMLMetaElement>(DYNAMIC_THEME_META_SELECTOR);
    if (!dynamicThemeMeta) {
      dynamicThemeMeta = document.createElement("meta");
      dynamicThemeMeta.name = "theme-color";
      dynamicThemeMeta.setAttribute(DYNAMIC_THEME_META_ATTR, "true");
      document.head.appendChild(dynamicThemeMeta);
    }

    dynamicThemeMeta.content = color;
  }, [resolvedTheme]);
}
