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
  "mt-2 h-11 w-full rounded-[8px] border bg-[#f2f0eb] px-3 text-sm text-[#1c1b18] transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:text-[#9b988e] focus:border-[#c4922a] focus:outline-none focus:ring-2 focus:ring-[#c4922a]/20";

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
      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="block">
          <span className="text-[13px] font-medium text-[#6b6960]">Email или логин</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={`auth-input ${inputBaseClass} ${errors.username ? "border-[#cc5f4a] focus:border-[#cc5f4a] focus:ring-[#cc5f4a]/15" : "border-[rgba(0,0,0,0.07)]"}`}
            placeholder="name@example.com или login"
            autoComplete="username"
          />
          {errors.username ? <p className="mt-2 text-xs text-[#cc5f4a]">{errors.username}</p> : null}
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-[#6b6960]">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`auth-input ${inputBaseClass} ${errors.password ? "border-[#cc5f4a] focus:border-[#cc5f4a] focus:ring-[#cc5f4a]/15" : "border-[rgba(0,0,0,0.07)]"}`}
            placeholder="Введите пароль"
            autoComplete="current-password"
          />
          {errors.password ? <p className="mt-2 text-xs text-[#cc5f4a]">{errors.password}</p> : null}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-[8px] border border-[#c4922a] bg-[#c4922a] px-4 text-sm font-medium text-[#ffffff] transition-colors duration-150 ease-in-out hover:bg-[#b78623] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Вход..." : "Войти"}
        </button>

        <div className="relative">
          <div className="border-t border-[rgba(0,0,0,0.07)]" />
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-[#ffffff] px-3 text-sm text-[#6b6960]">или</span>
        </div>

        <a
          href="https://t.me/mugallim_bot"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[rgba(0,0,0,0.07)] bg-[#ffffff] px-4 text-sm font-medium text-[#1c1b18] transition-colors duration-150 ease-in-out hover:bg-[#f2f0eb]"
        >
          <MessageCircle size={16} />
          Открыть Telegram-бота
        </a>
      </form>
    </AuthShell>
  );
}
