import { BookOpenText, Download, FileText, X } from "lucide-react";

import type { ChatSource } from "./types";

interface SourcesPanelProps {
  activeConversationId: string | null;
  activeConversationTitle: string;
  downloadPendingId: string | null;
  mobileOpen: boolean;
  sources: ChatSource[];
  onDownloadSource: (source: ChatSource) => void;
  onCloseMobile: () => void;
}

interface SourcesContentProps {
  activeConversationId: string | null;
  activeConversationTitle: string;
  downloadPendingId: string | null;
  sources: ChatSource[];
  onDownloadSource: (source: ChatSource) => void;
  showHeader: boolean;
}

function getSourceExtension(title: string): string {
  const extension = title.split(".").pop()?.trim().toUpperCase();
  return extension && extension.length <= 5 ? extension : "FILE";
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
        <header className="flex h-[72px] flex-col justify-center border-b border-[#21384b] px-5">
          <h2 className="font-heading text-sm uppercase tracking-[0.15em] text-slate-300">Sources</h2>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate text-xs text-slate-500">{activeConversationTitle}</p>
            {sources.length ? <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-slate-500">{sources.length} file{sources.length > 1 ? "s" : ""}</span> : null}
          </div>
        </header>
      ) : null}

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-4">
        {sources.length ? (
          <div className="space-y-3">
            {sources.map((source) => (
              <article
                key={source.id}
                className="chat-card-enter rounded-3xl border border-[#284863] bg-[linear-gradient(180deg,_rgba(14,28,43,0.98)_0%,_rgba(10,21,34,0.98)_100%)] p-4 transition-colors hover:border-[#3a6988]"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-11 w-11 place-items-center rounded-2xl border border-[#305169] bg-[linear-gradient(180deg,_#14314a_0%,_#0f1d2d_100%)] text-[#9af5ea]">
                    <FileText size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className="min-w-0 flex-1 overflow-hidden text-sm font-semibold leading-6 text-slate-100"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                        title={source.title}
                      >
                        {source.title}
                      </p>
                      <span className="shrink-0 rounded-full border border-[#305169] bg-[#102033] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9af5ea]">
                        {getSourceExtension(source.title)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">Cited document</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs leading-5 text-slate-500">
                        {source.documentId ? `Document #${source.documentId}` : "Attached source"}
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-[#305169] bg-[#102033] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#15304a] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!activeConversationId || !source.documentId || downloadPendingId === source.id}
                        onClick={() => onDownloadSource(source)}
                      >
                        <Download size={14} />
                        {downloadPendingId === source.id ? "Downloading..." : "Download"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#284863] bg-[#0d1827]/70 p-4 text-sm leading-6 text-slate-400">
            Sources for the latest assistant answer will appear here.
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
  mobileOpen,
  sources,
  onDownloadSource,
  onCloseMobile,
}: SourcesPanelProps) {
  return (
    <>
      <aside className="hidden w-[320px] flex-col border-l border-[#21384b] bg-[#09111d] lg:flex">
        <SourcesContent
          activeConversationId={activeConversationId}
          activeConversationTitle={activeConversationTitle}
          downloadPendingId={downloadPendingId}
          sources={sources}
          onDownloadSource={onDownloadSource}
          showHeader
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={onCloseMobile} aria-label="Close sources" />

          <aside className="absolute right-0 top-0 flex h-full w-[90vw] max-w-sm flex-col border-l border-[#21384b] bg-[#09111d] shadow-panel">
            <div className="flex h-[72px] items-center justify-between border-b border-[#21384b] px-4">
              <div className="flex items-center gap-2 text-slate-200">
                <BookOpenText size={16} />
                <span className="text-sm font-semibold">Sources</span>
              </div>
              <button type="button" className="btn-muted p-2" onClick={onCloseMobile} aria-label="Close sources panel">
                <X size={16} />
              </button>
            </div>
            <SourcesContent
              activeConversationId={activeConversationId}
              activeConversationTitle={activeConversationTitle}
              downloadPendingId={downloadPendingId}
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
