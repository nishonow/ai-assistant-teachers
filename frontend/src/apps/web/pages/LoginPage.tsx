import { MessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../core/auth";
import AuthShell from "./AuthShell";

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
          className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-500 px-4 text-[15px] font-bold text-ink-950 shadow-lg shadow-brand-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-brand-500/40 disabled:pointer-events-none disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500/40 active:translate-y-0"
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
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:text-white active:translate-y-0"
        >
          <MessageCircle size={17} />
          Открыть Telegram-бота
        </a>
      </form>
    </AuthShell>
  );
}
