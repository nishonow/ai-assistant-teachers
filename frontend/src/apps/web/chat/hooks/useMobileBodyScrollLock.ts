import { useEffect } from "react";

const DEFAULT_QUERY = "(max-width: 1023px)";

export default function useMobileBodyScrollLock(drawerOpen = false, mediaQuery = DEFAULT_QUERY) {
  useEffect(() => {
    if (!drawerOpen) return;
    if (!window.matchMedia(mediaQuery).matches) return;

    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      const y = Math.abs(parseInt(document.body.style.top || "0"));
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, y);
    };
  }, [drawerOpen, mediaQuery]);
}
