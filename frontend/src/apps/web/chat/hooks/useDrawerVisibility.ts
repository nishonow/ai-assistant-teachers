import { useEffect, useState } from "react";

const DEFAULT_DRAWER_EXIT_MS = 210;

export default function useDrawerVisibility(open: boolean, exitMs = DEFAULT_DRAWER_EXIT_MS) {
  const [isVisible, setIsVisible] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
      return;
    }

    if (!isVisible) return;

    setIsClosing(true);
    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, exitMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, isVisible, exitMs]);

  return { isVisible, isClosing };
}
