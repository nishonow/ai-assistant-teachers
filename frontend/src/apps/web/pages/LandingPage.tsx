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
  Scale,
  SendHorizontal,
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

  const appHref = session ? (session.user.role === "admin" ? "/admin" : "/app") : "/login";
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
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/10 bg-ink-950/90 backdrop-blur-xl shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
          <Link
            to="/"
            className="flex items-center gap-3 text-white transition-opacity hover:opacity-80"
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
              <img src={logo} alt="Mugalim AI" className="h-full w-full object-cover" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">Mugalim AI</span>
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
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:border-white/30"
            >
              Telegram
            </a>
            <Link
              to={appHref}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-500/80 px-4 text-sm font-bold text-ink-950 shadow-lg shadow-brand-500/30 transition-all duration-200 hover:bg-brand-400 hover:-translate-y-0.5"
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
          <div className="absolute inset-x-4 top-full mt-2 rounded-2xl border border-white/10 bg-ink-800/95 p-2 shadow-2xl backdrop-blur-xl md:hidden animate-in zoom-in-95 fade-in duration-150">
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/80/20">
                  <MessageCircle size={16} className="text-brand-400" />
                </div>
                Открыть Telegram
              </a>
              <Link
                to={appHref}
                className="mt-1 flex items-center justify-center rounded-xl bg-brand-500/80 px-4 py-3 text-sm font-bold text-ink-950"
                onClick={() => setMobileMenuOpen(false)}
              >
                Начать бесплатно
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 pb-24 pt-28 md:px-6 md:pt-36">
        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,199,171,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,199,171,0.07) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
          }}
        />

        {/* Glow orbs */}
        <div
          className="pointer-events-none absolute right-1/4 top-1/4 h-[700px] w-[700px] -translate-y-1/4 translate-x-1/4 rounded-full opacity-20 blur-[160px]"
          style={{ background: "radial-gradient(circle, #00c7ab 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-1/4 left-0 h-[500px] w-[500px] -translate-x-1/3 rounded-full opacity-15 blur-[120px]"
          style={{ background: "radial-gradient(circle, #2f4f74 0%, transparent 70%)" }}
        />

        {/* Floating decorative elements */}
        <div
          className="pointer-events-none absolute right-[8%] top-[20%] hidden opacity-20 lg:block"
          style={{ animation: "float 8s ease-in-out infinite" }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/80/10 backdrop-blur-sm">
            <Scale size={28} className="text-brand-400" />
          </div>
        </div>
        <div
          className="pointer-events-none absolute right-[15%] top-[55%] hidden opacity-15 lg:block"
          style={{ animation: "float-delayed 10s ease-in-out infinite" }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm">
            <FileText size={20} className="text-white/60" />
          </div>
        </div>
        <div
          className="pointer-events-none absolute left-[6%] top-[40%] hidden opacity-15 lg:block"
          style={{ animation: "float 12s ease-in-out infinite 2s" }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm">
            <BookOpen size={20} className="text-white/50" />
          </div>
        </div>

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
              <span
                className="block mt-3"
                style={{
                  background: "linear-gradient(90deg, #00c7ab 0%, #53f6dc 50%, #00c7ab 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "hero-shimmer 4s linear infinite",
                }}
              >
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
                className="group relative inline-flex h-14 min-w-[220px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-500/80 px-8 text-base font-bold text-ink-950 shadow-2xl shadow-brand-500/30 transition-all duration-300 hover:-translate-y-1 hover:bg-brand-400 hover:shadow-brand-500/50"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {heroLabel}
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="https://t.me/mugallim_bot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-14 min-w-[220px] items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 text-base font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/10"
              >
                Открыть Telegram
              </a>
              {shouldShowInstallAction && (
                <button
                  type="button"
                  onClick={() => void handleInstallClick()}
                  className="inline-flex h-14 min-w-[220px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 text-base font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:bg-white/10 hover:text-white"
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

      {/* ─── CHAT DEMO ──────────────────────────────────────────── */}
      <section className="bg-white px-4 py-28 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 md:grid-cols-2">
            {/* Left: description */}
            <Reveal>
              <div>
                <div className="mb-5 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-400">
                  <Sparkles size={15} />
                  Умный помощник
                </div>
                <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-ink-950 lg:text-5xl">
                  Задайте вопрос
                  <br />
                  <span className="text-brand-500">простыми словами</span>
                </h2>
                <p className="mt-5 text-lg font-medium leading-relaxed text-slate-500">
                  Опишите ситуацию как коллеге — сервис разберёт контекст и даст понятный ответ с
                  опорой на закон.
                </p>
                <div className="mt-8 space-y-3.5">
                  {[
                    "Без юридических терминов",
                    "Ответ за секунды",
                    "Ссылки на источники закона",
                    "История диалогов сохраняется",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-3 text-slate-700">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/80/15">
                        <CheckCircle2 size={14} className="text-brand-500" />
                      </div>
                      <span className="text-sm font-semibold">{point}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10">
                  <Link
                    to={appHref}
                    className="group inline-flex items-center gap-2 text-sm font-bold text-brand-500 transition-colors hover:text-brand-500"
                  >
                    Попробовать прямо сейчас
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* Right: chat preview */}
            <Reveal delay={150}>
              <div className="relative">
                {/* Glow behind card */}
                <div className="absolute -inset-4 rounded-3xl bg-brand-500/80/5 blur-xl" />

                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                    <div className="h-3 w-3 rounded-full bg-red-400/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <div className="h-3 w-3 rounded-full bg-green-400/80" />
                    <div className="mx-auto flex h-7 max-w-[180px] flex-1 items-center justify-center rounded-md bg-slate-100 px-3 text-xs font-medium text-slate-400">
                      mugalim.ai/app
                    </div>
                  </div>

                  {/* Chat header */}
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/80/15 text-brand-500">
                      <Scale size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">Mugalim AI</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500/80" />
                        </span>
                        Онлайн
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-5 px-5 py-6">
                    <div
                      className="flex justify-end"
                      style={{ animation: "chat-appear-right 0.5s ease-out 0.3s both" }}
                    >
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-ink-800 px-5 py-3.5 text-sm font-medium leading-relaxed text-white shadow-md">
                        Директор просит взять дополнительные часы без письменного оформления. Что
                        лучше уточнить?
                      </div>
                    </div>

                    <div
                      className="flex justify-start"
                      style={{ animation: "chat-appear-left 0.5s ease-out 0.9s both" }}
                    >
                      <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-900 mb-2.5">
                          В первую очередь уточните ключевые условия:
                        </p>
                        <ul className="space-y-1.5 text-slate-600">
                          <li className="flex gap-2">
                            <span className="mt-0.5 text-brand-500">•</span>
                            Основание нагрузки и чёткие сроки
                          </li>
                          <li className="flex gap-2">
                            <span className="mt-0.5 text-brand-500">•</span>
                            Размер и порядок оплаты
                          </li>
                          <li className="flex gap-2">
                            <span className="mt-0.5 text-brand-500">•</span>
                            Письменное подтверждение (приказ)
                          </li>
                        </ul>
                        <div className="mt-3.5 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/8 px-2.5 py-1 text-xs font-bold text-brand-400">
                            <FileText size={11} /> Трудовой кодекс
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/8 px-2.5 py-1 text-xs font-bold text-brand-400">
                            <ShieldCheck size={11} /> Внутренние правила
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Suggestion chips */}
                    <div
                      className="flex flex-wrap gap-2"
                      style={{ animation: "chat-appear-left 0.4s ease-out 1.4s both" }}
                    >
                      {["А как отказаться?", "Шаблон заявления"].map((chip) => (
                        <span
                          key={chip}
                          className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-500/10 hover:text-brand-400"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Input */}
                  <div className="border-t border-slate-100 px-5 pb-5 pt-3">
                    <div className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-400 transition-colors focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
                      <span className="flex-1 text-sm font-medium">
                        Опишите вашу ситуацию…
                      </span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/80 text-ink-950 transition-all hover:scale-105 hover:bg-brand-400 cursor-pointer">
                        <SendHorizontal size={15} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
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
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/30 hover:shadow-xl hover:shadow-brand-500/8"
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
                    <div className="relative mb-8 flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-500 bg-white text-lg font-black text-brand-500 shadow-lg shadow-brand-500/20 transition-all duration-300 group-hover:bg-brand-500/100 group-hover:text-white group-hover:shadow-brand-500/40 md:z-10">
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
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,199,171,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,199,171,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
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
                <div className="group flex h-full flex-col rounded-2xl border border-white/8 bg-white/4 p-7 transition-all duration-300 hover:border-brand-500/30 hover:bg-white/8 hover:-translate-y-1">
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

      {/* ─── FINAL CTA ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-32 md:px-6">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #030711 0%, #0d1b2d 40%, #0a3a32 70%, #030711 100%)",
          }}
        />
        {/* Teal glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[100px]"
          style={{ background: "radial-gradient(ellipse, #00c7ab 0%, transparent 70%)" }}
        />
        {/* Grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,199,171,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,199,171,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/80/10 px-4 py-2 text-sm font-semibold text-brand-300">
              <Scale size={15} />
              Ваш правовой помощник готов
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
              Начните прямо
              <br />
              <span className="text-brand-400">сейчас</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-xl font-medium leading-relaxed text-white/60">
              Задайте свой первый вопрос и получите детальный ответ с опорой на закон — бесплатно.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={appHref}
                className="group relative inline-flex h-14 min-w-[240px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-500/80 px-8 text-base font-bold text-ink-950 shadow-2xl shadow-brand-500/30 transition-all duration-300 hover:-translate-y-1 hover:bg-brand-400 hover:shadow-brand-500/50"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {heroLabel}
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="mt-8 text-xs font-bold uppercase tracking-widest text-white/30">
              Без сложной регистрации · Защищённый чат
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 bg-ink-950 px-4 py-10 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white/8">
              <img src={logo} alt="Mugalim AI" className="h-full w-full object-cover" />
            </span>
            <div>
              <span className="text-sm font-bold text-white">Mugalim AI</span>
              <p className="text-xs font-medium text-white/30">
                © {new Date().getFullYear()} Все права защищены
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-white/40">
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
