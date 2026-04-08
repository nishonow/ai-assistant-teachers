import { useEffect } from 'react';

export function useVisualViewport(onResize: (keyboardHeight: number) => void) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
      onResize(Math.max(0, keyboardHeight));
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, [onResize]);
}
