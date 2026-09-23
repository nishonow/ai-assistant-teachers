import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../core/auth";
import AuthShell, { AuthField, TelegramAlternative } from "./AuthShell";

interface LoginLocationState {
  from?: string;
}

interface LoginErrors {
  username?: string;
  password?: string;
}


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
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          label="Email или логин"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          placeholder="name@example.com или login"
          autoComplete="username"
          autoCapitalize="none"
        />

        <AuthField
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="Введите пароль"
          autoComplete="current-password"
        />

        <button type="submit" disabled={loading} className="btn-primary mt-1 h-11 w-full text-[15px]">
          {loading ? <Loader2 size={17} className="animate-spin" /> : null}
          {loading ? "Вход…" : "Войти"}
        </button>

        <TelegramAlternative />
      </form>
    </AuthShell>
  );
}
