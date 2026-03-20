import { ArrowRight, Bot, BriefcaseBusiness, FileSearch, MessageCircle, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../../core/auth";

const ISSUE_LABELS = [
  "Давление при увольнении",
  "Задержка зарплаты",
  "Перегрузка на работе",
  "Споры по договору",
  "Трудовые гарантии",
  "Вопросы по школьным правилам",
];

const VALUE_PILLS = [
  { label: "Быстрые ответы", icon: TimerReset },
  { label: "Для учителей", icon: BriefcaseBusiness },
  { label: "С опорой на документы", icon: FileSearch },
];

export default function LandingPage() {
  const { session } = useAuth();

  const primaryHref = session ? (session.user.role === "admin" ? "/admin" : "/app") : "/login";
  const secondaryHref = session ? "/app" : "/register";

  return (
    <main className="min-h-[100svh] bg-[#04070d] text-slate-100 md:min-h-screen">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:min-h-screen md:px-6 md:py-6">
        <header className="rounded-[28px] border border-[#1f3245] bg-[#09111d]/90 px-4 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.25)] md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#284863] bg-[#0f1d30] text-[#98f7ea]">
                <Bot size={18} />
              </div>
              <div>
                <p className="font-heading text-lg tracking-[0.08em] text-[#f5fffd]">Mugallim AI</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[#88b8c7]">{"Учителя / Права / Ясность"}</p>
              </div>
            </div>

            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2f5a72] bg-[#112235] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#d9fffa] transition hover:border-[#58dacc] hover:bg-[#16304b]"
            >
              <MessageCircle size={14} />
              {"Открыть Telegram-бота"}
            </a>
          </div>
        </header>

        <div className="mt-4 overflow-hidden rounded-[24px] border border-[#1d3042] bg-[#08111b] py-3 text-[#d8fcf6]">
          <div className="landing-marquee-track flex w-max items-center gap-8 px-4 text-[11px] uppercase tracking-[0.18em] md:px-6">
            {ISSUE_LABELS.concat(ISSUE_LABELS).map((label, index) => (
              <span key={`${label}-${index}`} className="whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
        </div>

        <section className="mt-4 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
          <div className="min-w-0 rounded-[32px] border border-[#1f3245] bg-[radial-gradient(circle_at_top_left,_rgba(80,214,197,0.18),_transparent_32%),linear-gradient(180deg,_rgba(8,15,25,0.96)_0%,_rgba(6,10,16,0.98)_100%)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)] md:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#30556a] bg-[#102133] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#a2f3e7]">
              <Sparkles size={12} />
              {"Юридическая помощь учителям"}
            </div>

            <h1 className="mt-6 max-w-3xl font-heading text-[3rem] leading-[0.92] text-[#f7fffd] md:text-[4.4rem]">
              {"Серьёзная помощь для работников школы, без юридического тумана."}
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
              {"Задавайте сложные трудовые и рабочие вопросы простым языком. Используйте веб-приложение для спокойных диалогов или открывайте Telegram-бота, когда нужен быстрый ответ."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={primaryHref}
                className="inline-flex min-w-44 items-center justify-center gap-2 rounded-full bg-[#9af5ea] px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#051411] transition hover:bg-[#b8fff6]"
              >
                {session ? "Продолжить" : "Войти"}
                <ArrowRight size={14} />
              </Link>
              <Link
                to={secondaryHref}
                className="inline-flex min-w-44 items-center justify-center rounded-full border border-[#35556e] bg-[#0c1827] px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#e7fbf8] transition hover:border-[#72dccc] hover:bg-[#12253b]"
              >
                {session ? "Открыть веб-чат" : "Создать аккаунт"}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {VALUE_PILLS.map(({ label, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-[#243a4f] bg-[#0d1827]/90 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#2f5065] bg-[#122235] text-[#9af5ea]">
                      <Icon size={16} />
                    </div>
                    <p className="text-sm font-semibold text-[#effffc]">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 grid gap-4">
            <aside className="min-w-0 rounded-[30px] border border-[#1f3245] bg-[#08111c] p-5 md:p-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[#8fcbbf]">
                <ShieldCheck size={13} />
                {"Частые ситуации"}
              </div>

              <div className="mt-4 grid gap-2">
                {ISSUE_LABELS.map((label, index) => (
                  <div
                    key={label}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-[#21384b] bg-[#0d1827] px-4 py-3 text-sm text-slate-200"
                  >
                    <span className="min-w-0 leading-5 text-slate-200">{label}</span>
                    <span className="pt-0.5 font-mono text-[11px] leading-none text-[#6fa6b7]">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                ))}
              </div>
            </aside>

            <aside className="min-w-0 rounded-[30px] border border-[#36576a] bg-[linear-gradient(180deg,_rgba(15,30,47,0.95)_0%,_rgba(7,15,25,0.98)_100%)] p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8dc6d8]">{"Два способа войти"}</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[#284863] bg-[#0d1928] p-4">
                  <p className="text-sm font-semibold text-[#f3fffd]">{"Веб-чат"}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{"Подходит для длинных сессий, сохранённых диалогов и спокойного рабочего пространства."}</p>
                </div>
                <div className="rounded-2xl border border-[#284863] bg-[#0d1928] p-4">
                  <p className="text-sm font-semibold text-[#f3fffd]">{"Telegram-бот"}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{"Подходит, когда нужен быстрый ответ на ходу."}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
