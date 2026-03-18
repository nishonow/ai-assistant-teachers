import type { ChatMessage } from "./types";

interface ChatMessageListProps {
  messages: ChatMessage[];
  pending: boolean;
  error: string;
}

export default function ChatMessageList({ messages, pending, error }: ChatMessageListProps) {
  if (!messages.length) {
    return (
      <div className="grid flex-1 place-items-center p-6">
        <div className="max-w-md text-center">
          <h2 className="font-heading text-2xl text-slate-100">How can I help you today?</h2>
          <p className="mt-2 text-sm text-slate-400">Ask anything. This session is temporary and not saved yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-area flex-1 space-y-4 overflow-y-auto px-3 py-4 md:px-6">
      {messages.map((message) => (
        <article
          key={message.id}
          className={[
            "rounded-2xl border px-4 py-3 text-sm shadow-panel",
            message.role === "user"
              ? "ml-auto max-w-[86%] border-brand-400/35 bg-brand-500/15 text-slate-100 md:max-w-[52%]"
              : "mr-auto max-w-[94%] border-ink-600/80 bg-ink-800/75 text-slate-200 md:max-w-[78%]",
          ].join(" ")}
        >
          <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">{message.role === "user" ? "You" : "Assistant"}</p>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </article>
      ))}

      {pending ? (
        <div className="mr-auto max-w-3xl rounded-2xl border border-ink-600/80 bg-ink-800/75 px-4 py-3 text-sm text-slate-300">
          Assistant is thinking...
        </div>
      ) : null}

      {error ? (
        <div className="max-w-3xl rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}
    </div>
  );
}
