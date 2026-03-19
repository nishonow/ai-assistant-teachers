import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import AssistantMessageContent from "./AssistantMessageContent";
import type { ChatMessage } from "./types";

interface ChatMessageListProps {
  messages: ChatMessage[];
  pending: boolean;
  loading: boolean;
}

export default function ChatMessageList({ messages, pending, loading }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const previousLengthRef = useRef(0);
  const previousPendingRef = useRef(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!copiedMessageId) return;

    const timer = window.setTimeout(() => {
      setCopiedMessageId(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [copiedMessageId]);

  const handleCopy = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
    } catch {
      setCopiedMessageId(null);
    }
  };

  if (loading && !messages.length) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-10">
        <div className="flex items-center gap-3 rounded-2xl border border-[#284863] bg-[#0d1827] px-4 py-3 text-sm text-slate-300">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-brand-300" />
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-brand-300 [animation-delay:120ms]" />
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-brand-300 [animation-delay:240ms]" />
          Загрузка диалога...
        </div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-10">
        <div className="max-w-xl text-center">
          <h2 className="font-heading text-3xl text-slate-100">Что вы хотите узнать?</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">Начните диалог, и Mugallim AI ответит, опираясь на вашу загруженную базу знаний.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-area flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-5">
      <div className="mx-auto w-full max-w-4xl space-y-3.5 md:space-y-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className={[
              "chat-card-enter rounded-[22px] px-3.5 py-2.5 text-sm",
              message.role === "user"
                ? "ml-auto max-w-[82%] border border-brand-400/35 bg-brand-500/15 text-slate-100 md:max-w-[48%]"
                : "mr-auto max-w-[90%] border border-[#284863] bg-[#0d1827] text-slate-200 md:max-w-[70%]",
            ].join(" ")}
          >
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{message.role === "user" ? "Вы" : "Ассистент"}</p>
              {message.role === "assistant" ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-[#284863] bg-[#0a1624] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-slate-400 transition-colors hover:bg-[#102033] hover:text-slate-200"
                  onClick={() => {
                    void handleCopy(message.id, message.content);
                  }}
                >
                  {copiedMessageId === message.id ? <Check size={12} /> : <Copy size={12} />}
                  {copiedMessageId === message.id ? "Скопировано" : "Копировать"}
                </button>
              ) : null}
            </div>
            {message.role === "assistant" ? (
              <AssistantMessageContent content={message.content} />
            ) : (
              <p className="whitespace-pre-wrap leading-6">{message.content}</p>
            )}
          </article>
        ))}

        {pending ? (
          <div className="chat-card-enter mr-auto max-w-[70%] rounded-[22px] border border-[#284863] bg-[#0d1827] px-3.5 py-2.5 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand-300" />
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand-300 [animation-delay:140ms]" />
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand-300 [animation-delay:280ms]" />
              </div>
              <span>Mugallim AI думает...</span>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}