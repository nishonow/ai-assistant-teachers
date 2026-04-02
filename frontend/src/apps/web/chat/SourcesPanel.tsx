import { BookOpenText, Download, X } from "lucide-react";
import { useEffect } from "react";

import type { ChatSource } from "./types";

interface SourcesPanelProps {
  activeConversationId: string | null;
  activeConversationTitle: string;
  downloadPendingId: string | null;
  loading: boolean;
  desktopOpen: boolean;
  mobileOpen: boolean;
  sources: ChatSource[];
  onDownloadSource: (source: ChatSource) => void;
  onCloseMobile: () => void;
}

interface SourcesContentProps {
  activeConversationId: string | null;
  activeConversationTitle: string;
  downloadPendingId: string | null;
  loading: boolean;
  sources: ChatSource[];
  onDownloadSource: (source: ChatSource) => void;
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
  sources,
  onDownloadSource,
  showHeader,
}: SourcesContentProps) {
  return (
    <>
      {showHeader ? (
        <header className="webchat-sources-header flex h-[62px] shrink-0 flex-col justify-center border-b border-[#21384b] px-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="webchat-sources-title font-heading text-sm uppercase tracking-[0.15em] text-slate-300">
              {"Источники"}
            </h2>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate text-xs text-slate-500">{activeConversationTitle}</p>
            {sources.length ? (
              <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                {sources.length} {sources.length === 1 ? "файл" : "файла"}
              </span>
            ) : (
              <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-slate-500">Нет источников</span>
            )}
          </div>
        </header>
      ) : null}

      <div className="scroll-area min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 space-y-3">
        {sources.length ? (
          sources.map((source) => (
            <article
              key={source.id}
              className="group flex flex-col gap-2 rounded-[16px] border border-[#1e3448] bg-[#0b1623]/50 p-3 transition-colors hover:bg-[#102033]"
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className="text-sm text-slate-200 leading-tight"
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
                <span className="shrink-0 rounded bg-[#1e3448]/80 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                  {getSourceExtension(source.title)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-500">
                  {source.documentId ? `Документ #${source.documentId}` : "Файл"}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded bg-[#102033] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.05em] text-[#9af5ea] transition-colors hover:bg-[#1a344d] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!activeConversationId || !source.documentId || downloadPendingId === source.id}
                  onClick={() => onDownloadSource(source)}
                >
                  <Download size={12} />
                  {downloadPendingId === source.id ? "Скачивание..." : "Скачать"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="webchat-empty-state rounded-[16px] border border-dashed border-[#2c4e67] bg-[#0c1726]/50 px-4 py-5 text-sm leading-6 text-slate-400">
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
  loading,
  desktopOpen,
  mobileOpen,
  sources,
  onDownloadSource,
  onCloseMobile,
}: SourcesPanelProps) {
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
          "webchat-sources-shell hidden flex-col overflow-hidden bg-[#09111d] transition-all duration-300 ease-out lg:flex",
          desktopOpen
            ? "w-[320px] border-l border-[#21384b] opacity-100"
            : "w-0 border-l border-transparent opacity-0 pointer-events-none",
        ].join(" ")}
      >
        {desktopOpen ? (
          <SourcesContent
            activeConversationId={activeConversationId}
            activeConversationTitle={activeConversationTitle}
            downloadPendingId={downloadPendingId}
            loading={loading}
            sources={sources}
            onDownloadSource={onDownloadSource}
            showHeader
          />
        ) : null}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="drawer-overlay-enter absolute inset-0 bg-[#020508]/70" onClick={onCloseMobile} aria-label={"Закрыть источники"} />

          <aside className="webchat-sources-shell drawer-sheet-right absolute right-0 top-0 flex h-full w-[90vw] max-w-sm flex-col overflow-hidden rounded-l-[32px] border-l border-[#1e3448]/60 bg-[#08121c]/85 backdrop-blur-2xl">
            <div className="webchat-sources-mobile-header flex h-[62px] shrink-0 items-center justify-between border-b border-[#1e3448]/50 bg-[#0b1623]/60 px-4 pt-[env(safe-area-inset-top)]">
              <div className="webchat-sources-mobile-title flex items-center gap-2 text-slate-200">
                <BookOpenText size={16} />
                <span className="text-sm font-semibold">{"Источники"}</span>
              </div>
              <button type="button" className="btn-muted p-2" onClick={onCloseMobile} aria-label={"Закрыть панель источников"}>
                <X size={16} />
              </button>
            </div>
            <SourcesContent
              activeConversationId={activeConversationId}
              activeConversationTitle={activeConversationTitle}
              downloadPendingId={downloadPendingId}
              loading={loading}
              sources={sources}
              onDownloadSource={onDownloadSource}
              showHeader={false}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
