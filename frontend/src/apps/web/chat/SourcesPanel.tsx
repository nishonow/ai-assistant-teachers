import { BookOpenText, FileText, X } from "lucide-react";

import type { ChatSource } from "./types";

interface SourcesPanelProps {
  activeConversationTitle: string;
  mobileOpen: boolean;
  sources: ChatSource[];
  onCloseMobile: () => void;
}

interface SourcesContentProps {
  activeConversationTitle: string;
  sources: ChatSource[];
  showHeader: boolean;
}

function SourcesContent({ activeConversationTitle, sources, showHeader }: SourcesContentProps) {
  return (
    <>
      {showHeader ? (
        <header className="flex h-[72px] flex-col justify-center border-b border-[#21384b] px-5">
          <h2 className="font-heading text-sm uppercase tracking-[0.15em] text-slate-300">Sources</h2>
          <p className="mt-1 truncate text-xs text-slate-500">{activeConversationTitle}</p>
        </header>
      ) : null}

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-4">
        {sources.length ? (
          <div className="space-y-3">
            {sources.map((source) => (
              <article key={source.id} className="rounded-2xl border border-[#284863] bg-[#0d1827] p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl border border-[#305169] bg-[#122235] text-[#9af5ea]">
                    <FileText size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{source.title}</p>
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

export default function SourcesPanel({ activeConversationTitle, mobileOpen, sources, onCloseMobile }: SourcesPanelProps) {
  return (
    <>
      <aside className="hidden w-[320px] flex-col border-l border-[#21384b] bg-[#09111d] lg:flex">
        <SourcesContent activeConversationTitle={activeConversationTitle} sources={sources} showHeader />
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
            <SourcesContent activeConversationTitle={activeConversationTitle} sources={sources} showHeader={false} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
