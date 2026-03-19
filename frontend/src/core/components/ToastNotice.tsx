import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { NoticeState } from "../types";

interface ToastNoticeProps {
  notice: NoticeState | null;
}

export default function ToastNotice({ notice }: ToastNoticeProps) {
  if (!notice) return null;

  const success = notice.type === "success";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] w-[calc(100vw-2rem)] max-w-sm md:bottom-6 md:right-6">
      <div
        className={[
          "chat-card-enter pointer-events-auto flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-sm backdrop-blur-sm",
          success
            ? "border-emerald-400/35 bg-emerald-400/15 text-emerald-100"
            : "border-rose-400/35 bg-rose-500/15 text-rose-100",
        ].join(" ")}
      >
        {success ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
        <span>{notice.message}</span>
      </div>
    </div>
  );
}
