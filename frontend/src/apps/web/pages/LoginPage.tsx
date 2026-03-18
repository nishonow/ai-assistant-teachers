import { ArrowRight, LockKeyhole, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../core/auth";

interface LoginLocationState {
  from?: string;
}

const LOGIN_NOTES = [
  "Saved web conversations",
  "Direct access to the assistant",
  "Telegram remains available separately",
];

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
    <main className="min-h-screen bg-[#04070d] px-4 py-6 text-slate-100 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[32px] border border-[#1f3245] bg-[radial-gradient(circle_at_top_left,_rgba(73,210,193,0.16),_transparent_30%),linear-gradient(180deg,_rgba(8,15,25,0.98)_0%,_rgba(6,11,18,0.98)_100%)] p-6 md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2b5066] bg-[#0f1f31] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#98f7ea]">
            <ShieldCheck size={12} />
            Web access
          </div>

          <h1 className="mt-6 max-w-md font-heading text-4xl leading-[0.94] text-[#f7fffd] md:text-5xl">
            Return to your workspace.
          </h1>

          <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
            Sign in to continue your web conversations and use the assistant in a calmer, larger workspace.
          </p>

          <div className="mt-8 space-y-3">
            {LOGIN_NOTES.map((note) => (
              <div key={note} className="flex items-center gap-3 rounded-2xl border border-[#233a4e] bg-[#0d1827] px-4 py-3 text-sm text-slate-200">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#305169] bg-[#122235] text-[#9af5ea]">
                  <ArrowRight size={14} />
                </div>
                <span>{note}</span>
              </div>
            ))}
          </div>

          <a
            href="https://t.me/mugallim_bot"
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#35556e] bg-[#0d1827] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#ddfffa] transition hover:border-[#72dccc] hover:bg-[#14253a]"
          >
            <MessageCircle size={14} />
            Open Telegram Bot
          </a>
        </section>

        <section className="rounded-[32px] border border-[#1f3245] bg-[#08111c]/96 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.3)] md:p-8 lg:p-10">
          <div className="max-w-md">
            <p className="font-heading text-xs uppercase tracking-[0.22em] text-[#8fcbbf]">Mugallim AI</p>
            <h2 className="mt-2 font-heading text-3xl text-[#f7fffd]">Login</h2>
            <p className="mt-2 text-sm text-slate-400">Use your email or username and continue where you left off.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 max-w-md space-y-5">
            <label className="block text-sm text-slate-300">
              Email or username
              <div className="relative mt-2">
                <UserRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="username"
                  type="text"
                  className="input rounded-2xl border-[#294258] bg-[#0d1827] py-3 pl-11"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </label>

            <label className="block text-sm text-slate-300">
              Password
              <div className="relative mt-2">
                <LockKeyhole size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
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
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            No account?{" "}
            <Link to="/register" className="text-[#9af5ea] hover:text-[#c8fff8]">
              Register
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
