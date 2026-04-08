import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  GraduationCap,
  History,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X,
  LogIn,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import logo from "../../../../logo.png";

import { useAuth } from "../../../core/auth";
import usePwaInstallPrompt from "../hooks/usePwaInstallPrompt";

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const TelegramIcon = ({ size = 24, className = "" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
  </svg>
);

const STEPS = [
  {
    number: "01",
    title: "Опишите ситуацию",
    description:
      "Расскажите о вопросе простыми словами, без сложной юридической формулировки.",
  },
  {
    number: "02",
    title: "Получите понятный ответ",
    description:
      "Сервис помогает отделить факты от советов и показывает, на что обратить внимание.",
  },
  {
    number: "03",
    title: "Сохраните и вернитесь позже",
    description:
      "История диалогов остаётся в веб-чате, чтобы к вопросу можно было спокойно вернуться.",
  },
];

const FEATURES = [
  {
    title: "Пишите простыми словами",
    description: "Опишите ситуацию так, как рассказали бы её коллеге.",
    icon: MessageCircle,
  },
  {
    title: "Ответы с опорой на документы",
    description: "Факт отделён от совета, а ориентиры по источникам остаются рядом.",
    icon: FileSearch,
  },
  {
    title: "История сохраняется",
    description: "Возвращайтесь к диалогам позже и продолжайте без потери контекста.",
    icon: History,
  },
  {
    title: "Telegram для быстрых вопросов",
    description: "Если нужен ответ на ходу, можно сразу открыть Telegram-бота.",
    icon: ShieldCheck,
  },
];

const USE_CASES = [
  {
    title: "Давление при увольнении",
    icon: AlertTriangle,
    desc: "Как защитить свои права, если вас принуждают уйти по собственному желанию.",
  },
  {
    title: "Задержка зарплаты",
    icon: Banknote,
    desc: "Что делать, если выплаты задерживаются или не выплачиваются в полном объеме.",
  },
  {
    title: "Перегрузка на работе",
    icon: Briefcase,
    desc: "Как законно отказаться от неоплачиваемых дополнительных часов и нагрузки.",
  },
  {
    title: "Споры по договору",
    icon: FileText,
    desc: "Разбор спорных пунктов в трудовом контракте и должностных инструкциях.",
  },
  {
    title: "Трудовые гарантии",
    icon: ShieldCheck,
    desc: "Защита отпусков, больничных и социальных гарантий преподавателя.",
  },
  {
    title: "Школьные правила",
    icon: BookOpen,
    desc: "Правомерность локальных актов, приказов директора и внутренних уставов.",
  },
];

const HERO_POINTS = [
  "Без регистрации и ожидания",
  "Конфиденциально",
  "С опорой на закон",
];

export default function LandingPage() {
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const { canPromptInstall, canShowManualInstall, shouldShowInstallAction, promptInstall } =
    usePwaInstallPrompt();

  const appHref = session ? "/app" : "/login";
  const loginLabel = "Войти";
  const heroLabel = "Войти в веб-чат";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleInstallClick() {
    if (canPromptInstall) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setInstallMessage("Приложение добавлено на главный экран.");
        return;
      }
      if (outcome === "dismissed") {
        setInstallMessage("Установка отменена. Можно попробовать снова позже.");
        return;
      }
      setInstallMessage(
        "Установка пока недоступна. Обновите страницу или откройте меню браузера и выберите «Установить приложение»."
      );
      return;
    }
    if (canShowManualInstall) {
      setInstallMessage("На iPhone откройте «Поделиться» и выберите «На экран Домой».");
      return;
    }
    setInstallMessage(
      "Откройте меню браузера и выберите «Установить приложение». Если пункта нет, устройство не поддерживает установку."
    );
  }

  return (
    <main className="min-h-[100svh] bg-ink-950 text-white font-sans selection:bg-brand-500/80/30 overflow-hidden">
      {/* ─── NAVIGATION ─────────────────────────────────────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-all duration-300 ${
          scrolled
            ? "border-white/10 bg-ink-950/90 backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
          <Link
            to="/"
            className="flex items-center gap-3 text-white transition-opacity hover:opacity-80"
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
              <img src={logo} alt="Mugallim AI" className="h-full w-full object-cover" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">Mugallim AI</span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to={appHref}
              className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              {loginLabel}
            </Link>
            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:border-white/30"
            >
              <TelegramIcon size={16} />
              Telegram
            </a>
            <Link
              to={appHref}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-500/80 px-4 text-sm font-bold text-ink-950 transition-all duration-200 hover:bg-brand-400 hover:-translate-y-0.5"
            >
              Начать
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white backdrop-blur-sm transition-colors hover:bg-white/10 md:hidden"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute inset-x-4 top-full mt-2 rounded-2xl border border-white/10 bg-ink-800/95 p-2 backdrop-blur-xl md:hidden animate-in zoom-in-95 fade-in duration-150">
            <div className="flex flex-col gap-1">
              <Link
                to={appHref}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <LogIn size={16} />
                </div>
                {loginLabel}
              </Link>
              <a
                href="https://t.me/mugallim_bot"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#27A7E7]/20">
                  <TelegramIcon size={16} className="text-[#27A7E7]" />
                </div>
                Открыть Telegram
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 pb-24 pt-28 md:px-6 md:pt-36">
        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 hidden"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <Reveal delay={50}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/80/10 px-4 py-2 text-sm font-semibold text-brand-300 backdrop-blur-sm">
              <GraduationCap size={15} />
              Для учителей Кыргызстана
            </div>
          </Reveal>

          <Reveal delay={150}>
            <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-[80px] lg:leading-[0.95]">
              <span className="block text-white">Правовая защита</span>
              <span className="block mt-3 text-brand-400">
                для каждого учителя
              </span>
            </h1>
          </Reveal>

          <Reveal delay={280}>
            <p className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed text-white/60 sm:text-xl">
              Умный AI-помощник отвечает на рабочие и юридические вопросы учителей.
              Конфиденциально, понятно и с опорой на закон.
            </p>
          </Reveal>

          <Reveal delay={380}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {HERO_POINTS.map((p) => (
                <div key={p} className="flex items-center gap-2 text-sm font-semibold text-white/50">
                  <CheckCircle2 size={14} className="text-brand-500" />
                  {p}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={480}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={appHref}
                className="group relative inline-flex h-14 w-full sm:w-auto min-w-[220px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-500/80 px-8 text-base font-bold text-ink-950 transition-all duration-300 hover:-translate-y-1 hover:bg-brand-400"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {heroLabel}
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="https://t.me/mugallim_bot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-14 w-full sm:w-auto min-w-[220px] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 text-base font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/10"
              >
                <TelegramIcon size={18} />
                Открыть Telegram
              </a>
              {shouldShowInstallAction && (
                <button
                  type="button"
                  onClick={() => void handleInstallClick()}
                  className="inline-flex h-14 w-full sm:w-auto min-w-[220px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 text-base font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:bg-white/10 hover:text-white"
                >
                  <Download size={18} />
                  Установить приложение
                </button>
              )}
            </div>
            {installMessage && (
              <p className="mt-5 text-sm font-medium text-white/40 animate-in fade-in">
                {installMessage}
              </p>
            )}
          </Reveal>

          <Reveal delay={620}>
            <div className="mx-auto mt-16 grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-12">
              {[
                { value: "24/7", label: "Доступен всегда" },
                { value: "2", label: "Канала связи" },
                { value: "100%", label: "Конфиденциально" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div
                    className="text-3xl font-black text-brand-400"
                    style={{ animation: "count-up 0.6s ease-out forwards" }}
                  >
                    {value}
                  </div>
                  <div className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── USE CASES ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-50 px-4 py-28 md:px-6">
        <div
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/4 rounded-full opacity-40 blur-[120px]"
          style={{ background: "radial-gradient(circle, #e2e8f0 0%, transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-14 text-center">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-500">
                <MessageCircle size={14} />
                Частые ситуации
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-ink-950 md:text-5xl">
                С чем обращаются учителя
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-slate-500">
                Реальные ситуации, которые разбирает сервис каждый день
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map(({ title, icon: Icon, desc }, index) => (
              <Reveal key={title} delay={index * 80}>
                <Link
                  to={appHref}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/30"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all duration-300 group-hover:bg-brand-500/100 group-hover:text-white">
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <h3 className="mb-2.5 text-lg font-bold text-ink-950 leading-snug">{title}</h3>
                  <p className="flex-1 text-sm font-medium leading-relaxed text-slate-500">{desc}</p>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-brand-500 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                    Спросить AI
                    <ArrowRight size={13} />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────── */}
      <section className="bg-white px-4 py-28 md:px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="mb-16 text-center">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-500">
                <CheckCircle2 size={14} />
                Как это работает
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-ink-950 md:text-5xl">
                Три простых шага
              </h2>
            </div>
          </Reveal>

          <div className="relative">
            {/* Connecting line — desktop */}
            <div className="absolute left-[calc(16.666%+28px)] right-[calc(16.666%+28px)] top-[28px] hidden h-px bg-gradient-to-r from-brand-500/20 via-brand-500 to-brand-500/20 md:block" />

            <div className="grid gap-12 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, index) => (
                <Reveal key={step.number} delay={index * 150}>
                  <div className="group flex flex-col items-center text-center md:items-start md:text-left">
                    {/* Step circle */}
                    <div className="relative mb-8 flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-500 bg-white text-lg font-black text-brand-500 transition-all duration-300 group-hover:bg-brand-500/100 group-hover:text-white md:z-10">
                      {index + 1}
                      {/* Pulse ring */}
                      <span className="absolute -inset-1.5 rounded-full border border-brand-500/20 group-hover:border-brand-500/40 transition-colors" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-ink-950">{step.title}</h3>
                    <p className="text-base font-medium leading-relaxed text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES DARK GRID ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink-950 px-4 py-28 md:px-6">
        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 hidden"
          aria-hidden="true"
        />
        {/* Glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[150px]"
          style={{ background: "radial-gradient(circle, #00c7ab 0%, transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-14 text-center">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-400">
                <Sparkles size={14} />
                Возможности
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                Всё что нужно учителю
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-white/50">
                Инструменты правовой защиты — в одном сервисе
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ title, description, icon: Icon }, index) => (
              <Reveal key={title} delay={index * 100}>
                <div className="group flex h-full flex-col rounded-2xl border border-transparent bg-white/4 p-7 transition-all duration-300 hover:border-brand-500/30 hover:bg-white/8 hover:-translate-y-1">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/80/10 text-brand-400 transition-all duration-300 group-hover:bg-brand-500/100 group-hover:text-ink-950 group-hover:border-brand-500">
                    <Icon size={22} />
                  </div>
                  <h3 className="mb-3 text-base font-bold leading-snug text-white">{title}</h3>
                  <p className="flex-1 text-sm font-medium leading-relaxed text-white/45">
                    {description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-ink-950 px-4 py-10 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex order-2 md:order-1 flex-col items-center md:items-start">
            <span className="mb-1 text-sm font-bold text-white">Mugallim AI</span>
            <p className="text-xs font-medium text-white/30">
              © {new Date().getFullYear()} Все права защищены
            </p>
          </div>

          <div className="flex order-1 md:order-2 flex-col md:flex-row items-center gap-4 md:gap-6 text-center text-xs font-semibold text-white/40">
            <Link to="/privacy" className="transition-colors hover:text-brand-400">
              Политика конфиденциальности
            </Link>
            <Link to="/terms" className="transition-colors hover:text-brand-400">
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
