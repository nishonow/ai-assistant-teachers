import { useEffect } from 'react';

/**
 * Temporarily pins maximum-scale=1 while an input/textarea is focused so iOS
 * Safari won't auto-zoom regardless of the current viewport zoom level.
 * The constraint is lifted 300 ms after blur so the user can still pinch-zoom
 * when they are not typing.
 */
export function usePreventIosInputZoom() {
  useEffect(() => {
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!viewport) return;

    const base = 'width=device-width, initial-scale=1, viewport-fit=cover';
    let blurTimer: ReturnType<typeof setTimeout> | null = null;

    const lock = () => {
      if (blurTimer !== null) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
      viewport.content = base + ', maximum-scale=1';
    };

    const unlock = () => {
      blurTimer = setTimeout(() => {
        viewport.content = base;
      }, 300);
    };

    const onFocusIn = (e: FocusEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        lock();
      }
    };

    const onFocusOut = (e: FocusEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        unlock();
      }
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      if (blurTimer !== null) clearTimeout(blurTimer);
    };
  }, []);
}
