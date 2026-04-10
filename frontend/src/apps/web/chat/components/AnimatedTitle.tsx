import { useEffect, useRef, useState } from "react";

interface AnimatedTitleProps {
  title: string;
  /**
   * Increment this number to trigger the typing animation.
   * Any other title change (loading a conversation, switching chats) is shown instantly.
   */
  animationTrigger: number;
  className?: string;
}

export default function AnimatedTitle({ title, animationTrigger, className }: AnimatedTitleProps) {
  const [displayed, setDisplayed] = useState(title);
  const prevTriggerRef = useRef(animationTrigger);
  const intervalRef = useRef<number | null>(null);

  // When trigger increments → animate the new title character by character
  useEffect(() => {
    const triggered = animationTrigger !== prevTriggerRef.current;
    prevTriggerRef.current = animationTrigger;

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!triggered) {
      setDisplayed(title);
      return;
    }

    const chars = [...title];
    const speed = chars.length > 0 ? Math.min(35, Math.floor(700 / chars.length)) : 35;
    let i = 0;
    setDisplayed("");

    intervalRef.current = window.setInterval(() => {
      i++;
      setDisplayed(chars.slice(0, i).join(""));
      if (i >= chars.length) {
        window.clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, speed);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationTrigger]);

  // Keep display in sync when title changes without a trigger (snap)
  useEffect(() => {
    if (intervalRef.current !== null) return; // animation running, don't interrupt
    setDisplayed(title);
  }, [title]);

  return <span className={className}>{displayed}</span>;
}
