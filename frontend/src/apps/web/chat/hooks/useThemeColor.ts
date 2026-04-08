import { useEffect } from 'react';

import type { WebchatResolvedTheme } from '../utils/theme';

const THEME_COLORS: Record<WebchatResolvedTheme, string> = {
  dark: '#07101a',
  light: '#f7f9fc',
};

/**
 * Updates the <meta name="theme-color"> tag to match the app shell background
 * whenever the resolved theme changes. This keeps the browser chrome / status
 * bar colour in sync without requiring a page refresh.
 */
export function useThemeColor(resolvedTheme: WebchatResolvedTheme) {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLORS[resolvedTheme];
  }, [resolvedTheme]);
}
