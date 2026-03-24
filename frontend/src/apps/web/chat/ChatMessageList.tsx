import { BookOpenText, Check, Copy } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import AssistantMessageContent, { getAssistantMessagePlainText } from "./AssistantMessageContent";
import type { ChatMessage } from "./types";

interface ChatMessageListProps {
  messages: ChatMessage[];
  pending: boolean;
  loading: boolean;
  selectedSourcesMessageId: string | null;
  onSelectSources: (message: ChatMessage) => void;
  onSelectSuggestion: (question: string) => void;
  suggestionsDisabled: boolean;
}

const SUGGESTED_QUESTIONS = [
  "Какие права есть у учителя по закону?",
  "Можно ли уволить учителя без его согласия?",
  "Как получить отпуск по беременности и родам?",
] as const;

const THINKING_STAGES = [
  "Анализирую запрос...",
  "Ищу подходящие документы...",
  "Проверяю контекст и нормы...",
  "Формирую ответ...",
] as const;

const THINKING_ANIMATION_CSS = `
  @keyframes webchatThinkingCorePulse {
    0%, 100% {
      opacity: 0.72;
      transform: scale(0.92);
    }

    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes webchatThinkingDotBounce {
    0%, 80%, 100% {
      transform: translateY(0);
      opacity: 0.35;
    }

    40% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }

  @keyframes webchatThinkingSweep {
    from {
      transform: translateX(-120%);
    }

    to {
      transform: translateX(120%);
    }
  }

  .thinking-shell {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at top left, rgba(142, 241, 229, 0.08), transparent 34%),
      linear-gradient(180deg, rgba(13, 24, 39, 0.98) 0%, rgba(10, 19, 31, 0.98) 100%);
  }

  .thinking-shell::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(142, 241, 229, 0.08), transparent);
    transform: translateX(-120%);
    animation: webchatThinkingSweep 2.4s ease-in-out infinite;
    pointer-events: none;
  }

  .thinking-core {
    display: inline-flex;
    width: 12px;
    height: 12px;
    border-radius: 9999px;
    background: radial-gradient(circle, rgba(198, 255, 247, 0.98) 0%, rgba(142, 241, 229, 0.92) 45%, rgba(68, 171, 158, 0.85) 100%);
    animation: webchatThinkingCorePulse 1.6s ease-in-out infinite;
  }

  .thinking-dots {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .thinking-dots span {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 9999px;
    background: rgba(142, 241, 229, 0.92);
    animation: webchatThinkingDotBounce 1s ease-in-out infinite;
  }

  .thinking-dots span:nth-child(2) {
    animation-delay: 120ms;
  }

  .thinking-dots span:nth-child(3) {
    animation-delay: 240ms;
  }

  .thinking-line {
    position: relative;
    overflow: hidden;
    background: rgba(71, 96, 121, 0.45);
  }

  .thinking-line::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(186, 255, 246, 0.18), transparent);
    transform: translateX(-120%);
    animation: webchatThinkingSweep 1.9s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .thinking-shell::after,
    .thinking-core,
    .thinking-dots span,
    .thinking-line::after {
      animation: none !important;
    }
  }
`;

function ChatScrollShell({ children }: { children: ReactNode }) {
  return <div className="scroll-area flex-1 overflow-y-auto px-3 py-4 pb-3 md:px-6 md:py-5 md:pb-4">{children}</div>;
}

export default function ChatMessageList({
  messages,
  pending,
  loading,
  selectedSourcesMessageId,
  onSelectSources,
  onSelectSuggestion,
  suggestionsDisabled,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const previousLengthRef = useRef(0);
  const previousPendingRef = useRef(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [thinkingStageIndex, setThinkingStageIndex] = useState(0);

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

  useEffect(() => {
    if (!pending) {
      setThinkingStageIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setThinkingStageIndex((current) => (current + 1) % THINKING_STAGES.length);
    }, 1800);

    return () => {
      window.clearInterval(timer);
    };
  }, [pending]);

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
      <>
        <style>{THINKING_ANIMATION_CSS}</style>
        <ChatScrollShell>
          <div className="mx-auto w-full max-w-4xl space-y-3.5 md:space-y-4" role="status" aria-live="polite">
            <div className="chat-card-enter max-w-[72%] animate-pulse rounded-[24px] border border-[#284863] bg-[#0f1c2c] px-4 py-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-6 w-24 rounded-full border border-[#305169] bg-[#102033]" />
              </div>
              <div className="space-y-2.5">
                <div className="h-4 w-[88%] rounded-full bg-slate-700/70" />
                <div className="h-4 w-[74%] rounded-full bg-slate-700/60" />
                <div className="h-4 w-[61%] rounded-full bg-slate-700/50" />
              </div>
            </div>

            <div className="chat-card-enter ml-auto max-w-[54%] animate-pulse rounded-[24px] border border-brand-400/25 bg-brand-500/10 px-4 py-4 [animation-delay:120ms]">
              <div className="mb-3 flex justify-end">
                <span className="inline-flex h-6 w-16 rounded-full border border-brand-400/20 bg-brand-500/10" />
              </div>
              <div className="space-y-2.5">
                <div className="h-4 w-full rounded-full bg-brand-500/20" />
                <div className="h-4 w-[72%] rounded-full bg-brand-500/15" />
              </div>
            </div>

            <div className="chat-card-enter flex items-center gap-3 rounded-2xl border border-[#284863] bg-[#0d1827] px-4 py-3 text-sm text-slate-300 [animation-delay:180ms]">
              <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-brand-200" />
              <span>Загружаем диалог...</span>
            </div>
          </div>
        </ChatScrollShell>
      </>
    );
  }

  if (!messages.length) {
    return (
      <>
        <style>{THINKING_ANIMATION_CSS}</style>
        <div className="grid flex-1 place-items-center px-4 py-5 md:px-6 md:py-10">
          <div className="chat-card-enter w-full max-w-[50rem] rounded-[24px] border border-[#284863] bg-[#0d1827]/92 px-4 py-5 text-center sm:rounded-[30px] sm:px-8 sm:py-10">
            <h2 className="font-heading text-[2rem] leading-tight text-slate-100 sm:text-3xl">Что вы хотите узнать?</h2>
            <div className="mx-auto mt-5 grid w-full max-w-[760px] gap-2.5 text-left sm:mt-7 sm:gap-3.5 sm:grid-cols-3">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  className={[
                    "rounded-[18px] border border-[#284863] bg-[#0d1827] px-4 py-4 text-sm leading-6 text-slate-200 transition duration-200 sm:rounded-[22px] sm:px-5 sm:py-5",
                    "min-h-[84px] sm:min-h-[96px]",
                    "hover:border-[#3a5f7d] hover:bg-[#112033] hover:text-slate-100",
                    "disabled:cursor-not-allowed disabled:opacity-55",
                  ].join(" ")}
                  disabled={suggestionsDisabled}
                  onClick={() => onSelectSuggestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{THINKING_ANIMATION_CSS}</style>
      <ChatScrollShell>
        <div className="mx-auto w-full max-w-4xl space-y-3.5 md:space-y-4">
          {messages.map((message, index) => (
            <article
              key={message.id}
              className={[
                "chat-card-enter rounded-[22px] px-3.5 py-2.5 text-sm",
                message.role === "user"
                  ? "ml-auto max-w-[82%] border border-brand-400/35 bg-brand-500/15 text-slate-100 md:max-w-[48%]"
                  : "mr-auto max-w-[90%] border border-[#284863] bg-[#0d1827] text-slate-200 md:max-w-[70%]",
              ].join(" ")}
              style={{ animationDelay: `${Math.min(index, 6) * 35}ms` }}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{message.role === "user" ? "Вы" : "Ассистент"}</p>
                {message.role === "assistant" ? <span /> : null}
              </div>

              {message.role === "assistant" ? (
                <>
                  <AssistantMessageContent content={message.content} />
                  <div className="mt-3 flex flex-wrap items-center justify-start gap-1.5">
                    {message.sources?.length ? (
                      <div className="relative">
                        <button
                          type="button"
                          className={[
                            "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-colors md:px-2.5 md:text-[11px]",
                            "group border-[#284863] bg-transparent text-slate-400 hover:bg-[#102033] hover:text-slate-200",
                            selectedSourcesMessageId === message.id ? "border-[#3a5f7d] text-slate-200" : "",
                          ].join(" ")}
                          onClick={() => onSelectSources(message)}
                          aria-label={`Показать источники для этого ответа (${message.sources.length})`}
                          aria-pressed={selectedSourcesMessageId === message.id}
                        >
                          <BookOpenText size={12} />
                          <span>Источники</span>
                        </button>
                        <span className="ui-tooltip">
                          Источники: {message.sources.length}
                        </span>
                      </div>
                    ) : null}

                    <div className="relative">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#284863] bg-transparent text-slate-400 transition-colors hover:bg-[#102033] hover:text-slate-200"
                        onClick={() => {
                          const contentToCopy =
                            message.role === "assistant" ? getAssistantMessagePlainText(message.content) : message.content;
                          void handleCopy(message.id, contentToCopy);
                        }}
                        aria-label={copiedMessageId === message.id ? "Скопировано" : "Копировать"}
                      >
                        {copiedMessageId === message.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      <span className="ui-tooltip">{copiedMessageId === message.id ? "Скопировано" : "Копировать"}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="whitespace-pre-wrap leading-6">{message.content}</p>
              )}
            </article>
          ))}

          {pending ? (
            <div className="thinking-shell chat-card-enter mr-auto max-w-[70%] rounded-[24px] border border-[#284863] bg-[#0d1827] px-4 py-4 text-sm text-slate-300">
              <div className="flex items-start gap-3.5">
                <span className="thinking-core mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200/80">Ассистент</p>
                    <div className="thinking-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <p className="mt-2.5 text-sm font-medium text-slate-100" aria-live="polite">
                    {THINKING_STAGES[thinkingStageIndex]}
                  </p>
                  <div className="mt-3 space-y-2.5" aria-hidden="true">
                    <div className="thinking-line h-2.5 w-[88%] rounded-full" />
                    <div className="thinking-line h-2.5 w-[72%] rounded-full" />
                    <div className="thinking-line h-2.5 w-[54%] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </ChatScrollShell>
    </>
  );
}
