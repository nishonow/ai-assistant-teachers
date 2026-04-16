import { useEffect, useRef } from "react";

import type { WebchatResolvedTheme } from "../utils/theme";

interface UseWebchatDocumentMetaOptions {
  conversationTitle?: string | null;
  resolvedTheme: WebchatResolvedTheme;
  appTitle?: string;
  preservePreviousConversationTitle?: boolean;
}

const PAGE_UNDERLAY_COLORS: Record<WebchatResolvedTheme, string> = {
  dark: "#07101a",
  light: "#f7f9fc",
};

const THEME_ATTRIBUTE_NAME = "data-webchat-theme";
const UNDERLAY_CSS_VARIABLE = "--app-underlay-bg";

function normalizeConversationTitle(rawTitle: string | null | undefined): string | null {
  if (!rawTitle) return null;

  const collapsed = rawTitle.replace(/\s+/g, " ").trim();
  return collapsed || null;
}

export default function useWebchatDocumentMeta({
  conversationTitle,
  resolvedTheme,
  appTitle = "Mektep AI",
  preservePreviousConversationTitle = false,
}: UseWebchatDocumentMetaOptions) {
  const lastConversationTitleRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedTitle = normalizeConversationTitle(conversationTitle);

    if (normalizedTitle) {
      lastConversationTitleRef.current = normalizedTitle;
    }

    const effectiveTitle =
      normalizedTitle || (preservePreviousConversationTitle ? lastConversationTitleRef.current : null);

    document.title = effectiveTitle ? `${effectiveTitle} - ${appTitle}` : appTitle;
  }, [appTitle, conversationTitle, preservePreviousConversationTitle]);

  useEffect(() => {
    const root = document.documentElement;
    const underlayColor = PAGE_UNDERLAY_COLORS[resolvedTheme];

    root.style.colorScheme = resolvedTheme;
    root.style.setProperty(UNDERLAY_CSS_VARIABLE, underlayColor);
    root.style.setProperty("background-color", underlayColor, "important");
    document.body.style.setProperty("background-color", underlayColor, "important");
    root.setAttribute(THEME_ATTRIBUTE_NAME, resolvedTheme);
  }, [resolvedTheme]);

}
