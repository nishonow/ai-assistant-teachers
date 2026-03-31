import {
  ArrowRight,
  FileSearch,
  History,
  Menu,
  MessageCircle,
  Scale,
  SendHorizontal,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import logo from "../../../../logo.png";

import { useAuth } from "../../../core/auth";

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

const USE_CASES = [
  "Давление при увольнении",
  "Задержка зарплаты",
  "Перегрузка на работе",
  "Споры по договору",
  "Трудовые гарантии",
  "Школьные правила",
];

const landingBodyFont = { fontFamily: '"DM Sans", sans-serif' } as const;
const landingSerifFont = { fontFamily: '"Instrument Serif", serif' } as const;

export default function LandingPage() {
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const appHref = session ? (session.user.role === "admin" ? "/admin" : "/app") : "/login";
  const loginLabel = "Войти";
  const heroLabel = "Войти в веб-чат";

  return (
    <main className="min-h-[100svh] bg-[#fafaf8] text-[#1c1b18]" style={landingBodyFont}>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[rgba(0,0,0,0.07)] bg-[#fafaf8cc] backdrop-blur-[12px]">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-3 text-[#1c1b18]">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff]">
              <img src={logo} alt="Mugallim AI" className="h-full w-full object-cover" />
            </span>
            <span className="text-[1.55rem] leading-none" style={landingSerifFont}>
              Mugallim AI
            </span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to={appHref}
              className="inline-flex h-10 items-center justify-center rounded-[8px] border border-transparent px-4 text-sm font-medium text-[#1c1b18] transition-colors duration-150 ease-in-out hover:bg-[#f2f0eb]"
            >
              {loginLabel}
            </Link>
            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[#c4922a] bg-[#c4922a] px-4 text-sm font-medium text-[#ffffff] transition-colors duration-150 ease-in-out hover:bg-[#b78623]"
            >
              Открыть Telegram
            </a>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff] text-[#1c1b18] transition-colors duration-150 ease-in-out hover:bg-[#f2f0eb] md:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-[rgba(0,0,0,0.07)] bg-[#fafaf8] md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
              <Link
                to={appHref}
                className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff] px-4 text-sm font-medium text-[#1c1b18]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {loginLabel}
              </Link>
              <a
                href="https://t.me/mugallim_bot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[#c4922a] bg-[#c4922a] px-4 text-sm font-medium text-[#ffffff]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Открыть Telegram
              </a>
            </div>
          </div>
        ) : null}
      </header>

      <section className="px-4 pb-24 pt-[148px] md:px-6 md:pb-28 md:pt-[184px]">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center rounded-full border border-[#c4922a] bg-[#f8f1df] px-3 py-1 text-xs font-medium text-[#8d6718]">
            Для учителей Кыргызстана
          </div>

          <h1
            className="mt-8 text-[3.4rem] italic leading-[0.92] tracking-[-0.03em] text-[#1c1b18] sm:text-[4.5rem] lg:text-[72px]"
            style={landingSerifFont}
          >
            <span className="block">Юридическая помощь</span>
            <span className="block">учителям</span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-[17px] font-light leading-8 text-[#6b6960] md:text-[18px]">
            Спокойный сервис для рабочих и правовых вопросов в школе.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={appHref}
              className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-[8px] border border-[#c4922a] bg-[#c4922a] px-5 text-sm font-medium text-[#ffffff] transition-colors duration-150 ease-in-out hover:bg-[#b78623]"
            >
              {heroLabel}
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 min-w-[220px] items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff] px-5 text-sm font-medium text-[#1c1b18] transition-colors duration-150 ease-in-out hover:bg-[#f2f0eb]"
            >
              Открыть Telegram
            </a>
          </div>

          <div className="mx-auto mt-10 max-w-3xl border-t border-[rgba(0,0,0,0.07)] pt-5">
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-[#6b6960]">
              {STATS.map((item, index) => (
                <div key={item} className="flex items-center gap-3">
                  {index > 0 ? <span className="text-[#9a988f]">•</span> : null}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f2f0eb] px-4 py-24 md:px-6 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-[640px] rounded-[16px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:p-5">
            <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.07)] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.07)] bg-[#f2f0eb]">
                  <Scale size={16} className="text-[#c4922a]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1c1b18]">Mugallim AI</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[#6b6960]">
                    <span className="h-2 w-2 rounded-full bg-[#c4922a]" />
                    Онлайн
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 py-5">
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-[12px] border border-[rgba(0,0,0,0.07)] bg-[#f2f0eb] px-4 py-3 text-sm leading-7 text-[#1c1b18]">
                  Директор просит взять дополнительные часы без понятного оформления. Что лучше уточнить сначала?
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[86%] rounded-[12px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff] px-4 py-3 text-sm leading-7 text-[#1c1b18]">
                  <div className="border-l-2 border-[#c4922a] pl-3">
                    Сначала уточните основание нагрузки, сроки и оплату. Затем попросите письменное подтверждение.
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-[8px] border border-[#e6d6b2] bg-[#fbf6ea] px-3 py-1 text-xs text-[#8d6718]">
                      Трудовой кодекс
                    </span>
                    <span className="inline-flex items-center rounded-[8px] border border-[#e6d6b2] bg-[#fbf6ea] px-3 py-1 text-xs text-[#8d6718]">
                      Внутренние правила
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[12px] border border-[rgba(0,0,0,0.07)] bg-[#fafaf8] px-4 py-3 text-[#6b6960]">
              <span className="flex-1 text-sm">Опишите вашу ситуацию…</span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff] text-[#9b988e]">
                <SendHorizontal size={15} />
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-24 md:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step) => (
              <div key={step.number}>
                <div className="text-[72px] leading-none text-[#c7c3b8] md:text-[88px]" style={landingSerifFont}>
                  <span className="italic">{step.number}</span>
                </div>
                <h2 className="mt-5 text-xl font-medium text-[#1c1b18]">{step.title}</h2>
                <p className="mt-3 text-base leading-8 text-[#6b6960]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 md:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-[2.4rem] leading-tight text-[#1c1b18] md:text-[3rem]" style={landingSerifFont}>
              <span className="italic">Что умеет сервис</span>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-[12px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.07)] bg-[#f2f0eb] text-[#c4922a]">
                  <Icon size={18} />
                </div>
                <h3 className="mt-5 text-lg font-medium text-[#1c1b18]">{title}</h3>
                <p className="mt-3 text-base leading-8 text-[#6b6960]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 text-center md:px-6 md:py-28">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-[2.6rem] leading-tight text-[#1c1b18] md:text-[3.4rem]" style={landingSerifFont}>
            Частые ситуации
          </h2>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {USE_CASES.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-[8px] border border-[rgba(0,0,0,0.07)] bg-[#f2f0eb] px-4 py-2.5 text-sm text-[#1c1b18] transition-all duration-150 ease-in-out hover:border-[#c4922a] hover:bg-[#ffffff]"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f2f0eb] px-4 py-24 md:px-6 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-[2.8rem] leading-tight text-[#1c1b18] md:text-[3.6rem]" style={landingSerifFont}>
            <span className="italic">Готово к старту</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#6b6960]">
            Спокойный инструмент для ежедневных рабочих и правовых вопросов в школе.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={appHref}
              className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-[8px] border border-[#c4922a] bg-[#c4922a] px-5 text-sm font-medium text-[#ffffff] transition-colors duration-150 ease-in-out hover:bg-[#b78623]"
            >
              {heroLabel}
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 min-w-[220px] items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff] px-5 text-sm font-medium text-[#1c1b18] transition-colors duration-150 ease-in-out hover:bg-[#fafaf8]"
            >
              Открыть Telegram
            </a>
          </div>

          <p className="mt-5 text-sm text-[#6b6960]">Без регистрации через Telegram · Веб-чат с историей диалогов</p>
        </div>
      </section>

      <footer className="border-t border-[rgba(0,0,0,0.07)] px-4 py-6 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[1.4rem] leading-none text-[#1c1b18]" style={landingSerifFont}>
              Mugallim AI
            </span>
            <span className="text-sm text-[#6b6960]">© 2025 Mugallim AI</span>
          </div>

          <div className="flex items-center gap-5 text-sm text-[#6b6960]">
            <Link to={appHref} className="transition-colors duration-150 ease-in-out hover:text-[#1c1b18]">
              {loginLabel}
            </Link>
            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="transition-colors duration-150 ease-in-out hover:text-[#1c1b18]"
            >
              Telegram
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
