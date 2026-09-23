import { useEffect } from "react";

/**
 * SVG displacement filter that gives glass surfaces real refraction: the
 * backdrop behind a panel is bent, not just blurred. Only Chromium applies an
 * SVG filter to a backdrop, so the `lg-refract` class gates it; everything else
 * keeps the plain frosted blur.
 */
export default function LiquidGlassFilter() {
  useEffect(() => {
    const ua = navigator.userAgent;
    const isChromium = /Chrome\/|Edg\//.test(ua) && !/Firefox/.test(ua);
    if (isChromium && !window.matchMedia?.("(prefers-reduced-transparency: reduce)").matches) {
      document.documentElement.classList.add("lg-refract");
    }
  }, []);

  return (
    <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0 }}>
      <filter id="lg-refract" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.01" numOctaves="2" seed="11" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
        <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="38" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
