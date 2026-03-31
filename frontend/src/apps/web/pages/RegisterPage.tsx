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
  "mt-2 h-11 w-full rounded-[8px] border bg-[#f2f0eb] px-3 text-sm text-[#1c1b18] transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:text-[#9b988e] focus:border-[#c4922a] focus:outline-none focus:ring-2 focus:ring-[#c4922a]/20";

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
      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <label className="block">
          <span className="text-[13px] font-medium text-[#6b6960]">Имя</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${inputBaseClass} ${errors.name ? "border-[#cc5f4a] focus:border-[#cc5f4a] focus:ring-[#cc5f4a]/15" : "border-[rgba(0,0,0,0.07)]"}`}
            placeholder="Ваше имя"
            autoComplete="name"
          />
          {errors.name ? <p className="mt-2 text-xs text-[#cc5f4a]">{errors.name}</p> : null}
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-[#6b6960]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`${inputBaseClass} ${errors.email ? "border-[#cc5f4a] focus:border-[#cc5f4a] focus:ring-[#cc5f4a]/15" : "border-[rgba(0,0,0,0.07)]"}`}
            placeholder="name@example.com"
            autoComplete="email"
          />
          {errors.email ? <p className="mt-2 text-xs text-[#cc5f4a]">{errors.email}</p> : null}
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-[#6b6960]">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputBaseClass} ${errors.password ? "border-[#cc5f4a] focus:border-[#cc5f4a] focus:ring-[#cc5f4a]/15" : "border-[rgba(0,0,0,0.07)]"}`}
            placeholder="Создайте пароль"
            autoComplete="new-password"
          />
          {errors.password ? <p className="mt-2 text-xs text-[#cc5f4a]">{errors.password}</p> : null}
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-[#6b6960]">Повторите пароль</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={`${inputBaseClass} ${errors.confirmPassword ? "border-[#cc5f4a] focus:border-[#cc5f4a] focus:ring-[#cc5f4a]/15" : "border-[rgba(0,0,0,0.07)]"}`}
            placeholder="Повторите пароль"
            autoComplete="new-password"
          />
          {errors.confirmPassword ? <p className="mt-2 text-xs text-[#cc5f4a]">{errors.confirmPassword}</p> : null}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-[8px] border border-[#c4922a] bg-[#c4922a] px-4 text-sm font-medium text-[#ffffff] transition-colors duration-150 ease-in-out hover:bg-[#b78623] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Создание аккаунта..." : "Создать аккаунт"}
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
