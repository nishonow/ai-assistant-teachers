import { BookOpenText, Download, FileText, X } from "lucide-react";
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
  loading,
  sources,
  onDownloadSource,
  showHeader,
}: SourcesContentProps) {
  return (
    <>
      {showHeader ? (
        <header className="flex h-[72px] flex-col justify-center border-b border-[#21384b] px-5">
          <h2 className="font-heading text-sm uppercase tracking-[0.15em] text-slate-300">{"Источники"}</h2>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate text-xs text-slate-500">{activeConversationTitle}</p>
            {loading ? (
              <span className="inline-flex shrink-0 animate-pulse items-center justify-center rounded-full border border-[#305169] bg-[#102033] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-brand-200">
                Подбираем
              </span>
            ) : sources.length ? (
              <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                {sources.length} {sources.length === 1 ? "файл" : "файла"}
              </span>
            ) : (
              <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-slate-500">Нет источников</span>
            )}
          </div>
        </header>
      ) : null}

      <div className="scroll-area min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3" role="status" aria-live="polite">
            {Array.from({ length: 3 }).map((_, index) => (
              <article
                key={index}
                className="chat-card-enter animate-pulse rounded-[26px] border border-[#284863] bg-[#0f1c2c] p-4"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-11 w-11 rounded-2xl bg-slate-700/70" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-[86%] rounded-full bg-slate-700/70" />
                        <div className="h-4 w-[64%] rounded-full bg-slate-700/60" />
                      </div>
                      <div className="h-7 w-14 rounded-full bg-slate-700/60" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-[48%] rounded-full bg-slate-800/70" />
                      <div className="h-3 w-[36%] rounded-full bg-slate-800/60" />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="h-3 w-[34%] rounded-full bg-slate-800/60" />
                      <div className="h-9 w-24 rounded-full bg-slate-700/60" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : sources.length ? (
          <div className="space-y-3">
            {sources.map((source, index) => (
              <article
                key={source.id}
                className="chat-card-enter rounded-[26px] border border-[#284863] bg-[#0d1827] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3a6988]"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-11 w-11 place-items-center rounded-2xl border border-[#305169] bg-[#102033] text-[#9af5ea]">
                    <FileText size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="group relative min-w-0 flex-1 rounded-lg transition-colors hover:bg-[#102033]">
                        <p
                          className="min-w-0 overflow-hidden rounded-lg px-2 py-1 text-sm font-semibold leading-6 text-slate-100"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {source.title}
                        </p>
                        <div className="pointer-events-none absolute left-0 right-0 top-full z-20 mt-2 hidden rounded-xl border border-[#325774] bg-[#102033] px-3 py-2 group-hover:block">
                          <p
                            className="text-xs leading-5 text-slate-200"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {source.title}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#305169] bg-[#102033] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9af5ea]">
                        {getSourceExtension(source.title)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">{"Указанный документ"}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs leading-5 text-slate-500">
                        {source.documentId ? `Документ #${source.documentId}` : "Прикреплённый источник"}
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-[#305169] bg-[#102033] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#15304a] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!activeConversationId || !source.documentId || downloadPendingId === source.id}
                        onClick={() => onDownloadSource(source)}
                      >
                        <Download size={14} />
                        {downloadPendingId === source.id ? "Скачивание..." : "Скачать"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[#2c4e67] bg-[#0c1726] px-4 py-5 text-sm leading-6 text-slate-400">
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
          "hidden flex-col overflow-hidden bg-[#09111d] transition-all duration-300 ease-out lg:flex",
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
          <button type="button" className="drawer-overlay-enter absolute inset-0 bg-black/62" onClick={onCloseMobile} aria-label={"Закрыть источники"} />

          <aside className="drawer-sheet-right drawer-sheet-surface absolute right-0 top-0 flex h-full w-[90vw] max-w-sm flex-col overflow-hidden rounded-l-[28px] border-l border-[#21384b]">
            <div className="flex h-[72px] items-center justify-between border-b border-[#21384b] bg-[#0a1624] px-4">
              <div className="flex items-center gap-2 text-slate-200">
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
