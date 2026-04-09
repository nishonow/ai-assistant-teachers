import { useLayoutEffect } from "react";

import type { WebchatResolvedTheme } from "../utils/theme";

const THEME_COLORS: Record<WebchatResolvedTheme, string> = {
  dark: "#07101a",
  light: "#f7f9fc",
};

const DYNAMIC_THEME_META_ATTR = "data-webchat-theme-color";
const APPLE_STATUS_BAR_META_SELECTOR = 'meta[name="apple-mobile-web-app-status-bar-style"]';
const UNDERLAY_CSS_VARIABLE = "--app-underlay-bg";


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

    const insertFreshMeta = (): HTMLMetaElement => {
      // Remove all existing theme-color meta tags and insert a fresh one.
      // Safari on iOS only picks up theme-color changes when the tag is newly
      // added to the DOM — mutating the content attribute alone is often ignored.
      const existing = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
      for (const m of existing) m.parentNode?.removeChild(m);
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.setAttribute(DYNAMIC_THEME_META_ATTR, "true");
      meta.content = color;
      document.head.appendChild(meta);
      return meta;
    };

    const applyThemeColor = (fresh = false) => {
      // On subsequent calls (RAF / timeout) reuse the existing tag so we don't
      // keep thrashing the DOM, but still update content in case it drifted.
      let themeMeta = document.querySelector<HTMLMetaElement>(`meta[name="theme-color"][${DYNAMIC_THEME_META_ATTR}="true"]`);
      if (!themeMeta || fresh) {
        themeMeta = insertFreshMeta();
      } else {
        themeMeta.content = color;
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
        applyThemeColor(true);
      }
    };

    // First call: force-insert a fresh meta tag so Safari notices the change.
    applyThemeColor(true);
    // Some mobile browsers apply browser chrome color asynchronously.
    rafId = window.requestAnimationFrame(() => {
      applyThemeColor();
    });
    timeoutId = window.setTimeout(() => {
      applyThemeColor();
    }, 120);

    const onPageShow = () => applyThemeColor(true);
    const onFocus = () => applyThemeColor(true);

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", reapplyOnVisibility);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", reapplyOnVisibility);
    };
  }, [resolvedTheme]);
}
