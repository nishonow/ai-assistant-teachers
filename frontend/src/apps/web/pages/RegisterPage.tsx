import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../core/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const name = `${form.get("name") || ""}`.trim();
    const email = `${form.get("email") || ""}`.trim();
    const password = `${form.get("password") || ""}`.trim();

    setLoading(true);
    setError("");

    try {
      const session = await register({ name, email, password });
      navigate(session.user.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="panel w-full max-w-md p-7 shadow-panel">
        <p className="font-heading text-xs uppercase tracking-[0.2em] text-brand-300">Mugallim AI</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-slate-100">Register</h1>
        <p className="mt-1 text-sm text-slate-400">Create your web account with email.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="text-sm text-slate-300">
            Full name
            <input name="name" type="text" className="input" placeholder="John Doe" required />
          </label>

          <label className="text-sm text-slate-300">
            Email
            <input name="email" type="email" className="input" placeholder="name@example.com" required />
          </label>

          <label className="text-sm text-slate-300">
            Password
            <input name="password" type="password" className="input" placeholder="********" required />
          </label>

          {error ? <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-300 hover:text-brand-400">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

