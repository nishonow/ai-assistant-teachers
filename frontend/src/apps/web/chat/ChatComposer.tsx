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
      className="border-t border-[#21384b] bg-[#08111c]/96 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-6"
    >
      <div className="chat-composer-shell mx-auto flex w-full max-w-4xl items-end gap-3 rounded-[28px] border border-[#284863] bg-[#0d1827] px-3 py-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Mugallim AI..."
          rows={1}
          className="min-h-[24px] max-h-[220px] flex-1 resize-none bg-transparent px-2 py-[10px] text-base leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none md:text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#8ef1e5] text-[#10221d] transition duration-200 hover:scale-[1.03] hover:bg-[#b7fbf3] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <SendHorizontal size={16} />
        </button>
      </div>
    </form>
  );
}
