import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, GraduationCap } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import logo from "../../../../logofull-dark.svg";
import LiquidBackdrop from "../../../core/components/LiquidBackdrop";

const BRAND_LINES = [
  "Ответы на основе документов",
  "История диалогов сохраняется",
  "Telegram и веб-чат",
];

export const TELEGRAM_URL = "https://t.me/mugallim_bot";

export const TelegramIcon = ({ size = 24, className = "" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
  </svg>
);

/** "или" divider + Telegram button shared by login and register forms. */
export function TelegramAlternative() {
  return (
    <>
      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">или</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="btn-muted h-11 w-full text-[15px]">
        <TelegramIcon size={17} className="text-[#35b5f0]" />
        Открыть Telegram-бота
      </a>
    </>
  );
}

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  error?: string;
}

/** Labelled glass input; password fields get a show/hide toggle. */
export function AuthField({ label, error, type = "text", ...inputProps }: AuthFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium text-white/65">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          className={`lg-input ${isPassword ? "pr-12" : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute bottom-1 right-1.5 flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Скрыть пароль" : "Показать пароль"}
            aria-pressed={revealed}
          >
            {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-300">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
  children: ReactNode;
}

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  children,
}: AuthShellProps) {
  // Keep the post-login redirect target when switching between login and register.
  const location = useLocation();

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden font-sans text-white">
      <LiquidBackdrop />

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl items-center gap-10 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* ── Brand column (desktop) ─────────────────────────── */}
        <section className="hidden flex-col justify-between self-stretch py-10 lg:flex">
          <Link to="/" className="inline-flex w-fit items-center transition-opacity hover:opacity-80">
            <img src={logo} alt="Mektep AI" className="h-9 w-auto object-contain" />
          </Link>

          <div className="max-w-[30rem]">
            <div className="glass mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">
              <GraduationCap size={13} />
              Для учителей Кыргызстана
            </div>
            <h2 className="font-heading text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-white xl:text-[2.75rem]">
              Спокойный сервис для рабочих и правовых вопросов в школе.
            </h2>

            <ul className="mt-9 space-y-3">
              {BRAND_LINES.map((item) => (
                <li key={item} className="glass flex w-fit items-center gap-3 rounded-full py-2 pl-2 pr-5 text-[15px] text-white/75">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-400/20">
                    <CheckCircle2 size={15} className="text-brand-300" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/30">© {new Date().getFullYear()} Mektep AI</p>
        </section>

        {/* ── Form card ─────────────────────────────────────── */}
        <section className="flex w-full flex-col items-center">
          <div className="mb-6 flex w-full max-w-[400px] items-center justify-between lg:hidden">
            <Link to="/" className="btn-icon" aria-label="На главную">
              <ArrowLeft size={18} />
            </Link>
            <Link to="/" className="inline-flex items-center transition-opacity hover:opacity-80">
              <img src={logo} alt="Mektep AI" className="h-8 w-auto object-contain" />
            </Link>
            <span className="w-10" />
          </div>

          <div
            className="glass-strong w-full max-w-[400px] rounded-[30px] p-6 sm:p-7"
            style={{ animation: "modalSpring 480ms var(--lg-ease) both" }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">{eyebrow}</p>
            <h1 className="mt-2 font-heading text-[1.75rem] font-bold tracking-[-0.02em] text-white">{title}</h1>
            <p className="mt-1 text-[15px] leading-relaxed text-white/55">{subtitle}</p>

            <div className="mt-6">{children}</div>
          </div>

          <p className="mt-5 text-sm text-white/55">
            {footerText}{" "}
            <Link to={footerLinkTo} state={location.state} className="font-semibold text-brand-300 transition-colors hover:text-brand-200">
              {footerLinkLabel}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
