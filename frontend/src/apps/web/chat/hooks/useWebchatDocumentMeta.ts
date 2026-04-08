import { useEffect } from "react";

import type { WebchatResolvedTheme } from "../utils/theme";

interface UseWebchatDocumentMetaOptions {
  conversationTitle?: string | null;
  resolvedTheme: WebchatResolvedTheme;
  appTitle?: string;
}

export default function useWebchatDocumentMeta({
  conversationTitle,
  resolvedTheme,
  appTitle = "Mugallim AI",
}: UseWebchatDocumentMetaOptions) {
  useEffect(() => {
    const title = conversationTitle?.trim();
    document.title = title ? `${title} — ${appTitle}` : appTitle;
  }, [appTitle, conversationTitle]);

  useEffect(() => {
    const previousColorScheme = document.documentElement.style.colorScheme;
    document.documentElement.style.colorScheme = resolvedTheme;

    return () => {
      document.documentElement.style.colorScheme = previousColorScheme;
    };
  }, [resolvedTheme]);

  useEffect(() => {
    return () => {
      document.title = appTitle;
    };
  }, [appTitle]);
}
