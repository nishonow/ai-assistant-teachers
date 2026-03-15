import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { NoticeState } from "../lib/types";

interface NoticeProps {
  notice: NoticeState | null;
}

export default function Notice({ notice }: NoticeProps) {
  if (!notice) return null;

  const success = notice.type === "success";

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
        success
          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
          : "border-rose-400/35 bg-rose-400/10 text-rose-200"
      }`}
    >
      {success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{notice.message}</span>
    </div>
  );
}
