import { MessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../core/auth";
import AuthShell from "./AuthShell";

interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const inputBaseClass =
  "mt-2 h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm text-slate-900 transition-all duration-200 ease-in-out placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: RegisterErrors = {};
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!normalizedName) {
      nextErrors.name = "Укажите имя.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Укажите email.";
    }

    if (!normalizedPassword) {
      nextErrors.password = "Укажите пароль.";
    }

    if (!normalizedConfirmPassword) {
      nextErrors.confirmPassword = "Повторите пароль.";
    } else if (normalizedPassword && normalizedPassword !== normalizedConfirmPassword) {
      nextErrors.confirmPassword = "Пароли не совпадают.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const session = await register({ name: normalizedName, email: normalizedEmail, password: normalizedPassword });
      navigate(session.user.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (registerError) {
      setErrors({
        email: registerError instanceof Error ? registerError.message : "Не удалось зарегистрироваться.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Создайте аккаунт"
      title="Регистрация"
      subtitle="Это займёт меньше минуты"
      footerText="Уже есть аккаунт?"
      footerLinkLabel="Войти"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <label className="block">
          <span className="text-[13px] font-semibold text-slate-700">Имя</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`auth-input ${inputBaseClass} ${errors.name ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20 bg-rose-50/30" : "border-slate-200"}`}
            placeholder="Ваше имя"
            autoComplete="name"
          />
          {errors.name ? <p className="mt-2 text-xs font-medium text-rose-500">{errors.name}</p> : null}
        </label>

        <label className="block">
          <span className="text-[13px] font-semibold text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`auth-input ${inputBaseClass} ${errors.email ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20 bg-rose-50/30" : "border-slate-200"}`}
            placeholder="name@example.com"
            autoComplete="email"
          />
          {errors.email ? <p className="mt-2 text-xs font-medium text-rose-500">{errors.email}</p> : null}
        </label>

        <label className="block">
          <span className="text-[13px] font-semibold text-slate-700">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`auth-input ${inputBaseClass} ${errors.password ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20 bg-rose-50/30" : "border-slate-200"}`}
            placeholder="Создайте пароль"
            autoComplete="new-password"
          />
          {errors.password ? <p className="mt-2 text-xs font-medium text-rose-500">{errors.password}</p> : null}
        </label>

        <label className="block">
          <span className="text-[13px] font-semibold text-slate-700">Повторите пароль</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={`auth-input ${inputBaseClass} ${errors.confirmPassword ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20 bg-rose-50/30" : "border-slate-200"}`}
            placeholder="Повторите пароль"
            autoComplete="new-password"
          />
          {errors.confirmPassword ? <p className="mt-2 text-xs font-medium text-rose-500">{errors.confirmPassword}</p> : null}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-500 px-4 text-[15px] font-bold text-ink-950 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-md disabled:pointer-events-none disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-brand-500/20 active:translate-y-0"
        >
          {loading ? "Создание аккаунта..." : "Создать аккаунт"}
        </button>

        <div className="relative pt-2">
          <div className="border-t border-slate-200" />
          <span className="absolute left-1/2 top-2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">или</span>
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
