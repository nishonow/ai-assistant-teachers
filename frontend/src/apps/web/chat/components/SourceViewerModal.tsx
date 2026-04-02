import { Download, ExternalLink, Loader2, X } from "lucide-react";

import useDismissibleLayer from "../hooks/useDismissibleLayer";
import type { ChatSource } from "../utils/types";

interface SourceViewerModalProps {
  open: boolean;
  source: ChatSource | null;
  sourceUrl: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onDownload: (source: ChatSource) => void;
}

export default function SourceViewerModal({
  open,
  source,
  sourceUrl,
  loading,
  error,
  onClose,
  onDownload,
}: SourceViewerModalProps) {
  const modalRef = useDismissibleLayer<HTMLDivElement>({
    open,
    onDismiss: onClose,
    disabled: loading,
  });

  if (!open || !source) return null;

  const page = source.pageNumber && source.pageNumber > 0 ? source.pageNumber : 1;
  const pdfUrl = sourceUrl ? `${sourceUrl}#page=${page}&view=FitH` : null;
  const supportsInlineView = Boolean(pdfUrl);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 p-2 backdrop-blur-sm sm:p-4">
      <div
        ref={modalRef}
        className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-xl dark:border-[#264159] dark:bg-[#07111b]"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-[#1f364a] dark:bg-[#0b1623] sm:px-4 sm:py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={source.title}>
              {source.title}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {source.documentId ? `Документ #${source.documentId}` : "Источник"}
              {source.pageNumber ? ` · Страница ${source.pageNumber}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-[#2e4a61] dark:bg-[#102033] dark:text-slate-200 dark:hover:bg-[#18344f]"
              onClick={() => onDownload(source)}
            >
              <Download size={13} />
              Скачать
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-[#2e4a61] dark:bg-[#102033] dark:text-slate-300 dark:hover:bg-[#18344f] dark:hover:text-white"
              aria-label="Закрыть просмотр источника"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-slate-100 dark:bg-[#050d16]">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 size={18} className="animate-spin" />
              Загружаем источник...
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="max-w-md text-sm text-rose-600 dark:text-rose-300">{error}</p>
            </div>
          ) : null}

          {!loading && !error && !supportsInlineView ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
                Предпросмотр доступен только для PDF. Этот источник можно скачать и открыть отдельно.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-[#2e4a61] dark:bg-[#102033] dark:text-slate-200 dark:hover:bg-[#18344f]"
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
