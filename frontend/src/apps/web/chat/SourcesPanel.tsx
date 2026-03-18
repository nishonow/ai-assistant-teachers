import { BookOpenText, X } from "lucide-react";

interface SourcesPanelProps {
  activeConversationTitle: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const PLACEHOLDER_SOURCES = [
  { id: "s1", title: "Lesson plan PDF", snippet: "Relevant excerpt from uploaded teaching materials." },
  { id: "s2", title: "Policy note", snippet: "Reference section preview can be shown here." },
  { id: "s3", title: "Knowledge chunk", snippet: "This panel is currently visual-only for source previews." },
];

function SourcesContent({ activeConversationTitle }: { activeConversationTitle: string }) {
  return (
    <>
      <header className="border-b border-ink-700/70 px-4 py-3">
        <h2 className="font-heading text-sm uppercase tracking-[0.15em] text-slate-300">Sources</h2>
        <p className="mt-1 truncate text-xs text-slate-500">{activeConversationTitle}</p>
      </header>

      <div className="scroll-area min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {PLACEHOLDER_SOURCES.map((source) => (
          <article key={source.id} className="rounded-xl border border-ink-700/80 bg-ink-800/70 p-3">
            <p className="text-sm font-semibold text-slate-100">{source.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{source.snippet}</p>
          </article>
        ))}
      </div>
    </>
  );
}

export default function SourcesPanel({ activeConversationTitle, mobileOpen, onCloseMobile }: SourcesPanelProps) {
  return (
    <>
      <aside className="hidden w-80 flex-col border-l border-ink-700/70 bg-ink-900/55 lg:flex">
        <SourcesContent activeConversationTitle={activeConversationTitle} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink-950/80" onClick={onCloseMobile} aria-label="Close sources" />

          <aside className="absolute right-0 top-0 flex h-full w-[90vw] max-w-sm flex-col border-l border-ink-700/70 bg-ink-900 shadow-panel">
            <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-200">
                <BookOpenText size={16} />
                <span className="text-sm font-semibold">Sources</span>
              </div>
              <button type="button" className="btn-muted p-2" onClick={onCloseMobile} aria-label="Close sources panel">
                <X size={16} />
              </button>
            </div>
            <SourcesContent activeConversationTitle={activeConversationTitle} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

