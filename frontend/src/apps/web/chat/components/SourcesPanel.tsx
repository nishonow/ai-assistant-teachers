import { BookOpenText, Download, Eye, FileText, X } from "lucide-react";
import { useEffect, useRef } from "react";

import type { ChatSource } from "../utils/types";
import useDrawerVisibility from "../hooks/useDrawerVisibility";

interface SourcesPanelProps {
  activeConversationId: string | null;
  activeConversationTitle: string;
  downloadPendingId: string | null;
  viewPendingId: string | null;
  loading: boolean;
  desktopOpen: boolean;
  mobileOpen: boolean;
  sources: ChatSource[];
  onDownloadSource: (source: ChatSource) => void;
  onViewSource: (source: ChatSource) => void;
  onCloseDesktop: () => void;
  onCloseMobile: () => void;
}

interface SourcesContentProps {
  activeConversationId: string | null;
  activeConversationTitle: string;
  downloadPendingId: string | null;
  viewPendingId: string | null;
  sources: ChatSource[];
  onDownloadSource: (source: ChatSource) => void;
  onViewSource: (source: ChatSource) => void;
  onClose?: () => void;
  showHeader: boolean;
}

function getSourceExtension(title: string): string {
  const extension = title.split(".").pop()?.trim().toUpperCase();
  return extension && extension.length <= 5 ? extension : "ФАЙЛ";
}

function SourcesContent({
  activeConversationId,
  activeConversationTitle,
  downloadPendingId,
  viewPendingId,
  sources,
  onDownloadSource,
  onViewSource,
  onClose,
  showHeader,
}: SourcesContentProps) {
  return (
    <>
      {showHeader ? (
        <header className="webchat-sources-header flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <h2 className="webchat-sources-title wc-text text-base font-semibold">Источники</h2>
            <p className="wc-muted mt-0.5 truncate text-xs">
              {sources.length
                ? `${sources.length} ${sources.length === 1 ? "документ" : sources.length < 5 ? "документа" : "документов"} · ${activeConversationTitle}`
                : activeConversationTitle}
            </p>
          </div>
          {onClose ? (
            <button
              type="button"
              className="wc-icon-btn -mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              onClick={onClose}
              aria-label="Скрыть источники"
            >
              <X size={16} />
            </button>
          ) : null}
        </header>
      ) : null}

      <div className="scroll-area min-h-0 flex-1 space-y-2.5 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-1">
        {sources.length ? (
          sources.map((source) => (
            <article key={source.id} className="webchat-source-card group flex flex-col gap-3 rounded-[22px] p-3.5">
              <div className="flex items-start gap-3">
                <span className="webchat-source-extension flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-[9px] font-bold uppercase tracking-wide">
                  <FileText size={15} className="mb-0.5 opacity-70" />
                  {getSourceExtension(source.title)}
                </span>
                <p
                  className="webchat-source-title wc-text min-w-0 flex-1 text-sm font-medium leading-snug"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={source.title}
                >
                  {source.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="webchat-source-download flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!activeConversationId || !source.documentId || viewPendingId === source.id}
                  onClick={() => onViewSource(source)}
                >
                  <Eye size={13} />
                  {viewPendingId === source.id ? (
                    "Открытие…"
                  ) : (
                    <>
                      <span className="hidden lg:inline">Смотреть</span>
                      <span className="lg:hidden">Смотреть (ПК)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="webchat-source-download flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!activeConversationId || !source.documentId || downloadPendingId === source.id}
                  onClick={() => onDownloadSource(source)}
                >
                  <Download size={13} />
                  {downloadPendingId === source.id ? "Скачивание…" : "Скачать"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="webchat-empty-state flex flex-col items-center rounded-[22px] px-5 py-8 text-center text-sm leading-6">
            <BookOpenText size={22} className="wc-subtle mb-3" />
            Источники появятся после ответа ассистента, если в нём есть ссылки на документы.
          </div>
        )}
      </div>
    </>
  );
}

export default function SourcesPanel({
  activeConversationId,
  activeConversationTitle,
  downloadPendingId,
  viewPendingId,
  loading: _loading,
  desktopOpen,
  mobileOpen,
  sources,
  onDownloadSource,
  onViewSource,
  onCloseDesktop,
  onCloseMobile,
}: SourcesPanelProps) {
  const { isVisible: mobileVisible, isClosing: mobileClosing } = useDrawerVisibility(mobileOpen);
  const mobileDrawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseMobile();
      }
    }

    if (!mobileOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = mobileDrawerRef.current;
    if (!drawer) return;
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();
  }, [mobileOpen]);

  return (
    <>
      <aside
        className={[
          "webchat-sources-shell hidden shrink-0 flex-col overflow-hidden rounded-[30px] transition-[width,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
          desktopOpen ? "w-[296px] translate-x-0 opacity-100" : "pointer-events-none !w-0 translate-x-6 !border-0 opacity-0",
        ].join(" ")}
        aria-hidden={!desktopOpen}
      >
        {desktopOpen ? (
          <SourcesContent
            activeConversationId={activeConversationId}
            activeConversationTitle={activeConversationTitle}
            downloadPendingId={downloadPendingId}
            viewPendingId={viewPendingId}
            sources={sources}
            onDownloadSource={onDownloadSource}
            onViewSource={onViewSource}
            onClose={onCloseDesktop}
            showHeader
          />
        ) : null}
      </aside>

      {mobileVisible ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            style={{ touchAction: 'manipulation' }}
            className={[mobileClosing ? "drawer-overlay-exit" : "drawer-overlay-enter", "absolute inset-0 bg-black/30 backdrop-blur-[3px]"].join(" ")}
            onClick={onCloseMobile}
            aria-label={"Закрыть источники"}
          />

          <aside
            ref={mobileDrawerRef}
            aria-modal="true"
            role="dialog"
            className={["webchat-sources-shell wc-glass-strong absolute bottom-2 right-2 top-[calc(0.5rem+env(safe-area-inset-top))] flex w-[88vw] max-w-sm flex-col overflow-hidden rounded-[30px] pb-[env(safe-area-inset-bottom)]", mobileClosing ? "drawer-sheet-right-exit" : "drawer-sheet-right"].join(" ")}
            style={{ willChange: 'transform', transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="webchat-sources-mobile-header flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
              <div className="webchat-sources-mobile-title wc-text flex items-center gap-2">
                <BookOpenText size={17} />
                <span className="text-base font-semibold">Источники</span>
                {sources.length ? <span className="wc-muted text-sm tabular-nums">{sources.length}</span> : null}
              </div>
              <button type="button" style={{ touchAction: 'manipulation' }} className="wc-icon-btn inline-flex h-10 w-10 items-center justify-center rounded-full" onClick={onCloseMobile} aria-label="Закрыть панель источников">
                <X size={18} />
              </button>
            </div>
            <SourcesContent
              activeConversationId={activeConversationId}
              activeConversationTitle={activeConversationTitle}
              downloadPendingId={downloadPendingId}
              viewPendingId={viewPendingId}
              sources={sources}
              onDownloadSource={onDownloadSource}
              onViewSource={onViewSource}
              showHeader={false}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}