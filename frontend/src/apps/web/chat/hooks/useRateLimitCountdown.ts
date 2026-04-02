import { useEffect, useState } from "react";

export default function useRateLimitCountdown(rateLimitUntil: number | null, onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!rateLimitUntil) {
      setSecondsLeft(0);
      return;
    }

    let expired = false;
    const tick = () => {
      const nextSeconds = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setSecondsLeft(nextSeconds);

      if (nextSeconds === 0 && !expired) {
        expired = true;
        onExpire();
      }
    };

    tick();
    const timerId = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [onExpire, rateLimitUntil]);

  return secondsLeft;
}
