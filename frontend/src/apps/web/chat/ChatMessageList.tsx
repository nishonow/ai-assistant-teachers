import { useEffect, useRef } from "react";

import AssistantMessageContent from "./AssistantMessageContent";
import type { ChatMessage } from "./types";

interface ChatMessageListProps {
  messages: ChatMessage[];
  pending: boolean;
  loading: boolean;
  error: string;
}

export default function ChatMessageList({ messages, pending, loading, error }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const previousLengthRef = useRef(0);
  const previousPendingRef = useRef(false);

  useEffect(() => {
    if (!messages.length && !pending) {
      previousLengthRef.current = 0;
      previousPendingRef.current = false;
      return;
    }

    const shouldSmooth = messages.length > previousLengthRef.current || (pending && !previousPendingRef.current);
    const behavior: ScrollBehavior = shouldSmooth ? "smooth" : "auto";

    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });

    previousLengthRef.current = messages.length;
    previousPendingRef.current = pending;
  }, [messages.length, pending]);

  if (loading && !messages.length) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-10">
        <div className="flex items-center gap-3 rounded-2xl border border-[#284863] bg-[#0d1827] px-4 py-3 text-sm text-slate-300">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-brand-300" />
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-brand-300 [animation-delay:120ms]" />
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-brand-300 [animation-delay:240ms]" />
          Loading conversation...
        </div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-10">
        <div className="max-w-xl text-center">
          <h2 className="font-heading text-3xl text-slate-100">What would you like to know?</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">Start a conversation and Mugallim AI will answer using your uploaded knowledge base.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-area flex-1 overflow-y-auto px-3 py-5 md:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        {messages.map((message) => (
          <article
            key={message.id}
            className={[
              "rounded-[24px] px-4 py-3 text-sm",
              message.role === "user"
                ? "ml-auto max-w-[86%] border border-brand-400/35 bg-brand-500/15 text-slate-100 md:max-w-[52%]"
                : "mr-auto max-w-[94%] border border-[#284863] bg-[#0d1827] text-slate-200 md:max-w-[74%]",
            ].join(" ")}
          >
            <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">{message.role === "user" ? "You" : "Assistant"}</p>
            {message.role === "assistant" ? (
              <AssistantMessageContent content={message.content} />
            ) : (
              <p className="whitespace-pre-wrap leading-7">{message.content}</p>
            )}
          </article>
        ))}

        {pending ? (
          <div className="mr-auto max-w-[74%] rounded-[24px] border border-[#284863] bg-[#0d1827] px-4 py-3 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand-300" />
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand-300 [animation-delay:140ms]" />
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand-300 [animation-delay:280ms]" />
              </div>
              <span>Assistant is thinking...</span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="max-w-3xl rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
