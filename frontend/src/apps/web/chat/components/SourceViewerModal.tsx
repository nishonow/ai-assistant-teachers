import { Download, ExternalLink, Loader2, X } from "lucide-react";

import useDismissibleLayer from "../hooks/useDismissibleLayer";
import type { WebchatResolvedTheme } from "../utils/theme";
import type { ChatSource } from "../utils/types";

interface SourceViewerModalProps {
  open: boolean;
  source: ChatSource | null;
  sourceUrl: string | null;
  loading: boolean;
  error: string | null;
  resolvedTheme: WebchatResolvedTheme;
  onClose: () => void;
  onDownload: (source: ChatSource) => void;
}

export default function SourceViewerModal({
  open,
  source,
  sourceUrl,
  loading,
  error,
  resolvedTheme,
  onClose,
  onDownload,
}: SourceViewerModalProps) {
  const modalRef = useDismissibleLayer<HTMLDivElement>({
    open,
    onDismiss: onClose,
    disabled: loading,
  });

  if (!open || !source) return null;

  const isLight = resolvedTheme === "light";
  const page = source.pageNumber && source.pageNumber > 0 ? source.pageNumber : 1;
  const pdfUrl = sourceUrl ? `${sourceUrl}#page=${page}&view=FitH` : null;
  const supportsInlineView = Boolean(pdfUrl);

  return (
    <div className={[
      "fixed inset-0 z-[70] p-2 backdrop-blur-sm sm:p-4",
      isLight ? "bg-slate-900/20" : "bg-slate-900/50",
    ].join(" ")}>
      <div
        ref={modalRef}
        className={[
          "mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-xl",
          isLight ? "border-slate-300/80 bg-white" : "border-[#264159] bg-[#07111b]",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
      >
        <header
          className={[
            "flex items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4 sm:py-3",
            isLight ? "border-slate-200 bg-slate-50" : "border-[#1f364a] bg-[#0b1623]",
          ].join(" ")}
        >
          <div className="min-w-0">
            <p className={["truncate text-sm font-semibold", isLight ? "text-slate-800" : "text-slate-100"].join(" ")} title={source.title}>
              {source.title}
            </p>
            <p className={["text-[11px]", isLight ? "text-slate-500" : "text-slate-400"].join(" ")}>
              {source.documentId ? `Документ #${source.documentId}` : "Источник"}
              {source.pageNumber ? ` · Страница ${source.pageNumber}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={[
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                isLight
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  : "border-[#2e4a61] bg-[#102033] text-slate-200 hover:bg-[#18344f]",
              ].join(" ")}
              onClick={() => onDownload(source)}
            >
              <Download size={13} />
              Скачать
            </button>
            <button
              type="button"
              className={[
                "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                isLight
                  ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  : "border-[#2e4a61] bg-[#102033] text-slate-300 hover:bg-[#18344f] hover:text-white",
              ].join(" ")}
              aria-label="Закрыть просмотр источника"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className={["relative min-h-0 flex-1", isLight ? "bg-slate-100" : "bg-[#050d16]"].join(" ")}>
          {loading ? (
            <div className={["flex h-full items-center justify-center gap-2 text-sm", isLight ? "text-slate-600" : "text-slate-300"].join(" ")}>
              <Loader2 size={18} className="animate-spin" />
              Загружаем источник...
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className={["max-w-md text-sm", isLight ? "text-rose-600" : "text-rose-300"].join(" ")}>{error}</p>
            </div>
          ) : null}

          {!loading && !error && !supportsInlineView ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className={["max-w-md text-sm", isLight ? "text-slate-600" : "text-slate-300"].join(" ")}>
                Предпросмотр доступен только для PDF. Этот источник можно скачать и открыть отдельно.
              </p>
              <button
                type="button"
                className={[
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  isLight
                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    : "border-[#2e4a61] bg-[#102033] text-slate-200 hover:bg-[#18344f]",
                ].join(" ")}
                onClick={() => onDownload(source)}
              >
                <ExternalLink size={13} />
                Скачать источник
              </button>
            </div>
          ) : null}

          {!loading && !error && supportsInlineView && pdfUrl ? (
            <iframe
              title={`Предпросмотр: ${source.title}`}
              src={pdfUrl}
              className="h-full w-full border-0"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
