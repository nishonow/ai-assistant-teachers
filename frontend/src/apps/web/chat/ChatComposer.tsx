import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatComposerProps {
  disabled: boolean;
  onSubmit: (value: string) => Promise<void>;
}

const MAX_TEXTAREA_HEIGHT = 220;

export default function ChatComposer({ disabled, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = "0px";
    const nextHeight = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [value]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    await onSubmit(trimmed);
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

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-[#21384b] bg-[#08111c]/96 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 md:px-6 md:pb-5"
    >
      <div className="chat-composer-shell mx-auto flex w-full max-w-4xl items-end gap-2.5 rounded-[26px] border border-[#284863] bg-[#0d1827] px-3 py-2.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Mugallim AI..."
          rows={1}
          className="chat-input-scroll min-h-[24px] max-h-[220px] flex-1 resize-none bg-transparent px-2 py-[8px] text-base leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none md:text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#8ef1e5] text-[#10221d] transition duration-200 hover:scale-[1.03] hover:bg-[#b7fbf3] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <SendHorizontal size={16} />
        </button>
      </div>
      <p className="mx-auto mt-2 w-full max-w-4xl px-2 text-center text-[11px] leading-5 text-slate-500 md:text-xs">
        Mugallim AI can make mistakes. Please check the cited sources. Your chats are saved to improve future use.
      </p>
    </form>
  );
}
