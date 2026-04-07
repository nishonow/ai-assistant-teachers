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

const inputBaseClass =
  "mt-2 h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm text-slate-900 transition-all duration-200 ease-in-out placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10";

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

    if (!normalizedUsername) {
      nextErrors.username = "Укажите email или логин.";
    }

    if (!normalizedPassword) {
      nextErrors.password = "Укажите пароль.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const session = await login({ username: normalizedUsername, password: normalizedPassword });
      const fromPath = (location.state as LoginLocationState | null)?.from;

      if (fromPath?.startsWith("/app")) {
        navigate(fromPath, { replace: true });
        return;
      }

      if (fromPath?.startsWith("/admin") && session.user.role === "admin") {
        navigate(fromPath, { replace: true });
        return;
      }

      navigate(session.user.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (loginError) {
      setErrors({
        password: loginError instanceof Error ? loginError.message : "Не удалось войти.",
      });
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
      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <label className="block">
          <span className="text-[13px] font-semibold text-slate-700">Email или логин</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={`auth-input ${inputBaseClass} ${errors.username ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20 bg-rose-50/30" : "border-slate-200"}`}
            placeholder="name@example.com или login"
            autoComplete="username"
          />
          {errors.username ? <p className="mt-2 text-xs font-medium text-rose-500">{errors.username}</p> : null}
        </label>

        <label className="block">
          <span className="text-[13px] font-semibold text-slate-700">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`auth-input ${inputBaseClass} ${errors.password ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20 bg-rose-50/30" : "border-slate-200"}`}
            placeholder="Введите пароль"
            autoComplete="current-password"
          />
          {errors.password ? <p className="mt-2 text-xs font-medium text-rose-500">{errors.password}</p> : null}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-500 px-4 text-[15px] font-bold text-ink-950 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-md disabled:pointer-events-none disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-brand-500/20 active:translate-y-0"
        >
          {loading ? "Вход..." : "Войти"}
        </button>

        <div className="relative">
          <div className="border-t border-slate-200" />
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">или</span>
        </div>

        <a
          href="https://t.me/mugallim_bot"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:translate-y-0"
        >
          <MessageCircle size={18} />
          Открыть Telegram-бота
        </a>
      </form>
    </AuthShell>
  );
}
