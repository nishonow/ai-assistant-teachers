import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../core/auth";
import AuthShell, { AuthField, TelegramAlternative } from "./AuthShell";

interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}


export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
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

    if (!normalizedName) nextErrors.name = "Укажите имя.";
    if (!normalizedEmail) nextErrors.email = "Укажите email.";
    if (!normalizedPassword) nextErrors.password = "Укажите пароль.";
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
      const fromPath = (location.state as { from?: string } | null)?.from;
      if (fromPath?.startsWith("/app")) {
        navigate(fromPath, { replace: true });
        return;
      }
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
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          label="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Ваше имя"
          autoComplete="name"
        />

        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="name@example.com"
          autoComplete="email"
          autoCapitalize="none"
        />

        <AuthField
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="Создайте пароль"
          autoComplete="new-password"
        />

        <AuthField
          label="Повторите пароль"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          placeholder="Повторите пароль"
          autoComplete="new-password"
        />

        <button type="submit" disabled={loading} className="btn-primary mt-1 h-11 w-full text-[15px]">
          {loading ? <Loader2 size={17} className="animate-spin" /> : null}
          {loading ? "Создание аккаунта…" : "Создать аккаунт"}
        </button>

        <TelegramAlternative />
      </form>
    </AuthShell>
  );
}
