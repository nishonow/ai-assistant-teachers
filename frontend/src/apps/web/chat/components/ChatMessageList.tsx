import { ArrowDown, ArrowUpRight, BookOpenText, Check, Copy, MessageSquare, Sparkles } from "lucide-react";
import React, { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import AssistantMessageContent, { getAssistantMessagePlainText } from "./AssistantMessageContent";
import type { ChatMessage } from "../utils/types";

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
  "Можно ли уволить учителя без объяснения причин?",
  "Какие права есть у учителя по закону?",
  "Как получить отпуск по беременности?",
] as const;

const AUTO_SCROLL_THRESHOLD = 100;
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
  }

  .thinking-core {
    display: inline-flex;
    width: 0.72rem;
    height: 0.72rem;
    border-radius: 9999px;
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
        className="scroll-area webchat-scroll-fade h-full overflow-y-auto px-3 pb-[104px] pt-[60px] md:px-6 md:pb-[108px] md:pt-[64px]"
        style={{ overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch', scrollBehavior: 'auto' } as React.CSSProperties & { WebkitOverflowScrolling: string }}
      >
        {children}
      </div>
      
      {showScrollButton && (
        <div className="absolute bottom-9 left-1/2 z-20 -translate-x-1/2 md:bottom-10" style={{ animation: "popUpSoft 260ms var(--lg-ease) both" }}>
          <button
            type="button"
            onClick={onScrollToBottom}
            className="webchat-scroll-button flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105 active:scale-90"
            aria-label="Прокрутить вниз"
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
  const previousFirstMessageIdRef = useRef<string | undefined>(undefined);
  const shouldStickToBottomRef = useRef(true);
  const suppressScrollButtonUntilRef = useRef(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const suppressScrollButtonTemporarily = useCallback((durationMs = 220) => {
    suppressScrollButtonUntilRef.current = performance.now() + durationMs;
    setShowScrollButton(false);
  }, []);

  const jumpToBottomWithoutButtonFlicker = useCallback((suppressMs = 220) => {
    const element = scrollRef.current;
    if (!element) return;

    suppressScrollButtonTemporarily(suppressMs);
    shouldStickToBottomRef.current = true;
    element.scrollTop = element.scrollHeight;
  }, [suppressScrollButtonTemporarily]);

  const scrollToBottom = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    if (performance.now() < suppressScrollButtonUntilRef.current) {
      return;
    }
    
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const isSticky = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
    shouldStickToBottomRef.current = isSticky;
    setShowScrollButton(!isSticky);
  }, []);

  // Update stickiness on initial render or when messages change
  useEffect(() => {
    handleScroll();
  }, [messages.length, handleScroll]);

  useEffect(() => {
    if (!loading) return;

    shouldStickToBottomRef.current = true;
    suppressScrollButtonTemporarily(260);
  }, [loading, suppressScrollButtonTemporarily]);

  useLayoutEffect(() => {
    if (!messages.length) {
      previousFirstMessageIdRef.current = undefined;
      return;
    }

    const isNewConversation = messages[0]?.id !== previousFirstMessageIdRef.current;

    if (isNewConversation || shouldStickToBottomRef.current) {
      jumpToBottomWithoutButtonFlicker(700);
    }

    previousFirstMessageIdRef.current = messages[0]?.id;
  }, [jumpToBottomWithoutButtonFlicker, messages]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current) {
        scrollToBottom();
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
          onScrollToBottom={scrollToBottom}
          showScrollButton={showScrollButton}
          onScroll={handleScroll}
        >
          <div className="mx-auto w-full max-w-[940px] space-y-3.5 md:space-y-4" role="status" aria-live="polite">
            <div className="webchat-loading-card ml-auto max-w-[54%] rounded-[24px] rounded-br-lg px-4 py-4">
              <div className="space-y-2.5">
                <div className="webchat-loading-line ml-auto h-3.5 w-full rounded-full" />
                <div className="webchat-loading-line ml-auto h-3.5 w-[72%] rounded-full" />
              </div>
            </div>

            <div className="webchat-loading-card max-w-[72%] rounded-[24px] rounded-bl-lg px-4 py-4 [animation-delay:180ms]">
              <div className="space-y-2.5">
                <div className="webchat-loading-line h-3.5 w-[88%] rounded-full" />
                <div className="webchat-loading-line h-3.5 w-[74%] rounded-full" />
                <div className="webchat-loading-line h-3.5 w-[61%] rounded-full" />
              </div>
            </div>

            <div className="webchat-loading-note wc-muted inline-flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-sm [animation-delay:180ms]">
              <span className="wc-accent inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--wc-active)]">
                <MessageSquare size={14} />
              </span>
              <span>Загружаем диалог…</span>
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
        <div className="grid h-full place-items-center px-1 py-5 md:px-6 md:py-10">
        <div className="w-full max-w-[940px] py-5 text-center sm:py-10">
          <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand-400 text-ink-950">
            <Sparkles size={28} />
          </span>
          <h2 className="wc-text font-heading text-[1.9rem] font-bold leading-tight tracking-[-0.02em] sm:text-4xl">Что вы хотите узнать?</h2>
          <p className="wc-muted mx-auto mt-3 max-w-md text-[15px] leading-6">Задайте вопрос своими словами или начните с одного из примеров</p>
          <div className="mx-auto mt-8 grid w-full gap-2.5 text-left sm:grid-cols-3 sm:gap-3">
            {SUGGESTED_QUESTIONS.map((question, index) => (
              <button
                key={question}
                type="button"
                className={[
                  "webchat-suggestion-card chat-card-enter group flex text-left items-start justify-between gap-3 rounded-[24px] px-4 py-4 text-[14.5px] font-medium leading-6 sm:min-h-[112px] sm:flex-col sm:px-5",
                  "disabled:cursor-not-allowed disabled:opacity-55",
                ].join(" ")}
                style={{ animationDelay: `${index * 70}ms` }}
                disabled={suggestionsDisabled}
                onClick={() => onSelectSuggestion(question)}
              >
                <span>{question}</span>
                <ArrowUpRight size={17} className="wc-accent mt-0.5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:self-end" />
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
        onScrollToBottom={scrollToBottom}
        showScrollButton={showScrollButton}
        onScroll={handleScroll}
      >
        <div
          ref={contentRef}
          className="mx-auto w-full max-w-[940px] space-y-2.5 md:space-y-3"
        >
          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <article className="webchat-user-bubble max-w-[85%] rounded-[22px] rounded-br-lg px-4 py-2.5 text-[15px] md:max-w-[62%]">
                  <p className="whitespace-pre-wrap break-words leading-[1.55]">{message.content}</p>
                </article>
              </div>
            ) : (
              <article key={message.id} className="webchat-assistant-bubble mr-auto w-full rounded-[24px] rounded-bl-lg px-4 py-3 md:px-5">
                  <AssistantMessageContent content={message.content} />
                  <div className="mt-3 flex flex-wrap items-center justify-start gap-1.5">
                    {message.sources?.length ? (
                      <div className="relative">
                        <button
                          type="button"
                          className={[
                            "webchat-source-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium",
                          ].join(" ")}
                          onClick={() => onSelectSources(message)}
                          aria-label={`Показать источники для этого ответа (${message.sources.length})`}
                          aria-pressed={selectedSourcesMessageId === message.id}
                        >
                          <BookOpenText size={13} />
                          <span>Источники</span>
                          <span className="tabular-nums opacity-70">{message.sources.length}</span>
                        </button>
                        <span className="ui-tooltip">
                          Источников: {message.sources.length}
                        </span>
                      </div>
                    ) : null}

                    <div className="relative">
                      <button
                        type="button"
                        className="webchat-copy-chip inline-flex h-8 w-8 items-center justify-center rounded-full"
                        onClick={() => {
                          const contentToCopy =
                            message.role === "assistant" ? getAssistantMessagePlainText(message.content) : message.content;
                          void handleCopy(message.id, contentToCopy);
                        }}
                        aria-label={copiedMessageId === message.id ? "Скопировано" : "Копировать"}
                      >
                        {copiedMessageId === message.id ? <Check size={14} className="wc-accent" /> : <Copy size={14} />}
                      </button>
                      <span className="ui-tooltip">{copiedMessageId === message.id ? "Скопировано" : "Копировать"}</span>
                    </div>
                  </div>
              </article>
            ),
          )}

          {pending ? (
            <div className="thinking-shell mr-auto inline-flex items-center gap-3 rounded-full rounded-bl-lg px-4 py-3 text-sm">
                <span className="thinking-core shrink-0" aria-hidden="true" />
                <div className="flex items-center gap-2.5">
                  <span className="webchat-thinking-label text-sm font-medium" aria-live="polite">
                    Mektep AI думает
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
