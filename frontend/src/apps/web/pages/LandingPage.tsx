import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Banknote,
  BookOpen,
  BookOpenText,
  Briefcase,
  Check,
  Clock,
  Download,
  FileSearch,
  FileText,
  GraduationCap,
  History,
  Lock,
  Menu,
  MessageCircle,
  Mic,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import logo from "../../../../logofull.svg";

import { useAuth } from "../../../core/auth";
import { useThemeColor } from "../chat/hooks/useThemeColor";
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
  { href: "#channels", label: "Веб и Telegram" },
];

const USE_CASES = [
  {
    title: "Давление при увольнении",
    chip: "Давление при увольнении",
    icon: AlertTriangle,
    desc: "Как защитить свои права, если вас принуждают уйти по собственному желанию.",
    question: "Меня заставляют написать заявление об увольнении по собственному желанию. Что мне делать?",
  },
  {
    title: "Задержка зарплаты",
    chip: "Задержка зарплаты",
    icon: Banknote,
    desc: "Что делать, если выплаты задерживаются или не выплачиваются в полном объеме.",
    question: "Школа задерживает мне зарплату. Куда обращаться и что я могу потребовать?",
  },
  {
    title: "Перегрузка на работе",
    chip: "Лишняя нагрузка",
    icon: Briefcase,
    desc: "Как законно отказаться от неоплачиваемых дополнительных часов и нагрузки.",
    question: "Могу ли я отказаться от дополнительных часов и поручений, за которые не платят?",
  },
  {
    title: "Трудовые гарантии",
    chip: "Отпуск и больничный",
    icon: ShieldCheck,
    desc: "Защита отпусков, больничных и социальных гарантий преподавателя.",
    question: "Какие гарантии по отпуску и больничному положены учителю?",
  },
  {
    title: "Споры по договору",
    chip: "Трудовой договор",
    icon: FileText,
    desc: "Разбор спорных пунктов в трудовом контракте и должностных инструкциях.",
    question: "В моём трудовом договоре есть спорные пункты. Как понять, законны ли они?",
  },
  {
    title: "Школьные правила",
    chip: "Приказ директора",
    icon: BookOpen,
    desc: "Правомерность локальных актов, приказов директора и внутренних уставов.",
    question: "Как проверить, законен ли приказ директора школы?",
  },
];

const STEPS = [
  {
    title: "Опишите ситуацию",
    description: "Своими словами, как рассказали бы коллеге. Юридические формулировки не нужны.",
  },
  {
    title: "Получите понятный ответ",
    description: "Сервис отделяет факты от советов и показывает, на что обратить внимание.",
  },
  {
    title: "Проверьте источники",
    description: "Документы, на которые опирается ответ, всегда рядом — их можно открыть и скачать.",
  },
];

const FEATURES = [
  { icon: MessageCircle, text: "Пишите простыми словами" },
  { icon: FileSearch, text: "Ответы с опорой на документы" },
  { icon: History, text: "История диалогов сохраняется" },
  { icon: Mic, text: "Можно задать вопрос голосом" },
];

const STATS = [
  { value: "24/7", label: "доступен всегда" },
  { value: "2", label: "канала: веб и Telegram" },
  { value: "100%", label: "конфиденциально" },
];

function askHref(question: string) {
  return `/app?q=${encodeURIComponent(question)}`;
}

/** Hero question box: the visitor asks right here and lands in the chat with it filled in. */
function AskBox() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const submit = () => {
    const question = value.trim();
    if (!question) {
      textareaRef.current?.focus();
      return;
    }
    navigate(askHref(question));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (event.key === "Enter" && !event.shiftKey && !isTouch) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div id="ask" className="relative scroll-mt-28">
      {/* Flat colour blocks the glass sits on — hard edges, no gradients */}
      <span aria-hidden="true" className="absolute -right-3 -top-7 h-40 w-40 rounded-[40px] bg-[#17dfc1] sm:-right-8 sm:h-52 sm:w-52 sm:rounded-[52px]" />
      <span aria-hidden="true" className="absolute -bottom-8 -left-4 h-32 w-32 rounded-full bg-[#0b1624] sm:-left-10 sm:h-44 sm:w-44" />
      <span aria-hidden="true" className="absolute -bottom-5 right-10 hidden h-16 w-16 rounded-full border-[10px] border-[#17dfc1] sm:block" />

      <form onSubmit={handleSubmit} className="lp-glass-strong relative rounded-[30px] p-3.5 sm:p-5">
        <div className="flex items-center gap-2 px-1 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b1624] text-[#17dfc1]">
            <MessageCircle size={14} />
          </span>
          <p className="text-[14px] font-semibold text-[#0b1624]">Спросите Mektep AI</p>
          <span className="ml-auto hidden items-center gap-1 text-xs text-[#5a6878] sm:inline-flex">
            <Clock size={12} />
            ответ за несколько секунд
          </span>
        </div>

        <label htmlFor="landing-ask" className="sr-only">
          Опишите вашу ситуацию
        </label>
        <textarea
          id="landing-ask"
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder="Например: директор требует написать заявление по собственному желанию. Что делать?"
          className="w-full resize-none rounded-2xl border border-[#0b1624]/10 bg-white/85 p-4 text-base leading-relaxed text-[#0b1624] placeholder:text-[#8a96a6] focus:border-[#0b1624]/30 focus:outline-none"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {USE_CASES.slice(0, 4).map((item) => (
            <button
              key={item.chip}
              type="button"
              className="lp-chip"
              onClick={() => {
                setValue(item.question);
                textareaRef.current?.focus();
              }}
            >
              {item.chip}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 px-1">
          <p className="flex items-center gap-1.5 text-xs text-[#5a6878]">
            <Lock size={12} />
            Конфиденциально
          </p>
          <button type="submit" className="lp-btn-primary h-11" disabled={!value.trim()}>
            Спросить
            <ArrowUp size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LandingPage() {
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const { canPromptInstall, canShowManualInstall, shouldShowInstallAction, promptInstall } = usePwaInstallPrompt();

  // Light page: keep Safari/Chrome toolbars, the page underlay and color-scheme light while here.
  useThemeColor("light");

  const appHref = session ? "/app" : "/login";
  const chatLabel = session ? "Открыть веб-чат" : "Войти в веб-чат";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
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
    <main className="min-h-[100svh] overflow-x-hidden bg-[#eef2f7] font-sans text-[#0b1624]">
      {/* ─── NAV: floating glass capsule ─────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-[calc(0.6rem+env(safe-area-inset-top))] md:px-6 md:pt-4">
        <nav
          className={`mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-full pl-5 pr-2 transition-colors duration-300 ${
            scrolled || mobileMenuOpen ? "lp-glass-strong" : "border border-transparent"
          }`}
          aria-label="Основная навигация"
        >
          <Link to="/" className="flex items-center" aria-label="Mektep AI — на главную">
            <img src={logo} alt="Mektep AI" className="h-7 w-auto object-contain" />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-[#0b1624]/65 transition-colors hover:bg-[#0b1624]/[0.05] hover:text-[#0b1624]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-1.5 md:flex">
            {!session ? (
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-[#0b1624]/75 transition-colors hover:bg-[#0b1624]/[0.05] hover:text-[#0b1624]">
                Войти
              </Link>
            ) : null}
            <Link to={session ? "/app" : "/register"} className="lp-btn-primary h-10 text-sm">
              {session ? "Открыть чат" : "Начать"}
            </Link>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0b1624]/10 bg-white/70 text-[#0b1624] md:hidden"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="lp-glass-strong mx-auto mt-2 max-w-6xl rounded-[26px] p-2 md:hidden" style={{ animation: "popInSoft 220ms var(--lg-ease) both" }}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block rounded-2xl px-4 py-3 text-[15px] font-medium text-[#0b1624]/80 hover:bg-[#0b1624]/[0.05]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 p-1">
              <Link to={appHref} className="lp-btn-primary h-11" onClick={() => setMobileMenuOpen(false)}>
                {session ? "Открыть чат" : "Войти"}
              </Link>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="lp-btn-ghost h-11">
                <TelegramIcon size={15} className="text-[#229ED9]" />
                Telegram
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO: ask right here ────────────────────────────────── */}
      <section className="px-4 pb-20 pt-28 md:px-6 md:pb-28 md:pt-36">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <Reveal delay={40}>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0b1624]/10 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#0b1624]/75">
                <GraduationCap size={15} className="text-[#0a9e88]" />
                Для учителей Кыргызстана
              </p>
            </Reveal>

            <Reveal delay={110}>
              <h1 className="font-heading text-[2.75rem] font-bold leading-[1.02] tracking-[-0.045em] text-[#0b1624] sm:text-[3.6rem] lg:text-[4.1rem]">
                Правовая защита для{" "}
                <span className="box-decoration-clone rounded-2xl bg-[#17dfc1] px-2.5 text-[#062a24]">каждого</span> учителя
              </h1>
            </Reveal>

            <Reveal delay={190}>
              <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-[#4a5868]">
                AI-помощник отвечает на рабочие и юридические вопросы учителей — понятно, конфиденциально и с
                опорой на закон.
              </p>
            </Reveal>

            <Reveal delay={260}>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                {["С опорой на закон", "Источники рядом с ответом", "Веб и Telegram"].map((point) => (
                  <li key={point} className="flex items-center gap-1.5 text-sm font-medium text-[#0b1624]/70">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17dfc1]/25 text-[#0a8f7c]">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={200} className="px-2 sm:px-6 lg:px-0">
            <AskBox />
          </Reveal>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────── */}
      <section id="how" className="scroll-mt-24 px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="max-w-xl font-heading text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] md:text-[2.6rem]">
              Три шага от вопроса до понятного ответа
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 100}>
                <li className="border-t-2 border-[#0b1624] pt-5">
                  <p className="font-heading text-[3.5rem] font-bold leading-none tracking-[-0.04em] text-[#0b1624]/15">
                    0{index + 1}
                  </p>
                  <h3 className="mt-4 text-[19px] font-semibold">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#4a5868]">{step.description}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── SITUATIONS ─────────────────────────────────────────── */}
      <section id="situations" className="scroll-mt-24 px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <h2 className="max-w-md font-heading text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] md:text-[2.6rem]">
                С чем обращаются учителя
              </h2>
              <p className="max-w-sm text-[15px] leading-relaxed text-[#4a5868]">
                Нажмите на ситуацию — вопрос сразу окажется в чате, останется только отправить.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map(({ title, icon: Icon, desc, question }, index) => (
              <Reveal key={title} delay={index * 50}>
                <Link to={askHref(question)} className="lp-card lp-card-link group flex h-full flex-col p-5 md:p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#17dfc1]/20 text-[#0a8f7c]">
                    <Icon size={20} strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
                  <p className="mt-1.5 flex-1 text-[14.5px] leading-relaxed text-[#4a5868]">{desc}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b1624]">
                    Спросить
                    <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NAVY BAND: numbers + what's inside ─────────────────── */}
      <section className="px-3 py-10 md:px-6 md:py-16">
        <Reveal>
          <div className="mx-auto max-w-6xl rounded-[36px] bg-[#0b1624] px-6 py-12 text-white md:px-12 md:py-16">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
              <div>
                <p className="text-sm font-semibold text-[#17dfc1]">Почему Mektep AI</p>
                <h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] md:text-[2.6rem]">
                  Ответ, которому можно доверять — источники всегда рядом
                </h2>
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {FEATURES.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-[15px] text-white/80">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#17dfc1]">
                        <Icon size={17} />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              <dl className="grid content-center gap-6 sm:grid-cols-3 lg:grid-cols-1">
                {STATS.map(({ value, label }) => (
                  <div key={label} className="flex items-baseline gap-4 border-t border-white/15 pt-5 lg:pt-6">
                    <dt className="sr-only">{label}</dt>
                    <dd className="font-heading text-[2.75rem] font-bold leading-none tracking-[-0.04em] text-white">{value}</dd>
                    <dd className="text-[15px] text-white/60" aria-hidden="true">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── CHANNELS: web + Telegram ───────────────────────────── */}
      <section id="channels" className="scroll-mt-24 px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="max-w-xl font-heading text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] md:text-[2.6rem]">
              Где удобнее — там и спрашивайте
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-3 md:grid-cols-2">
            <Reveal>
              <div className="lp-card flex h-full flex-col p-6 md:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1624] text-[#17dfc1]">
                  <BookOpenText size={22} />
                </span>
                <h3 className="mt-5 text-[22px] font-semibold tracking-[-0.01em]">Веб-чат</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4a5868]">
                  Полная версия: история диалогов, источники к каждому ответу, голосовой ввод.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2 pt-1">
                  <Link to={appHref} className="lp-btn-primary h-11">
                    {chatLabel}
                    <ArrowRight size={16} />
                  </Link>
                  {shouldShowInstallAction ? (
                    <button type="button" className="lp-btn-ghost h-11" onClick={() => void handleInstallClick()}>
                      <Download size={15} />
                      Установить
                    </button>
                  ) : null}
                </div>
                {installMessage ? (
                  <p className="mt-3 text-sm text-[#4a5868]" role="status">
                    {installMessage}
                  </p>
                ) : null}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="lp-card flex h-full flex-col p-6 md:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#229ED9] text-white">
                  <TelegramIcon size={22} />
                </span>
                <h3 className="mt-5 text-[22px] font-semibold tracking-[-0.01em]">Telegram-бот</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4a5868]">
                  Тот же помощник для быстрых вопросов на ходу — без регистрации и ожидания.
                </p>
                <div className="mt-6 pt-1">
                  <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="lp-btn-ghost h-11">
                    <TelegramIcon size={16} className="text-[#229ED9]" />
                    Открыть Telegram
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ──────────────────────────────────────────── */}
      <section className="px-4 pb-20 pt-4 md:px-6 md:pb-28">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-[2.2rem] font-bold leading-[1.05] tracking-[-0.04em] md:text-[3.2rem]">
              Есть вопрос о работе в школе?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-[#4a5868]">
              Опишите его своими словами — ответ появится за несколько секунд.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
              <a href="#ask" className="lp-btn-primary h-12 px-7">
                Задать вопрос
                <ArrowUp size={16} />
              </a>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="lp-btn-ghost h-12 px-6">
                <TelegramIcon size={16} className="text-[#229ED9]" />
                Telegram-бот
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-[#0b1624]/10 px-4 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-7 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 md:flex-row md:justify-between">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <img src={logo} alt="Mektep AI" className="h-6 w-auto object-contain" />
            <p className="text-xs text-[#0b1624]/45">© {new Date().getFullYear()} Все права защищены</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1 text-[13px] font-medium text-[#0b1624]/60">
            <Link to="/privacy" className="rounded-full px-3 py-2 transition-colors hover:bg-[#0b1624]/[0.05] hover:text-[#0b1624]">
              Политика конфиденциальности
            </Link>
            <Link to="/terms" className="rounded-full px-3 py-2 transition-colors hover:bg-[#0b1624]/[0.05] hover:text-[#0b1624]">
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
