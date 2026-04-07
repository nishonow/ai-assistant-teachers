import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BookOpen,
  Briefcase,
  Download,
  FileSearch,
  FileText,
  History,
  Menu,
  MessageCircle,
  Scale,
  SendHorizontal,
  ShieldCheck,
  X,
  LogIn,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import logo from "../../../../logo.png";

import { useAuth } from "../../../core/auth";
import usePwaInstallPrompt from "../hooks/usePwaInstallPrompt";

// Scroll reveal component for easy animations
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const STATS = ["24/7 доступ", "2 канала", "1 место для вопроса"];

const STEPS = [
  {
    number: "01",
    title: "Опишите ситуацию",
    description: "Расскажите о вопросе простыми словами, без сложной юридической формулировки.",
  },
  {
    number: "02",
    title: "Получите понятный ответ",
    description: "Сервис помогает отделить факты от советов и показывает, на что обратить внимание.",
  },
  {
    number: "03",
    title: "Сохраните и вернитесь позже",
    description: "История диалогов остаётся в веб-чате, чтобы к вопросу можно было спокойно вернуться.",
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

const USE_CASES_RICH = [
  { title: "Давление при увольнении", icon: AlertTriangle, desc: "Как защитить свои права, если вас принуждают уйти по собственному желанию." },
  { title: "Задержка зарплаты", icon: Banknote, desc: "Что делать, если выплаты задерживаются или не выплачиваются в полном объеме." },
  { title: "Перегрузка на работе", icon: Briefcase, desc: "Как законно отказаться от неоплачиваемых дополнительных часов и нагрузки." },
  { title: "Споры по договору", icon: FileText, desc: "Разбор спорных пунктов в трудовом контракте и должностных инструкциях." },
  { title: "Трудовые гарантии", icon: ShieldCheck, desc: "Защита отпусков, больничных и социальных гарантий преподавателя." },
  { title: "Школьные правила", icon: BookOpen, desc: "Правомерность локальных актов, приказов директора и внутренних уставов." },
];

export default function LandingPage() {
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const { canPromptInstall, canShowManualInstall, shouldShowInstallAction, promptInstall } = usePwaInstallPrompt();

  const appHref = session ? (session.user.role === "admin" ? "/admin" : "/app") : "/login";
  const loginLabel = "Войти";
  const heroLabel = "Войти в веб-чат";

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

      setInstallMessage("Установка пока недоступна. Обновите страницу или откройте меню браузера и выберите «Установить приложение».");
      return;
    }

    if (canShowManualInstall) {
      setInstallMessage("На iPhone откройте «Поделиться» и выберите «На экран Домой».");
      return;
    }

    setInstallMessage("Откройте меню браузера и выберите «Установить приложение». Если пункта нет, устройство не поддерживает установку.");
  }

  return (
    <main className="min-h-[100svh] bg-slate-50 text-slate-900 font-sans selection:bg-brand-500/30 overflow-hidden">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-3 text-slate-900 transition-opacity hover:opacity-80">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <img src={logo} alt="Mugalim AI" className="h-full w-full object-cover" />
            </span>
            <span className="text-xl font-bold tracking-tight">
              Mugalim AI
            </span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to={appHref}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-transparent px-4 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
            >
              {loginLabel}
            </Link>
            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
            >
              Открыть Telegram
            </a>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors duration-200 hover:bg-slate-50 md:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="absolute inset-x-0 top-full mt-2 mx-4 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-slate-900/5 md:hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="flex flex-col gap-1">
              <Link
                to={appHref}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold text-slate-900 transition-colors active:bg-slate-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <LogIn size={18} />
                </div>
                {loginLabel}
              </Link>
              <a
                href="https://t.me/mugallim_bot"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold text-slate-900 transition-colors active:bg-slate-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <MessageCircle size={18} />
                </div>
                Открыть Telegram
              </a>
            </div>
          </div>
        ) : null}
      </header>

      <section className="relative px-4 pb-20 pt-[148px] md:px-6 md:pb-24 md:pt-[184px]">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-1/4 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-brand-200/30 rounded-full blur-[120px] opacity-60 pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/4 left-0 -translate-x-1/2 w-[600px] h-[600px] bg-blue-200/30 rounded-full blur-[100px] opacity-40 pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '6s' }} />

        <div className="mx-auto max-w-5xl text-center">
          <Reveal delay={100}>
            <div className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
              Для учителей Кыргызстана
            </div>
          </Reveal>

          <Reveal delay={200}>
            <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-[72px] lg:leading-[1.1]">
              <span className="block">Юридическая помощь</span>
              <span className="block text-brand-500">учителям</span>
            </h1>
          </Reveal>

          <Reveal delay={300}>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600 sm:text-xl">
              Умный сервис для решения рабочих и правовых вопросов в школе. Быстро, конфиденциально и с опорой на закон.
            </p>
          </Reveal>

          <Reveal delay={400}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={appHref}
                className="group relative overflow-hidden inline-flex h-14 min-w-[220px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:bg-slate-800"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                {heroLabel}
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="https://t.me/mugallim_bot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-14 min-w-[220px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 hover:shadow-lg"
              >
                Открыть Telegram
              </a>
              {shouldShowInstallAction ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleInstallClick();
                  }}
                  className="inline-flex h-14 min-w-[220px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:bg-slate-50 hover:shadow-lg hover:text-brand-700"
                >
                  <Download size={18} />
                  Установить приложение
                </button>
              ) : null}
            </div>
          </Reveal>

          {installMessage ? <p className="mt-5 text-sm font-medium text-slate-500 animate-in fade-in">{installMessage}</p> : null}

          <Reveal delay={600} className="mx-auto mt-14 max-w-3xl border-t border-slate-200 pt-8">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-slate-500 sm:gap-8">
              {STATS.map((item, index) => (
                <div key={item} className="flex items-center gap-4 group">
                  {index > 0 ? <span className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-brand-400 transition-colors" /> : null}
                  <span className="text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-wider text-xs">{item}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white px-4 py-24 md:px-6 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="mx-auto max-w-[700px] rounded-[24px] border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-4 shadow-2xl shadow-slate-200/50 md:p-6 lg:p-8 transition-all duration-500 hover:shadow-brand-500/10 hover:border-brand-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100/50 text-brand-600 border border-brand-100">
                    <Scale size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">Mugalim AI</p>
                    <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                      </span>
                      Онлайн сейчас
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 py-8">
                <div className="flex justify-end animate-in slide-in-from-right-8 fade-in duration-700 delay-300">
                  <div className="max-w-[85%] rounded-[20px] rounded-tr-sm bg-slate-900 px-6 py-4 text-[15px] font-medium leading-relaxed text-slate-50 shadow-md">
                    Директор просит взять дополнительные часы без понятного оформления. Что лучше уточнить сначала?
                  </div>
                </div>

                <div className="flex justify-start animate-in slide-in-from-left-8 fade-in duration-700 delay-700">
                  <div className="max-w-[90%] rounded-[20px] rounded-tl-sm border border-slate-200 bg-white px-6 py-5 text-[15px] leading-relaxed text-slate-700 shadow-md">
                    <div className="mb-4 text-slate-800 font-medium whitespace-pre-wrap">
                      В первую очередь важно прояснить ключевые условия. 
                      Сначала уточните основание нагрузки, четкие сроки и размер оплаты. После этого попросите письменное подтверждение (приказ).
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                        <FileText size={14} /> Трудовой кодекс
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                        <ShieldCheck size={14} /> Внутренние правила
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                 <div className="flex gap-2 mb-2 animate-in fade-in zoom-in duration-500 delay-1000">
                    <span className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">А как отказаться?</span>
                    <span className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">Шаблон заявления</span>
                 </div>
                <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-slate-400 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all">
                  <span className="flex-1 text-sm font-medium">Опишите вашу ситуацию...</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-ink-950 transition-all hover:bg-brand-400 hover:scale-105 hover:shadow-md cursor-pointer">
                    <SendHorizontal size={18} />
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FREQUENT SITUATIONS REDESIGNED SECTION */}
      <section className="px-4 py-24 md:px-6 md:py-32 bg-slate-50 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-200/50 rounded-full blur-[100px] pointer-events-none opacity-50" />
        
        <div className="mx-auto max-w-6xl relative z-10">
          <Reveal>
            <div className="mb-14 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
                Частые ситуации
              </h2>
              <p className="mt-5 text-lg text-slate-600 font-medium">
                С какими вопросами коллеги обращаются к нам чаще всего
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {USE_CASES_RICH.map(({ title, icon: Icon, desc }, index) => (
              <Reveal key={title} delay={index * 150}>
                <div className="group relative flex flex-col items-start rounded-3xl bg-white p-8 border border-slate-200 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-200 overflow-hidden cursor-pointer h-full">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-brand-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out" />
                  
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 transition-colors duration-500 group-hover:bg-brand-500 group-hover:text-white mb-6 relative z-10">
                    <Icon size={26} strokeWidth={2} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-3 relative z-10 leading-tight">
                    {title}
                  </h3>
                  
                  <p className="text-slate-500 leading-relaxed font-medium text-sm relative z-10 flex-1">
                    {desc}
                  </p>
                  
                  <div className="mt-6 flex items-center font-bold text-brand-600 opacity-0 -translate-x-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0 relative z-10">
                    Спросить ИИ <ArrowRight size={16} className="ml-2" />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 md:px-6 md:py-32 bg-white">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-16 md:text-center max-w-3xl md:mx-auto">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
                Что умеет сервис
              </h2>
              <p className="mt-5 text-lg text-slate-600 font-medium">Все необходимые инструменты для правовой безопасности учителя.</p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            {FEATURES.map(({ title, description, icon: Icon }, index) => (
              <Reveal key={title} delay={index * 150}>
                <article
                  className="group flex flex-col sm:flex-row gap-6 rounded-[24px] border border-slate-200 bg-slate-50/50 p-6 md:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200 hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm text-brand-600 transition-transform duration-500 group-hover:scale-110 group-hover:bg-brand-50 border border-slate-100">
                    <Icon size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                    <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">{description}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 md:px-6 md:py-32 bg-slate-900 relative overflow-hidden">
        {/* Dark theme section for the CTA provides massive contrast */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/20 rounded-full blur-[150px] opacity-50" />
        
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-3 md:gap-8 relative z-10">
            {STEPS.map((step, index) => (
              <Reveal key={step.number} delay={index * 200}>
                <div className="relative group p-8 rounded-3xl hover:bg-white/5 transition-colors duration-300 border border-transparent hover:border-white/10">
                  <div className="text-[100px] font-black leading-none text-white/5 transition-all duration-500 group-hover:text-brand-500/20 absolute top-4 right-4 pointer-events-none">
                    {step.number}
                  </div>
                  <h2 className="mt-8 text-2xl font-bold text-white relative z-10">{step.title}</h2>
                  <p className="mt-4 text-base font-medium leading-relaxed text-slate-300 relative z-10">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-24 md:px-6 md:py-32 border-b border-slate-200">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-6xl">
              Готовы начать?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-xl font-medium leading-relaxed text-slate-600">
              Оформите свой первый вопрос и получите детальный, понятный ответ с опорой на закон.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={appHref}
                className="group inline-flex h-14 min-w-[240px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 text-base font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-slate-800 hover:shadow-2xl"
              >
                {heroLabel}
                <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>

            <p className="mt-8 text-sm font-bold uppercase tracking-wider text-slate-400">Без сложной регистрации · Защищенный веб-чат</p>
          </Reveal>
        </div>
      </section>

      <footer className="bg-slate-50 px-4 py-12 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Mugalim AI
            </span>
            <span className="text-sm font-bold text-slate-400">© {new Date().getFullYear()} Mugalim AI. Все права защищены.</span>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm font-bold text-slate-500">
            <Link to="/privacy" className="transition-colors hover:text-brand-600">
              Политика конфиденциальности
            </Link>
            <Link to="/terms" className="transition-colors hover:text-brand-600">
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
