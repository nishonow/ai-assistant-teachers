import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BookOpen,
  BookOpenText,
  Briefcase,
  Check,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  GraduationCap,
  History,
  Menu,
  MessageCircle,
  Mic,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
  LogIn,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import logo from "../../../../logofull-dark.svg";

import { useAuth } from "../../../core/auth";
import LiquidBackdrop from "../../../core/components/LiquidBackdrop";
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
      { threshold: 0.06, rootMargin: "0px 0px -40px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      // No filter / will-change here: either would stop the glass inside from blurring what is behind it.
      className={`transition-[opacity,transform] duration-700 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
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

const TELEGRAM_URL = "https://t.me/mugallim_bot";

const NAV_LINKS = [
  { href: "#situations", label: "Ситуации" },
  { href: "#how", label: "Как это работает" },
  { href: "#features", label: "Возможности" },
];

const STEPS = [
  {
    title: "Опишите ситуацию",
    description: "Расскажите о вопросе простыми словами, без сложной юридической формулировки.",
  },
  {
    title: "Получите понятный ответ",
    description: "Сервис помогает отделить факты от советов и показывает, на что обратить внимание.",
  },
  {
    title: "Сохраните и вернитесь позже",
    description: "История диалогов остаётся в веб-чате, чтобы к вопросу можно было спокойно вернуться.",
  },
];

const FEATURES = [
  {
    title: "Пишите простыми словами",
    description: "Опишите ситуацию так, как рассказали бы её коллеге. Юридические формулировки не нужны.",
    icon: MessageCircle,
  },
  {
    title: "Ответы с опорой на документы",
    description: "Факт отделён от совета, а ориентиры по источникам остаются рядом с ответом.",
    icon: FileSearch,
  },
  {
    title: "История сохраняется",
    description: "Возвращайтесь к диалогам позже и продолжайте без потери контекста.",
    icon: History,
  },
  {
    title: "Telegram для быстрых вопросов",
    description: "Если нужен ответ на ходу, откройте Telegram-бота — тот же помощник.",
    icon: ShieldCheck,
  },
];

const USE_CASES = [
  {
    title: "Давление при увольнении",
    icon: AlertTriangle,
    desc: "Как защитить свои права, если вас принуждают уйти по собственному желанию.",
    question: "Меня заставляют написать заявление об увольнении по собственному желанию. Что мне делать?",
  },
  {
    title: "Задержка зарплаты",
    icon: Banknote,
    desc: "Что делать, если выплаты задерживаются или не выплачиваются в полном объеме.",
    question: "Школа задерживает мне зарплату. Куда обращаться и что я могу потребовать?",
  },
  {
    title: "Перегрузка на работе",
    icon: Briefcase,
    desc: "Как законно отказаться от неоплачиваемых дополнительных часов и нагрузки.",
    question: "Могу ли я отказаться от дополнительных часов и поручений, за которые не платят?",
  },
  {
    title: "Споры по договору",
    icon: FileText,
    desc: "Разбор спорных пунктов в трудовом контракте и должностных инструкциях.",
    question: "В моём трудовом договоре есть спорные пункты. Как понять, законны ли они?",
  },
  {
    title: "Трудовые гарантии",
    icon: ShieldCheck,
    desc: "Защита отпусков, больничных и социальных гарантий преподавателя.",
    question: "Какие гарантии по отпуску и больничному положены учителю?",
  },
  {
    title: "Школьные правила",
    icon: BookOpen,
    desc: "Правомерность локальных актов, приказов директора и внутренних уставов.",
    question: "Как проверить, законен ли приказ директора школы?",
  },
];

const STATS = [
  { value: "24/7", label: "Доступен всегда" },
  { value: "2", label: "Канала связи" },
  { value: "100%", label: "Конфиденциально" },
];

function askHref(question: string) {
  return `/app?q=${encodeURIComponent(question)}`;
}

/** Wide preview of the real app, so visitors see the product before signing in. */
function AppPreview() {
  return (
    <div className="glass-strong overflow-hidden rounded-[28px] p-2 sm:p-3">
      <div className="flex gap-3">
        {/* sidebar */}
        <div className="hidden w-[186px] shrink-0 flex-col rounded-[20px] bg-black/25 p-2.5 lg:flex">
          <div className="glass mb-3 flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-white">
            <Plus size={13} className="text-brand-300" />
            Новый чат
          </div>
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Мои чаты</p>
          {["Давление при увольнении", "Задержка зарплаты", "Отпуск и больничный"].map((item, index) => (
            <p
              key={item}
              className={`truncate rounded-full px-3 py-1.5 text-[12px] ${
                index === 0 ? "bg-white/10 text-white" : "text-white/55"
              }`}
            >
              {item}
            </p>
          ))}
        </div>

        {/* conversation */}
        <div className="min-w-0 flex-1 rounded-[20px] bg-black/25 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="glass truncate rounded-full px-3 py-1.5 text-[12px] font-medium text-white">
              Давление при увольнении
            </span>
            <span className="glass hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-white/70 sm:inline-flex">
              <BookOpenText size={12} />
              Источники
            </span>
          </div>

          <div className="space-y-2.5 px-0.5">
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-[18px] rounded-br-md bg-brand-400 px-3.5 py-2 text-[12.5px] leading-snug text-ink-950">
                Директор требует написать заявление «по собственному». Что делать?
              </p>
            </div>

            <div className="glass rounded-[18px] rounded-bl-md px-3.5 py-3 text-[12.5px] leading-relaxed text-white">
              <p>
                Нет. Увольнение по собственному желанию возможно только <b className="text-white">добровольно</b> — вы
                вправе отказаться писать заявление.
              </p>
              <ul className="mt-2 space-y-1.5 text-white/80">
                <li className="flex gap-2">
                  <Check size={13} className="mt-0.5 shrink-0 text-brand-300" />
                  Зафиксируйте требования письменно
                </li>
                <li className="flex gap-2">
                  <Check size={13} className="mt-0.5 shrink-0 text-brand-300" />
                  Сохраните копии приказов и переписки
                </li>
              </ul>
              <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[10.5px] font-medium text-white/70">
                <BookOpenText size={11} />
                Источники · 2
              </span>
            </div>
          </div>

          <div className="glass mt-3 flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5">
            <span className="flex-1 truncate text-[12.5px] text-white/40">Спросите Mektep AI…</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70">
              <Mic size={13} />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-400 text-ink-950">
              <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const { canPromptInstall, canShowManualInstall, shouldShowInstallAction, promptInstall } = usePwaInstallPrompt();

  const appHref = session ? "/app" : "/login";
  const heroLabel = session ? "Открыть веб-чат" : "Войти в веб-чат";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

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
    <main className="relative min-h-[100svh] overflow-x-hidden font-sans text-white">
      <LiquidBackdrop />

      {/* ─── NAV: floating glass capsule ─────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-6 md:pt-4">
        <nav
          className={`mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-full pl-5 pr-2 transition-all duration-500 ${
            scrolled || mobileMenuOpen ? "glass-strong" : "border border-transparent"
          }`}
          aria-label="Основная навигация"
        >
          <Link to="/" className="flex items-center transition-opacity hover:opacity-80">
            <img src={logo} alt="Mektep AI" className="h-8 w-auto object-contain" />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-1.5 md:flex">
            {!session ? (
              <Link
                to="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                Войти
              </Link>
            ) : null}
            <Link to={session ? "/app" : "/register"} className="btn-primary h-10 px-5">
              {session ? "Открыть чат" : "Начать"}
              <ArrowRight size={15} />
            </Link>
          </div>

          <button
            type="button"
            className="btn-icon md:hidden"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div
            className="glass-strong mx-auto mt-2 max-w-6xl origin-top rounded-[26px] p-2 md:hidden"
            style={{ animation: "popInSoft 240ms var(--lg-ease) both" }}
          >
            <div className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl px-4 py-3 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mx-3 my-1.5 h-px bg-white/10" />
              <Link
                to={appHref}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn size={17} className="text-brand-300" />
                {session ? "Открыть веб-чат" : "Войти"}
              </Link>
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                <TelegramIcon size={17} className="text-[#35b5f0]" />
                Открыть Telegram
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO: centred, with the app preview underneath ─────── */}
      <section className="relative z-10 px-4 pb-14 pt-28 text-center md:px-6 md:pb-20 md:pt-36">
        <div className="mx-auto max-w-3xl">
          <Reveal delay={40}>
            <div className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-brand-200">
              <GraduationCap size={15} />
              Для учителей Кыргызстана
            </div>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="font-heading text-[2.6rem] font-bold leading-[1.03] tracking-[-0.04em] sm:text-[3.5rem] lg:text-[4.25rem]">
              Правовая защита <span className="text-brand-300">для каждого учителя</span>
            </h1>
          </Reveal>

          <Reveal delay={220}>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-white/60 sm:text-lg">
              Умный AI-помощник отвечает на рабочие и юридические вопросы учителей. Конфиденциально, понятно и с
              опорой на закон.
            </p>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link to={appHref} className="btn-primary group h-12 px-7 text-[15px]">
                {heroLabel}
                <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="btn-muted h-12 px-6 text-[15px]">
                <TelegramIcon size={17} className="text-[#35b5f0]" />
                Открыть Telegram
              </a>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {["Без регистрации и ожидания", "Конфиденциально", "С опорой на закон"].map((p) => (
                <li key={p} className="flex items-center gap-1.5 text-sm font-medium text-white/55">
                  <CheckCircle2 size={15} className="text-brand-400" />
                  {p}
                </li>
              ))}
            </ul>

            {shouldShowInstallAction && (
              <button
                type="button"
                onClick={() => void handleInstallClick()}
                className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Download size={15} />
                Установить приложение на телефон
              </button>
            )}
            {installMessage && (
              <p className="glass mx-auto mt-4 max-w-md rounded-2xl px-4 py-3 text-sm text-white/70" role="status">
                {installMessage}
              </p>
            )}
          </Reveal>
        </div>

        <Reveal delay={440} className="mx-auto mt-12 max-w-5xl md:mt-16">
          <AppPreview />
        </Reveal>

        <Reveal delay={520}>
          <dl className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-2.5">
            {STATS.map(({ value, label }) => (
              <div key={label} className="glass flex items-center gap-2.5 rounded-full py-2 pl-4 pr-5">
                <dd className="font-heading text-lg font-bold text-brand-300">{value}</dd>
                <dt className="text-[13px] font-medium text-white/55">{label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* ─── SITUATIONS ─────────────────────────────────────────── */}
      <section id="situations" className="relative z-10 scroll-mt-24 px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-300">
                  <MessageCircle size={15} />
                  Частые ситуации
                </p>
                <h2 className="font-heading text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] md:text-[2.6rem]">
                  С чем обращаются учителя
                </h2>
              </div>
              <p className="max-w-sm text-[15px] leading-relaxed text-white/55">
                Выберите ситуацию — вопрос сразу появится в чате, останется только отправить.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map(({ title, icon: Icon, desc, question }, index) => (
              <Reveal key={title} delay={index * 60}>
                <Link
                  to={askHref(question)}
                  className="glass glass-interactive group flex h-full items-start gap-4 rounded-[24px] p-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-brand-200">
                    <Icon size={19} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <h3 className="text-[16px] font-semibold leading-snug text-white">{title}</h3>
                      <ArrowUpRight
                        size={16}
                        className="mt-0.5 shrink-0 text-white/35 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-300"
                      />
                    </span>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/55">{desc}</p>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS: timeline ─────────────────────────────── */}
      <section id="how" className="relative z-10 scroll-mt-24 px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="mb-10 text-center">
              <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-300">
                <CheckCircle2 size={15} />
                Как это работает
              </p>
              <h2 className="font-heading text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] md:text-[2.6rem]">
                Три простых шага
              </h2>
            </div>
          </Reveal>

          <ol className="relative space-y-3">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 100}>
                <li className="glass flex items-start gap-4 rounded-[24px] p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-400 font-heading text-[15px] font-bold text-ink-950">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-semibold text-white">{step.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-white/55">{step.description}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── FEATURES: bento ────────────────────────────────────── */}
      <section id="features" className="relative z-10 scroll-mt-24 px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-10 text-center md:mb-12">
              <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-300">
                <Sparkles size={15} />
                Возможности
              </p>
              <h2 className="font-heading text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] md:text-[2.6rem]">
                Всё что нужно учителю
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-3.5 md:grid-cols-2">
            {FEATURES.map(({ title, description, icon: Icon }, index) => (
              <Reveal key={title} delay={index * 70}>
                <div className="glass glass-interactive flex h-full items-start gap-4 rounded-[24px] p-5 md:p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-brand-200">
                    <Icon size={19} />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-semibold leading-snug text-white">{title}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/55">{description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ──────────────────────────────────────────── */}
      <section className="relative z-10 px-4 pb-16 pt-4 md:px-6 md:pb-24">
        <Reveal>
          <div className="glass-strong mx-auto max-w-5xl rounded-[30px] px-6 py-10 text-center md:px-12 md:py-14">
            <h2 className="font-heading text-[1.75rem] font-bold tracking-[-0.03em] md:text-[2.4rem]">
              Задайте первый вопрос прямо сейчас
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-white/60">
              Ответ появится за несколько секунд, а диалог сохранится в истории.
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link to={appHref} className="btn-primary h-12 px-7 text-[15px]">
                {heroLabel}
                <ArrowRight size={17} />
              </Link>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="btn-muted h-12 px-6 text-[15px]">
                <TelegramIcon size={17} className="text-[#35b5f0]" />
                Telegram-бот
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/10 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="order-2 flex flex-col items-center gap-1 md:order-1 md:items-start">
            <img src={logo} alt="Mektep AI" className="h-6 w-auto object-contain" />
            <p className="text-xs text-white/35">© {new Date().getFullYear()} Все права защищены</p>
          </div>

          <div className="order-1 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-white/50 md:order-2">
            <Link to="/privacy" className="rounded-full px-3 py-2 transition-colors hover:bg-white/5 hover:text-white">
              Политика конфиденциальности
            </Link>
            <Link to="/terms" className="rounded-full px-3 py-2 transition-colors hover:bg-white/5 hover:text-white">
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
