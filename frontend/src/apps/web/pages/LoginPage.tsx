import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../core/auth";
import AuthShell from "./AuthShell";

const TelegramIcon = ({ size = 24, className = "" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
  </svg>
);

interface LoginLocationState {
  from?: string;
}

interface LoginErrors {
  username?: string;
  password?: string;
}

const inputBase =
  "mt-2 h-11 w-full rounded-xl border bg-white/5 px-3.5 text-sm text-white transition-all duration-200 placeholder:text-white/25 focus:bg-white/8 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

const inputNormal = `${inputBase} border-white/10 focus:border-brand-500`;
const inputError = `${inputBase} border-rose-500/50 bg-rose-500/5 focus:border-rose-500 focus:ring-rose-500/20`;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: LoginErrors = {};
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    if (!normalizedUsername) nextErrors.username = "Укажите email или логин.";
    if (!normalizedPassword) nextErrors.password = "Укажите пароль.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const session = await login({ username: normalizedUsername, password: normalizedPassword });
      const fromPath = (location.state as LoginLocationState | null)?.from;

      if (fromPath?.startsWith("/app")) { navigate(fromPath, { replace: true }); return; }
      if (fromPath?.startsWith("/admin") && session.user.role === "admin") { navigate(fromPath, { replace: true }); return; }

      navigate(session.user.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (loginError) {
      setErrors({ password: loginError instanceof Error ? loginError.message : "Не удалось войти." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Добро пожаловать"
      title="Войти"
      subtitle="Введите данные для входа"
      footerText="Нет аккаунта?"
      footerLinkLabel="Создать"
      footerLinkTo="/register"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="text-[13px] font-semibold text-white/60">Email или логин</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={errors.username ? inputError : inputNormal}
            placeholder="name@example.com или login"
            autoComplete="username"
          />
          {errors.username && (
            <p className="mt-2 text-xs font-medium text-rose-400">{errors.username}</p>
          )}
        </label>

        <label className="block">
          <span className="text-[13px] font-semibold text-white/60">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={errors.password ? inputError : inputNormal}
            placeholder="Введите пароль"
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="mt-2 text-xs font-medium text-rose-400">{errors.password}</p>
          )}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-500 px-4 text-[15px] font-bold text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-400 disabled:pointer-events-none disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500/40 active:translate-y-0"
        >
          {loading ? "Вход…" : "Войти"}
        </button>

        <div className="relative py-1">
          <div className="border-t border-white/10" />
          <span className="absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2 bg-ink-950 px-3 text-[11px] font-bold uppercase tracking-widest text-white/25">
            или
          </span>
        </div>

        <a
          href="https://t.me/mugallim_bot"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-[#E5F4FA] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#27A7E7]/10 hover:text-white active:translate-y-0"
        >
          <TelegramIcon size={17} className="text-[#27A7E7]" />
          Открыть Telegram-бота
        </a>
      </form>
    </AuthShell>
  );
}
