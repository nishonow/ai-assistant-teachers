import { Ban, CircleStop, Clock, Loader2, Mic, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "../../../../core/auth";
import { transcribeVoiceMessage } from "../utils/api";

interface ChatComposerProps {
  disabled: boolean;
  isMessagingBlocked?: boolean;
  rateLimitSecondsLeft?: number;
  onSubmit: (value: string) => Promise<void>;
  suggestedValue: string | null;
  onSuggestedValueConsumed: () => void;
  focusRequestKey?: number;
}

const MAX_TEXTAREA_HEIGHT = 220;
const MIN_TEXTAREA_HEIGHT = 34;
const MOBILE_ENTER_QUERY = "(pointer: coarse), (max-width: 767px)";

function localizeVoiceErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : `${error || ""}`;
  const normalized = raw.toLowerCase();

  if (normalized.includes("could not transcribe")) {
    return "Не удалось распознать речь. Попробуйте записать снова.";
  }
  if (normalized.includes("unsupported audio format")) {
    return "Формат аудио не поддерживается. Попробуйте другой браузер.";
  }
  if (normalized.includes("audio is empty")) {
    return "Аудио пустое. Попробуйте записать снова.";
  }
  if (normalized.includes("audio is too large")) {
    return "Аудио слишком большое. Говорите короче или отправьте меньше.";
  }
  if (normalized.includes("transcription service unavailable")) {
    return "Сервис распознавания временно недоступен. Попробуйте позже.";
  }
  if (normalized.includes("rate limit")) {
    return "Слишком много запросов. Подождите немного и попробуйте снова.";
  }

  return "Не удалось распознать голос. Попробуйте еще раз.";
}

export default function ChatComposer({
  disabled,
  isMessagingBlocked = false,
  rateLimitSecondsLeft = 0,
  onSubmit,
  suggestedValue,
  onSuggestedValueConsumed,
  focusRequestKey = 0,
}: ChatComposerProps) {
  const { session } = useAuth();
  const [value, setValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastFocusRequestRef = useRef(focusRequestKey);
  const deferredFocusRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  const clearMediaResources = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearMediaResources();
    };
  }, [clearMediaResources]);

  const handleVoiceStart = useCallback(async () => {
    if (isRecording || isTranscribing || disabled) return;

    if (!session) {
      setVoiceError("Требуется авторизация для отправки голоса.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError("Запись аудио не поддерживается в этом браузере.");
      return;
    }

    setVoiceError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const selectedMimeType = preferredMimeTypes.find((mime) => MediaRecorder.isTypeSupported(mime));
      const recorder = selectedMimeType ? new MediaRecorder(stream, { mimeType: selectedMimeType }) : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setVoiceError("Ошибка записи аудио.");
        clearMediaResources();
        setIsRecording(false);
      };

      recorder.onstop = async () => {
        setIsRecording(false);

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        if (!chunks.length) {
          setVoiceError("Аудио пустое. Попробуйте еще раз.");
          return;
        }

        if (!session) {
          setVoiceError("Сессия истекла. Войдите снова.");
          return;
        }

        setIsTranscribing(true);
        try {
          const audio = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          const transcript = await transcribeVoiceMessage({
            session,
            audio,
            fileName: recorder.mimeType.includes("mp4") ? "voice.mp4" : "voice.webm",
          });

          if (!transcript) {
            setVoiceError("Не удалось распознать речь.");
            return;
          }

          setValue((current) => {
            const prefix = current.trim();
            return prefix ? `${prefix} ${transcript}` : transcript;
          });

          requestAnimationFrame(() => {
            focusComposer();
          });
        } catch (error) {
          const message = localizeVoiceErrorMessage(error);
          setVoiceError(message);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
    } catch {
      clearMediaResources();
      setVoiceError("Нет доступа к микрофону. Разрешите запись в браузере.");
      setIsRecording(false);
    }
  }, [clearMediaResources, disabled, focusComposer, isRecording, isTranscribing, session]);

  const handleVoiceStop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      handleVoiceStop();
      return;
    }
    void handleVoiceStart();
  }, [handleVoiceStart, handleVoiceStop, isRecording]);

  const voiceButtonDisabled = isTranscribing || (!isRecording && disabled);
  const voiceButtonLabel = isRecording ? "Остановить запись" : "Записать голос";
  const voiceTooltip = isRecording ? "Нажмите, чтобы остановить запись" : "Нажмите, чтобы начать запись";

  if (isMessagingBlocked) {
    return (
      <div className="relative -mt-6 bg-transparent px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-0 md:-mt-7 md:px-6 md:pb-4 md:pt-0">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex items-center gap-3 rounded-[20px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <Ban size={16} className="shrink-0 text-rose-400" />
            <span className="flex-1">Ваш аккаунт заблокирован. Вы можете просматривать историю, но не можете отправлять сообщения. Обратитесь к администратору.</span>
          </div>
        </div>
      </div>
    );
  }

  if (rateLimitSecondsLeft > 0) {
    return (
      <div className="relative -mt-6 bg-transparent px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-0 md:-mt-7 md:px-6 md:pb-4 md:pt-0">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex items-center gap-3 rounded-[20px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <Clock size={16} className="shrink-0 text-amber-400" />
            <span className="flex-1">
              Слишком много запросов. Подождите{" "}
              <span className="font-semibold tabular-nums">{rateLimitSecondsLeft}с</span>{" "}
              перед следующим вопросом.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative -mt-6 bg-transparent px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-0 md:-mt-7 md:px-6 md:pb-4 md:pt-0"
    >
      <div className="chat-composer-shell relative mx-auto flex w-full max-w-4xl items-end gap-2 overflow-visible rounded-[24px] border border-[#1e3448]/70 bg-[#0b1520] px-3 py-2 transition-all duration-250 md:gap-2.5 md:px-4 md:py-2.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишите Mugallim AI..."
          rows={1}
          style={{ touchAction: 'manipulation' }}
          className="webchat-composer-input chat-input-scroll min-h-[34px] max-h-[220px] flex-1 resize-none bg-transparent px-1 py-1.5 text-base leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none md:min-h-[38px] md:py-[7px]"
        />
        <div className="relative">
          <button
            type="button"
            style={{ touchAction: 'manipulation' }}
            className={`webchat-source-download inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#1e3448]/70 bg-[#102033] text-slate-300 transition-colors hover:bg-[#1a344d] hover:text-slate-100 md:h-10 md:w-10 ${
              isRecording ? "border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/25" : ""
            }`}
            onClick={handleVoiceToggle}
            disabled={voiceButtonDisabled}
            aria-label={voiceButtonLabel}
          >
            {isTranscribing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isRecording ? (
              <CircleStop size={15} />
            ) : (
              <Mic size={16} />
            )}
          </button>
          <span className="ui-tooltip">{voiceTooltip}</span>
        </div>

        <button
          type="submit"
          style={{ touchAction: 'manipulation' }}
          className="webchat-send-button inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-300 text-[#0a1e18] transition-all duration-200 hover:bg-[#b7fbf3] disabled:cursor-not-allowed disabled:opacity-40 md:h-10 md:w-10"
          disabled={disabled || !value.trim()}
          aria-label="Отправить сообщение"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
      <div className="mx-auto mt-1 flex w-full max-w-4xl items-center justify-center px-2 md:mt-1.5">
        <p className="text-center text-[10px] leading-4 text-slate-500 md:text-[11px]">Mugallim AI может ошибаться. Проверяйте источники.</p>
        <p aria-live="polite" className="sr-only" role="status">
          {voiceError ? `Ошибка: ${voiceError}` : ""}
        </p>
      </div>
    </form>
  );
}
