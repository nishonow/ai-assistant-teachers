import { SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatComposerProps {
  disabled: boolean;
  onSubmit: (value: string) => Promise<void>;
  suggestedValue: string | null;
  onSuggestedValueConsumed: () => void;
  focusRequestKey?: number;
}

const MAX_TEXTAREA_HEIGHT = 220;
const MIN_TEXTAREA_HEIGHT = 34;
const MOBILE_ENTER_QUERY = "(pointer: coarse), (max-width: 767px)";

export default function ChatComposer({
  disabled,
  onSubmit,
  suggestedValue,
  onSuggestedValueConsumed,
  focusRequestKey = 0,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const zoomedViewportRef = useRef<{ scrollX: number; scrollY: number } | null>(null);
  const lastFocusRequestRef = useRef(focusRequestKey);
  const deferredFocusRef = useRef(false);

  const focusComposer = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.focus();
    const cursorPosition = element.value.length;
    element.selectionStart = cursorPosition;
    element.selectionEnd = cursorPosition;
  }, []);

  const resizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return;

    element.style.height = "0px";
    const nextHeight = Math.max(MIN_TEXTAREA_HEIGHT, Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  };

  useLayoutEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [value]);

  useEffect(() => {
    const handleViewportChange = () => {
      resizeTextarea(textareaRef.current);
    };

    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);

    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) {
        handleViewportChange();
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (focusRequestKey === lastFocusRequestRef.current) return;

    lastFocusRequestRef.current = focusRequestKey;

    if (disabled) {
      deferredFocusRef.current = true;
      return;
    }

    deferredFocusRef.current = false;
    requestAnimationFrame(() => {
      focusComposer();
    });
  }, [disabled, focusComposer, focusRequestKey]);

  useEffect(() => {
    if (disabled || !deferredFocusRef.current) return;

    deferredFocusRef.current = false;
    requestAnimationFrame(() => {
      focusComposer();
    });
  }, [disabled, focusComposer]);

  const submitValue = useCallback(
    async (nextValue: string) => {
      const trimmed = nextValue.trim();
      if (!trimmed || disabled) return;

      setValue("");
      await onSubmit(trimmed);
    },
    [disabled, onSubmit],
  );

  useEffect(() => {
    if (!suggestedValue || disabled) return;

    setValue(suggestedValue);

    requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (element) {
        const cursorPosition = suggestedValue.length;
        element.focus();
        element.selectionStart = cursorPosition;
        element.selectionEnd = cursorPosition;
      }

      void submitValue(suggestedValue);
      onSuggestedValueConsumed();
    });
  }, [disabled, onSuggestedValueConsumed, submitValue, suggestedValue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitValue(value);
  };

  const insertNewLineAtCursor = () => {
    const element = textareaRef.current;
    if (!element) {
      setValue((current) => `${current}\n`);
      return;
    }

    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}\n${value.slice(end)}`;

    setValue(next);

    requestAnimationFrame(() => {
      const cursor = start + 1;
      element.selectionStart = cursor;
      element.selectionEnd = cursor;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;

    if (event.shiftKey) {
      event.preventDefault();
      insertNewLineAtCursor();
      return;
    }

    if (window.matchMedia(MOBILE_ENTER_QUERY).matches) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const captureZoomedViewport = () => {
    const scale = window.visualViewport?.scale ?? 1;
    if (Math.abs(scale - 1) < 0.01) {
      zoomedViewportRef.current = null;
      return;
    }

    zoomedViewportRef.current = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
  };

  const stabilizeZoomedFocus = () => {
    const snapshot = zoomedViewportRef.current;
    if (!snapshot) return;

    requestAnimationFrame(() => {
      window.scrollTo(snapshot.scrollX, snapshot.scrollY);
      textareaRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative -mt-7 bg-transparent px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-0 md:-mt-8 md:px-6 md:pb-4 md:pt-0"
    >
      <div className="chat-composer-shell relative mx-auto flex w-full max-w-4xl items-end gap-2 overflow-hidden rounded-[24px] border border-[#1e3448]/70 bg-[#0b1520] px-3 py-2 transition-all duration-250 md:gap-2.5 md:px-4 md:py-2.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onPointerDownCapture={captureZoomedViewport}
          onFocus={stabilizeZoomedFocus}
          placeholder="Напишите Mugalim AI..."
          rows={1}
          className="webchat-composer-input chat-input-scroll min-h-[34px] max-h-[220px] flex-1 resize-none bg-transparent px-1 py-1.5 text-base leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none md:min-h-[38px] md:py-[7px]"
        />
        <button
          type="submit"
          className="webchat-send-button inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-300 text-[#0a1e18] transition-all duration-200 hover:bg-[#b7fbf3] disabled:cursor-not-allowed disabled:opacity-40 md:h-10 md:w-10"
          disabled={disabled || !value.trim()}
          aria-label="Отправить сообщение"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
      <div className="mx-auto mt-1 flex w-full max-w-4xl items-center justify-between px-2 md:mt-1.5">
        <p className="text-[10px] leading-4 text-slate-500 md:text-[11px]">
          Проверяйте источники. История сохраняется.
        </p>
        <p className="hidden text-[10px] leading-4 text-slate-600 md:block">
          Enter — отправить · Shift+Enter — новая строка
        </p>
      </div>
    </form>
  );
}
