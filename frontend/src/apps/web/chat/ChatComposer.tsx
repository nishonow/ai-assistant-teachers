import { SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatComposerProps {
  disabled: boolean;
  onSubmit: (value: string) => Promise<void>;
  suggestedValue: string | null;
  onSuggestedValueConsumed: () => void;
}

const MAX_TEXTAREA_HEIGHT = 220;

export default function ChatComposer({
  disabled,
  onSubmit,
  suggestedValue,
  onSuggestedValueConsumed,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const zoomedViewportRef = useRef<{ scrollX: number; scrollY: number } | null>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = "0px";
    const nextHeight = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [value]);

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

    if (event.ctrlKey) {
      event.preventDefault();
      insertNewLineAtCursor();
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
      className="bg-[#08111c]/96 px-3 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-1.5 md:px-6 md:pb-4 md:pt-2"
    >
      <div className="chat-composer-shell mx-auto flex w-full max-w-4xl items-end gap-2 rounded-[22px] bg-[#0d1827] px-2 py-1.5 md:gap-2.5 md:rounded-[24px] md:px-2.5 md:py-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onPointerDownCapture={captureZoomedViewport}
          onFocus={stabilizeZoomedFocus}
          placeholder="Напишите Mugallim AI..."
          rows={1}
          className="chat-input-scroll min-h-[20px] max-h-[220px] flex-1 resize-none bg-transparent px-2 py-[5px] text-base leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none md:min-h-[22px] md:py-[7px]"
        />
        <button
          type="submit"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8ef1e5] text-[#10221d] transition duration-200 hover:bg-[#b7fbf3] disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:w-9"
          disabled={disabled || !value.trim()}
          aria-label="Отправить сообщение"
        >
          <SendHorizontal size={16} />
        </button>
      </div>
      <p className="mx-auto mt-1 w-full max-w-4xl px-2 text-center text-[8px] leading-3 text-slate-500 whitespace-nowrap md:mt-1.5 md:text-[11px] md:leading-4">
        Проверяйте источники. История сохраняется.
      </p>
    </form>
  );
}
