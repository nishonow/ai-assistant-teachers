import { useLayoutEffect } from "react";

import type { WebchatResolvedTheme } from "../utils/theme";

const THEME_COLORS: Record<WebchatResolvedTheme, string> = {
  dark: "#07101a",
  light: "#f7f9fc",
};

const DYNAMIC_THEME_META_ATTR = "data-webchat-theme-color";
const DYNAMIC_THEME_META_SELECTOR = `meta[name="theme-color"][${DYNAMIC_THEME_META_ATTR}="true"]`;
const APPLE_STATUS_BAR_META_SELECTOR = 'meta[name="apple-mobile-web-app-status-bar-style"]';
const UNDERLAY_CSS_VARIABLE = "--app-underlay-bg";

function upsertThemeColorMeta(): HTMLMetaElement {
  let dynamicThemeMeta = document.querySelector<HTMLMetaElement>(DYNAMIC_THEME_META_SELECTOR);
  if (dynamicThemeMeta) {
    return dynamicThemeMeta;
  }

  dynamicThemeMeta = document.createElement("meta");
  dynamicThemeMeta.name = "theme-color";
  dynamicThemeMeta.setAttribute(DYNAMIC_THEME_META_ATTR, "true");
  document.head.appendChild(dynamicThemeMeta);
  return dynamicThemeMeta;
}

function upsertAppleStatusBarMeta(): HTMLMetaElement {
  let statusBarMeta = document.querySelector<HTMLMetaElement>(APPLE_STATUS_BAR_META_SELECTOR);
  if (statusBarMeta) {
    return statusBarMeta;
  }

  statusBarMeta = document.createElement("meta");
  statusBarMeta.name = "apple-mobile-web-app-status-bar-style";
  document.head.appendChild(statusBarMeta);
  return statusBarMeta;
}

export function useThemeColor(resolvedTheme: WebchatResolvedTheme) {
  useLayoutEffect(() => {
    const color = THEME_COLORS[resolvedTheme];
    let rafId: number | null = null;
    let timeoutId: number | null = null;

    const applyThemeColor = () => {
      const allThemeMetas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
      const targets = allThemeMetas.length ? allThemeMetas : [upsertThemeColorMeta()];

      for (const themeMeta of targets) {
        themeMeta.setAttribute(DYNAMIC_THEME_META_ATTR, "true");
        themeMeta.removeAttribute("media");
        themeMeta.content = color;
        themeMeta.setAttribute("content", color);
      }

      // Keep page underlay and safe-area backing color in sync with the selected theme.
      document.documentElement.style.setProperty(UNDERLAY_CSS_VARIABLE, color);
      document.documentElement.style.setProperty("background-color", color, "important");
      document.body.style.setProperty("background-color", color, "important");

      const statusBarMeta = upsertAppleStatusBarMeta();
      statusBarMeta.content = resolvedTheme === "dark" ? "black-translucent" : "default";
    };

    const reapplyOnVisibility = () => {
      if (document.visibilityState === "visible") {
        applyThemeColor();
      }
    };

    applyThemeColor();
    // Some mobile browsers apply browser chrome color asynchronously.
    rafId = window.requestAnimationFrame(() => {
      applyThemeColor();
    });
    timeoutId = window.setTimeout(() => {
      applyThemeColor();
    }, 120);

    window.addEventListener("pageshow", applyThemeColor);
    window.addEventListener("focus", applyThemeColor);
    document.addEventListener("visibilitychange", reapplyOnVisibility);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener("pageshow", applyThemeColor);
      window.removeEventListener("focus", applyThemeColor);
      document.removeEventListener("visibilitychange", reapplyOnVisibility);
    };
  }, [resolvedTheme]);
}
