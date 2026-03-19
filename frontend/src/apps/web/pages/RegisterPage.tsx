import { ArrowRight, BadgeCheck, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../../core/auth";

const REGISTER_NOTES = [
  "Создайте отдельный веб-аккаунт",
  "Храните свои диалоги в одном месте",
  "Пользуйтесь Telegram отдельно в любое время",
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const name = `${form.get("name") || ""}`.trim();
    const email = `${form.get("email") || ""}`.trim();
    const password = `${form.get("password") || ""}`.trim();

    setLoading(true);
    setError("");

    try {
      const session = await register({ name, email, password });
      navigate(session.user.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Не удалось зарегистрироваться.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100svh] bg-[#04070d] px-4 py-6 text-slate-100 md:min-h-screen md:px-6">
      <div className="mx-auto grid min-h-[calc(100svh-3rem)] w-full max-w-6xl gap-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:grid-cols-[0.95fr_1.05fr] md:min-h-[calc(100vh-3rem)]">
        <section className="rounded-[32px] border border-[#1f3245] bg-[radial-gradient(circle_at_top_left,_rgba(84,214,198,0.14),_transparent_30%),linear-gradient(180deg,_rgba(8,15,25,0.98)_0%,_rgba(6,11,18,0.98)_100%)] p-6 md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2b5066] bg-[#0f1f31] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#98f7ea]">
            <ShieldCheck size={12} />
            Веб-аккаунт
          </div>

          <h1 className="mt-6 max-w-md font-heading text-4xl leading-[0.94] text-[#f7fffd] md:text-5xl">
            Создайте своё пространство для юридической поддержки.
          </h1>

          <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
            Зарегистрируйтесь один раз и пользуйтесь веб-ассистентом с сохранёнными диалогами и более удобным рабочим пространством.
          </p>

          <div className="mt-8 space-y-3">
            {REGISTER_NOTES.map((note) => (
              <div key={note} className="flex items-center gap-3 rounded-2xl border border-[#233a4e] bg-[#0d1827] px-4 py-3 text-sm text-slate-200">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#305169] bg-[#122235] text-[#9af5ea]">
                  <BadgeCheck size={14} />
                </div>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-[#1f3245] bg-[#08111c]/96 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.3)] md:p-8 lg:p-10">
          <div className="max-w-md">
            <p className="font-heading text-xs uppercase tracking-[0.22em] text-[#8fcbbf]">Mugallim AI</p>
            <h2 className="mt-2 font-heading text-3xl text-[#f7fffd]">Регистрация</h2>
            <p className="mt-2 text-sm text-slate-400">Создайте веб-аккаунт по email и начинайте диалог.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 max-w-md space-y-5">
            <label className="block text-sm text-slate-300">
              Полное имя
              <div className="relative mt-2">
                <UserRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="name"
                  type="text"
                  className="input rounded-2xl border-[#294258] bg-[#0d1827] py-3 pl-11"
                  placeholder="Иван Иванов"
                  required
                />
              </div>
            </label>

            <label className="block text-sm text-slate-300">
              Email
              <div className="relative mt-2">
                <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="email"
                  type="email"
                  className="input rounded-2xl border-[#294258] bg-[#0d1827] py-3 pl-11"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </label>

            <label className="block text-sm text-slate-300">
              Пароль
              <div className="relative mt-2">
                <ShieldCheck size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="password"
                  type="password"
                  className="input rounded-2xl border-[#294258] bg-[#0d1827] py-3 pl-11"
                  placeholder="********"
                  required
                />
              </div>
            </label>

            {error ? <p className="rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

            <button type="submit" className="btn-primary w-full rounded-full py-3" disabled={loading}>
              {loading ? "Создание аккаунта..." : "Создать аккаунт"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-[#9af5ea] hover:text-[#c8fff8]">
              Войти
            </Link>
          </p>

          <div className="mt-8 rounded-2xl border border-[#233a4e] bg-[#0c1726] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#8ebfd1]">Быстрый путь</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Нужен более быстрый доступ на телефоне? После этого вы в любой момент сможете пользоваться Telegram.
            </p>
            <a
              href="https://t.me/mugallim_bot"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#9af5ea] transition hover:text-[#c8fff8]"
            >
              Открыть Telegram-бота
              <ArrowRight size={14} />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
