import { BookOpenText, Check, Copy, MessageSquare } from "lucide-react";
import { type ReactNode, type Ref, useCallback, useEffect, useRef, useState } from "react";

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

const AUTO_SCROLL_THRESHOLD = 96;
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

  @keyframes webchatThinkingDotPulse {
    0%, 80%, 100% {
      opacity: 0.28;
      transform: translateY(0);
    }

    40% {
      opacity: 1;
      transform: translateY(-2px);
    }
  }

  .thinking-shell {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at top left, rgba(142, 241, 229, 0.08), transparent 34%),
      linear-gradient(180deg, rgba(13, 24, 39, 0.98) 0%, rgba(10, 19, 31, 0.98) 100%);
  }

  .thinking-core {
    display: inline-flex;
    width: 0.72rem;
    height: 0.72rem;
    border-radius: 9999px;
    background: radial-gradient(circle, rgba(198, 255, 247, 0.98) 0%, rgba(142, 241, 229, 0.92) 45%, rgba(68, 171, 158, 0.85) 100%);
    animation: webchatThinkingCorePulse 1.6s ease-in-out infinite;
  }

  .thinking-inline-dots {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
  }

  .thinking-inline-dots span {
    width: 0.32rem;
    height: 0.32rem;
    border-radius: 9999px;
    background: rgba(142, 241, 229, 0.92);
    animation: webchatThinkingDotPulse 1.1s ease-in-out infinite;
  }

  .thinking-inline-dots span:nth-child(2) {
    animation-delay: 120ms;
  }

  .thinking-inline-dots span:nth-child(3) {
    animation-delay: 240ms;
  }

  @media (prefers-reduced-motion: reduce) {
    .thinking-core,
    .thinking-inline-dots span {
      animation: none !important;
    }
  }
`;

function ChatScrollShell({
  children,
  scrollRef,
}: {
  children: ReactNode;
  scrollRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} className="scroll-area h-full overflow-y-auto px-3 py-4 pb-16 md:px-6 md:py-5 md:pb-20">
        {children}
      </div>
    </div>
  );
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previousLengthRef = useRef(0);
  const previousPendingRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateStickiness = () => {
      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
    };

    updateStickiness();
    element.addEventListener("scroll", updateStickiness, { passive: true });
    return () => {
      element.removeEventListener("scroll", updateStickiness);
    };
  }, []);

  useEffect(() => {
    if (!messages.length && !pending) {
      previousLengthRef.current = 0;
      previousPendingRef.current = false;
      return;
    }

    const shouldSmooth = messages.length > previousLengthRef.current || (pending && !previousPendingRef.current);
    const behavior: ScrollBehavior = shouldSmooth ? "smooth" : "auto";

    if (shouldStickToBottomRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(behavior);
        });
      });
    }

    previousLengthRef.current = messages.length;
    previousPendingRef.current = pending;
  }, [messages.length, pending, scrollToBottom]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current) {
        scrollToBottom("auto");
      }
    });

    observer.observe(content);
    return () => {
      observer.disconnect();
    };
  }, [scrollToBottom]);

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
      <>
        <style>{THINKING_ANIMATION_CSS}</style>
        <ChatScrollShell scrollRef={scrollRef}>
          <div className="mx-auto w-full max-w-4xl space-y-3.5 md:space-y-4" role="status" aria-live="polite">
            <div className="max-w-[72%] animate-pulse rounded-[24px] border border-[#284863] bg-[#0f1c2c] px-4 py-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-6 w-24 rounded-full border border-[#305169] bg-[#102033]" />
              </div>
              <div className="space-y-2.5">
                <div className="h-4 w-[88%] rounded-full bg-slate-700/70" />
                <div className="h-4 w-[74%] rounded-full bg-slate-700/60" />
                <div className="h-4 w-[61%] rounded-full bg-slate-700/50" />
              </div>
            </div>

            <div className="ml-auto max-w-[54%] animate-pulse rounded-[24px] border border-brand-400/25 bg-brand-500/10 px-4 py-4 [animation-delay:120ms]">
              <div className="mb-3 flex justify-end">
                <span className="inline-flex h-6 w-16 rounded-full border border-brand-400/20 bg-brand-500/10" />
              </div>
              <div className="space-y-2.5">
                <div className="h-4 w-full rounded-full bg-brand-500/20" />
                <div className="h-4 w-[72%] rounded-full bg-brand-500/15" />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#284863] bg-[#0d1827] px-4 py-3 text-sm text-slate-300 [animation-delay:180ms]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#305169] bg-[#102033] text-brand-200">
                <MessageSquare size={14} />
              </span>
              <span>Загружаем диалог...</span>
            </div>
          </div>
        </ChatScrollShell>
      </>
    );
  }

  if (!messages.length) {
    return (
      <div className="grid flex-1 place-items-center px-4 py-5 md:px-6 md:py-10">
        <div className="w-full max-w-[50rem] rounded-[24px] border border-[#284863] bg-[#0d1827]/92 px-4 py-5 text-center sm:rounded-[30px] sm:px-8 sm:py-10">
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
    );
  }

  return (
    <>
      <style>{THINKING_ANIMATION_CSS}</style>
      <ChatScrollShell scrollRef={scrollRef}>
        <div ref={contentRef} className="mx-auto w-full max-w-4xl space-y-3.5 md:space-y-4">
          {messages.map((message) => (
            <article
              key={message.id}
              className={[
                "rounded-[22px] px-3.5 py-2.5 text-sm",
                message.role === "user"
                  ? "ml-auto max-w-[82%] border border-brand-400/35 bg-brand-500/15 text-slate-100 md:max-w-[48%]"
                  : "mr-auto max-w-[90%] border border-[#284863] bg-[#0d1827] text-slate-200 md:max-w-[70%]",
              ].join(" ")}
              style={undefined}
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
            <div className="thinking-shell mr-auto inline-flex items-center gap-3 rounded-[22px] border border-[#284863] px-4 py-3 text-sm text-slate-300">
              <span className="thinking-core shrink-0" aria-hidden="true" />
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-slate-100" aria-live="polite">
                  Mugallim AI думает...
                </span>
                <span className="thinking-inline-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </ChatScrollShell>
    </>
  );
}
