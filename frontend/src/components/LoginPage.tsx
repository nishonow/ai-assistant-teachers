import { LockKeyhole, UserRound } from "lucide-react";
import type { FormEvent } from "react";

interface LoginPageProps {
  loading: boolean;
  error: string;
  onSubmit: (username: string, password: string) => Promise<void>;
}

export default function LoginPage({ loading, error, onSubmit }: LoginPageProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = `${form.get("username") || ""}`.trim();
    const password = `${form.get("password") || ""}`.trim();
    await onSubmit(username, password);
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="panel w-full max-w-md p-7 shadow-panel">
        <p className="font-heading text-xs uppercase tracking-[0.2em] text-brand-300">Mugallim AI</p>
        <h1 className="mt-2 font-heading text-3xl font-bold">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in with backend admin credentials.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="text-sm text-slate-300">
            Username
            <div className="relative">
              <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="username" type="text" className="input pl-9" placeholder="admin" required />
            </div>
          </label>

          <label className="text-sm text-slate-300">
            Password
            <div className="relative">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input name="password" type="password" className="input pl-9" placeholder="********" required />
            </div>
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
