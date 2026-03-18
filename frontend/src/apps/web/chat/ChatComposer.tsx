import { SendHorizontal } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatComposerProps {
  disabled: boolean;
  onSubmit: (value: string) => Promise<void>;
}

export default function ChatComposer({ disabled, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    <form onSubmit={handleSubmit} className="border-t border-ink-700/70 bg-ink-900/80 p-3 md:p-4">
      <div className="mx-auto flex w-full max-w-4xl items-end gap-3 rounded-2xl border border-ink-600/80 bg-ink-800/75 p-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message assistant..."
          rows={1}
          className="max-h-40 min-h-[44px] flex-1 resize-y bg-transparent px-2 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
          disabled={disabled}
        />
        <button type="submit" className="btn-primary" disabled={disabled || !value.trim()}>
          <SendHorizontal size={16} />
          Send
        </button>
      </div>
    </form>
  );
}

