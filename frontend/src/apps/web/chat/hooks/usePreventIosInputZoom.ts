import { useEffect } from 'react';

/**
 * Prevents iOS Safari from auto-zooming when the user taps an input, even when
 * the page is already zoomed out below 100%.
 *
 * Strategy: pin maximum-scale=1 on touchstart (before iOS decides to zoom) and
 * keep it while the input is focused. Remove it 300 ms after blur so the user
 * can still pinch-zoom between typing sessions.
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

    const isInputTarget = (target: EventTarget | null): boolean => {
      const tag = (target as HTMLElement | null)?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    // touchstart fires before iOS initiates zoom — lock here for best timing
    const onTouchStart = (e: TouchEvent) => {
      if (isInputTarget(e.target)) lock();
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isInputTarget(e.target)) lock();
    };

    const onFocusOut = (e: FocusEvent) => {
      if (isInputTarget(e.target)) unlock();
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      if (blurTimer !== null) clearTimeout(blurTimer);
    };
  }, []);
}
