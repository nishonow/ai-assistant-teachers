import { useEffect } from 'react';

import type { WebchatResolvedTheme } from '../utils/theme';

const THEME_COLORS: Record<WebchatResolvedTheme, string> = {
  dark: '#07101a',
  light: '#f7f9fc',
};


export function useThemeColor(resolvedTheme: WebchatResolvedTheme) {
  useEffect(() => {
    const lightMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"][media="(prefers-color-scheme: light)"]',
    );
    const darkMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]',
    );

    const color = THEME_COLORS[resolvedTheme];

    // Override both tags to the chosen colour so the browser picks the right
    // one regardless of which media query currently matches.
    if (lightMeta) lightMeta.content = color;
    if (darkMeta) darkMeta.content = color;

    // Fallback: if tags are missing (shouldn't happen), create a plain one.
    if (!lightMeta && !darkMeta) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = color;
      document.head.appendChild(meta);
    }
  }, [resolvedTheme]);
}
