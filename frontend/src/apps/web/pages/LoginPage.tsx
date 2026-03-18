import { LockKeyhole, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../core/auth";

interface LoginLocationState {
  from?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = `${form.get("username") || ""}`.trim();
    const password = `${form.get("password") || ""}`.trim();

    setLoading(true);
    setError("");

    try {
      const session = await login({ username, password });
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
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="panel w-full max-w-md p-7 shadow-panel">
        <p className="font-heading text-xs uppercase tracking-[0.2em] text-brand-300">Mugallim AI</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-slate-100">Login</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in to your account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="text-sm text-slate-300">
            Email or username
            <div className="relative">
              <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="username" type="text" className="input pl-9" placeholder="name@example.com" required />
            </div>
          </label>

          <label className="text-sm text-slate-300">
            Password
            <div className="relative">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="password" type="password" className="input pl-9" placeholder="********" required />
            </div>
          </label>

          {error ? <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-400">
          No account?{" "}
          <Link to="/register" className="text-brand-300 hover:text-brand-400">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}


