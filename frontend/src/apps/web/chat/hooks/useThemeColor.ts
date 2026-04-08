import { useEffect } from "react";

import type { WebchatResolvedTheme } from "../utils/theme";

const THEME_COLORS: Record<WebchatResolvedTheme, string> = {
  dark: "#07101a",
  light: "#f7f9fc",
};

const DYNAMIC_THEME_META_ATTR = "data-webchat-theme-color";
const DYNAMIC_THEME_META_SELECTOR = `meta[name="theme-color"][${DYNAMIC_THEME_META_ATTR}="true"]`;
const APPLE_STATUS_BAR_META_SELECTOR = 'meta[name="apple-mobile-web-app-status-bar-style"]';

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
  useEffect(() => {
    const color = THEME_COLORS[resolvedTheme];

    const dynamicThemeMeta = upsertThemeColorMeta();
    // Some mobile browsers keep the initial media-filtered value cached. Explicitly clear media to force live updates.
    dynamicThemeMeta.removeAttribute("media");
    dynamicThemeMeta.content = color;

    const statusBarMeta = upsertAppleStatusBarMeta();
    statusBarMeta.content = resolvedTheme === "dark" ? "black-translucent" : "default";
  }, [resolvedTheme]);
}
