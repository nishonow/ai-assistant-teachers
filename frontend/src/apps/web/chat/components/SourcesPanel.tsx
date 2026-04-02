import { BookOpenText, Download, Eye, X } from "lucide-react";
import { useEffect } from "react";

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
  showHeader,
}: SourcesContentProps) {
  return (
    <>
      {showHeader ? (
        <header className="webchat-sources-header flex h-[62px] shrink-0 flex-col justify-center border-b border-slate-200 px-4 dark:border-[#21384b] md:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="webchat-sources-title font-heading text-sm uppercase tracking-[0.15em] text-slate-800 dark:text-slate-300">
              {"Источники"}
            </h2>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate text-xs text-slate-500 dark:text-slate-500">{activeConversationTitle}</p>
            {sources.length ? (
              <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                {sources.length} {sources.length === 1 ? "файл" : "файла"}
              </span>
            ) : (
              <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">Нет источников</span>
            )}
          </div>
        </header>
      ) : null}

      <div className="scroll-area min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 space-y-3">
        {sources.length ? (
          sources.map((source) => (
            <article
              key={source.id}
              className="webchat-source-card group flex flex-col gap-2 rounded-[16px] border border-slate-200 bg-white/80 p-3 transition-colors hover:bg-white dark:border-[#1e3448] dark:bg-[#0b1623]/50 dark:hover:border-[#2e4b62] dark:hover:bg-[#102033]"
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className="webchat-source-title text-sm font-medium leading-tight text-slate-800 dark:text-slate-200"
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
                <span className="webchat-source-extension shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:border-[#274158] dark:bg-[#1e3448]/80 dark:text-slate-400">
                  {getSourceExtension(source.title)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-end">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="webchat-source-download flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#294459] dark:bg-[#102033] dark:text-[#9af5ea] dark:hover:border-[#3d6888] dark:hover:bg-[#1a344d] dark:hover:text-white"
                    disabled={!activeConversationId || !source.documentId || viewPendingId === source.id}
                    onClick={() => onViewSource(source)}
                  >
                    <Eye size={12} />
                    {viewPendingId === source.id ? "Открытие..." : "Смотреть"}
                  </button>
                  <button
                    type="button"
                    className="webchat-source-download flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#294459] dark:bg-[#102033] dark:text-[#9af5ea] dark:hover:border-[#3d6888] dark:hover:bg-[#1a344d] dark:hover:text-white"
                    disabled={!activeConversationId || !source.documentId || downloadPendingId === source.id}
                    onClick={() => onDownloadSource(source)}
                  >
                    <Download size={12} />
                    {downloadPendingId === source.id ? "Скачивание..." : "Скачать"}
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="webchat-empty-state rounded-[16px] border border-dashed border-slate-300 bg-slate-50/50 px-4 py-5 text-sm leading-6 text-slate-500 dark:border-[#2c4e67] dark:bg-[#0c1726]/50 dark:text-slate-400">
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
  onCloseMobile,
}: SourcesPanelProps) {
  const { isVisible: mobileVisible, isClosing: mobileClosing } = useDrawerVisibility(mobileOpen);

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

  return (
    <>
      <aside
        className={[
          "webchat-sources-shell hidden flex-col overflow-hidden bg-slate-50 transition-all duration-300 ease-out dark:bg-[#09111d] lg:flex",
          desktopOpen
            ? "w-[320px] border-l border-slate-200 opacity-100 dark:border-[#21384b]"
            : "pointer-events-none w-0 border-l border-transparent opacity-0",
        ].join(" ")}
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
            showHeader
          />
        ) : null}
      </aside>

      {mobileVisible ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className={[mobileClosing ? "drawer-overlay-exit" : "drawer-overlay-enter", "absolute inset-0 bg-black/20 dark:bg-[#020508]/70"].join(" ")}
            onClick={onCloseMobile}
            aria-label={"Закрыть источники"}
          />

          <aside className={["webchat-sources-shell absolute right-0 top-0 flex h-full w-[90vw] max-w-sm flex-col overflow-hidden border-l border-slate-200 bg-white/90 backdrop-blur-2xl dark:border-[#1e3448]/60 dark:bg-[#08121c]/85", mobileClosing ? "drawer-sheet-right-exit" : "drawer-sheet-right"].join(" ")}>
            <div className="webchat-sources-mobile-header flex h-[62px] shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 pt-[env(safe-area-inset-top)] dark:border-[#1e3448]/50 dark:bg-[#0b1623]/60">
              <div className="webchat-sources-mobile-title flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <BookOpenText size={16} />
                <span className="text-sm font-semibold">{"Источники"}</span>
              </div>
              <button type="button" className="btn-muted p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" onClick={onCloseMobile} aria-label={"Закрыть панель источников"}>
                <X size={16} />
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