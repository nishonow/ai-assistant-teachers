import { ArrowDown, BookOpenText, Check, Copy, MessageSquare, Sparkles } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

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
  onScrollToBottom,
  showScrollButton,
  onScroll,
}: {
  children: ReactNode;
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  onScrollToBottom: () => void;
  showScrollButton: boolean;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <div 
        ref={scrollRef} 
        onScroll={onScroll}
        className="scroll-area h-full overflow-y-auto px-3 py-4 pb-16 md:px-6 md:py-5 md:pb-20"
      >
        {children}
      </div>
      
      {showScrollButton && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:bottom-6 z-10">
          <button
            type="button"
            onClick={onScrollToBottom}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1e3448] bg-[#0d1827]/90 text-brand-300 backdrop-blur-sm transition-all hover:bg-[#15283f] hover:scale-105 active:scale-95"
            aria-label="Вниз"
          >
            <ArrowDown size={18} />
          </button>
        </div>
      )}
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
  const previousFirstMessageIdRef = useRef<string | undefined>(undefined);
  const shouldStickToBottomRef = useRef(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const isSticky = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
    shouldStickToBottomRef.current = isSticky;
    setShowScrollButton(!isSticky);
  }, []);

  // Update stickiness on initial render or when messages change
  useEffect(() => {
    handleScroll();
  }, [messages.length, pending, handleScroll]);

  useEffect(() => {
    if (!messages.length && !pending) {
      previousLengthRef.current = 0;
      previousPendingRef.current = false;
      previousFirstMessageIdRef.current = undefined;
      return;
    }

    const isNewConversation = messages[0]?.id !== previousFirstMessageIdRef.current;
    const shouldSmooth = !isNewConversation && (messages.length > previousLengthRef.current || (pending && !previousPendingRef.current));
    const behavior: ScrollBehavior = shouldSmooth ? "smooth" : "auto";

    if (isNewConversation || shouldStickToBottomRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(behavior);
          if (isNewConversation) {
             shouldStickToBottomRef.current = true;
             setShowScrollButton(false);
          }
        });
      });
    }

    previousLengthRef.current = messages.length;
    previousPendingRef.current = pending;
    previousFirstMessageIdRef.current = messages[0]?.id;
  }, [messages, pending, scrollToBottom]);

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
        <ChatScrollShell 
          scrollRef={scrollRef}
          onScrollToBottom={() => scrollToBottom("smooth")}
          showScrollButton={showScrollButton}
          onScroll={handleScroll}
        >
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
      <ChatScrollShell 
        scrollRef={scrollRef}
        onScrollToBottom={() => {}}
        showScrollButton={false}
      >
        <div className="grid h-full place-items-center px-4 py-5 md:px-6 md:py-10">
        <div className="w-full max-w-[50rem] px-4 py-5 text-center sm:px-8 sm:py-10">
          <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#284863] bg-[linear-gradient(135deg,_#0f2233_0%,_#0a1824_100%)] text-brand-300">
            <Sparkles size={24} />
          </div>
          <h2 className="font-heading text-[2rem] leading-tight text-slate-100 sm:text-3xl">Что вы хотите узнать?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">Задайте вопрос или выберите один из примеров ниже</p>
          <div className="mx-auto mt-6 grid w-full max-w-[760px] gap-2.5 text-left sm:mt-8 sm:gap-3 sm:grid-cols-3">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className={[
                  "group rounded-2xl border border-[#1e3448] bg-[#0b1520] px-4 py-4 text-sm leading-6 text-slate-300 transition-all duration-250 sm:px-5 sm:py-5",
                  "min-h-[84px] sm:min-h-[96px]",
                  "hover:border-brand-400/30 hover:bg-[#0e1c2b] hover:text-slate-100 hover:-translate-y-0.5",
                  "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
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
    </ChatScrollShell>
  );
  }

  return (
    <>
      <style>{THINKING_ANIMATION_CSS}</style>
      <ChatScrollShell 
        scrollRef={scrollRef} 
        onScrollToBottom={() => scrollToBottom("smooth")}
        showScrollButton={showScrollButton}
        onScroll={handleScroll}
      >
        <div ref={contentRef} className="mx-auto w-full max-w-4xl space-y-3.5 md:space-y-4">
          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <article className="max-w-[85%] rounded-[20px] rounded-br-md bg-[linear-gradient(135deg,_#0c3a4d_0%,_#0a2f42_50%,_#082638_100%)] px-4 py-3 text-sm text-slate-100 md:max-w-[52%]">
                  <p className="whitespace-pre-wrap leading-[1.65]">{message.content}</p>
                </article>
              </div>
            ) : (
              <article key={message.id} className="mr-auto max-w-[90%] rounded-[20px] rounded-bl-md border border-[#1e3448]/60 bg-[#0b1520] px-4 py-3 text-sm text-slate-200 md:max-w-[75%]">
                  <AssistantMessageContent content={message.content} />
                  <div className="mt-3 flex flex-wrap items-center justify-start gap-1.5">
                    {message.sources?.length ? (
                      <div className="relative">
                        <button
                          type="button"
                          className={[
                            "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-colors md:px-2.5 md:text-[11px]",
                            "group border-[#1e3448] bg-transparent text-slate-400 hover:bg-[#102033] hover:text-slate-200",
                            selectedSourcesMessageId === message.id ? "border-brand-400/30 text-slate-200" : "",
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
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#1e3448] bg-transparent text-slate-400 transition-colors hover:bg-[#102033] hover:text-slate-200"
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
              </article>
            ),
          )}

          {pending ? (
            <div className="thinking-shell mr-auto inline-flex items-center gap-3 rounded-[20px] rounded-bl-md border border-[#1e3448]/60 px-4 py-3 text-sm text-slate-300">
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
