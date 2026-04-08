import { useEffect } from "react";

import type { WebchatResolvedTheme } from "../utils/theme";

interface UseWebchatDocumentMetaOptions {
  conversationTitle?: string | null;
  resolvedTheme: WebchatResolvedTheme;
  appTitle?: string;
}

const PAGE_UNDERLAY_COLORS: Record<WebchatResolvedTheme, string> = {
  dark: "#07101a",
  light: "#f7f9fc",
};

const THEME_ATTRIBUTE_NAME = "data-webchat-theme";
const UNDERLAY_CSS_VARIABLE = "--app-underlay-bg";

export default function useWebchatDocumentMeta({
  conversationTitle,
  resolvedTheme,
  appTitle = "Mugallim AI",
}: UseWebchatDocumentMetaOptions) {
  useEffect(() => {
    const title = conversationTitle?.trim();
    document.title = title ? `${title} - ${appTitle}` : appTitle;
  }, [appTitle, conversationTitle]);

  useEffect(() => {
    const root = document.documentElement;
    const previousColorScheme = root.style.colorScheme;
    const previousUnderlayColor = root.style.getPropertyValue(UNDERLAY_CSS_VARIABLE);
    const previousThemeAttribute = root.getAttribute(THEME_ATTRIBUTE_NAME);

    root.style.colorScheme = resolvedTheme;
    root.style.setProperty(UNDERLAY_CSS_VARIABLE, PAGE_UNDERLAY_COLORS[resolvedTheme]);
    root.setAttribute(THEME_ATTRIBUTE_NAME, resolvedTheme);

    return () => {
      root.style.colorScheme = previousColorScheme;

      if (previousUnderlayColor) {
        root.style.setProperty(UNDERLAY_CSS_VARIABLE, previousUnderlayColor);
      } else {
        root.style.removeProperty(UNDERLAY_CSS_VARIABLE);
      }

      if (previousThemeAttribute === null) {
        root.removeAttribute(THEME_ATTRIBUTE_NAME);
      } else {
        root.setAttribute(THEME_ATTRIBUTE_NAME, previousThemeAttribute);
      }
    };
  }, [resolvedTheme]);

  useEffect(() => {
    return () => {
      document.title = appTitle;
    };
  }, [appTitle]);
}
