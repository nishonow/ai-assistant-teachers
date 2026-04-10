import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { NoticeState } from "../types";

interface ToastNoticeProps {
  notice: NoticeState | null;
  onDismiss?: () => void;
}

export default function ToastNotice({ notice, onDismiss }: ToastNoticeProps) {
  const [displayed, setDisplayed] = useState<NoticeState | null>(null);
  const [exiting, setExiting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const exitTimerRef = useRef<number | null>(null);

  // Detect mobile (below md = 768px)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (notice) {
      // New notice: cancel any in-progress exit, show immediately
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setExiting(false);
      setDisplayed(notice);
    } else if (displayed) {
      // Notice cleared: play exit animation then unmount
      setExiting(true);
      exitTimerRef.current = window.setTimeout(() => {
        setDisplayed(null);
        setExiting(false);
        exitTimerRef.current = null;
      }, 200);
    }

    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  if (!displayed) return null;

  const success = displayed.type === "success";
  const warning = displayed.type === "warning";

  const enterClass = isMobile ? "toast-enter-mobile" : "toast-enter-desktop";

  return (
    <div
      className={[
        "pointer-events-none fixed z-[80]",
        // Mobile: top, full width with side margins, away from keyboard/input
        "left-2 right-2 top-4",
        // Desktop: bottom-right, auto width
        "md:left-auto md:right-6 md:top-auto md:bottom-6 md:w-auto md:max-w-sm",
      ].join(" ")}
    >
      <div
        className={[
          "toast-notice-card pointer-events-auto flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-sm backdrop-blur-sm",
          exiting ? "toast-exit" : enterClass,
          success
            ? "border-emerald-400/35 bg-emerald-400/15 text-emerald-100"
            : warning
              ? "border-amber-400/35 bg-amber-400/15 text-amber-100"
              : "border-rose-400/35 bg-rose-500/15 text-rose-100",
        ].join(" ")}
      >
        {success ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
        )}
        <span className="flex-1">{displayed.message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-1 shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
