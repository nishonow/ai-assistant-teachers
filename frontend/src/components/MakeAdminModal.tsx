import { KeyRound, ShieldCheck, UserRound, X } from "lucide-react";
import { useMemo } from "react";
import type { FormEvent } from "react";
import type { MakeAdminPayload, UserRecord } from "../lib/types";

interface MakeAdminModalProps {
  user: UserRecord | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: MakeAdminPayload) => Promise<void>;
}

export default function MakeAdminModal({ user, loading, onClose, onSubmit }: MakeAdminModalProps) {
  const defaults = useMemo(
    () => ({
      login: user?.username ? `${user.username}_admin` : `admin_${user?.id}`,
    }),
    [user]
  );

  if (!user) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const login = `${form.get("login") || ""}`.trim();
    const password = `${form.get("password") || ""}`.trim();
    await onSubmit({ login, password });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-ink-500 bg-ink-900/98 p-6 shadow-panel ring-1 ring-black/60">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-xs uppercase tracking-[0.15em] text-brand-300">Privilege Update</p>
            <h3 className="mt-1 font-heading text-2xl font-bold">Make Admin</h3>
            <p className="mt-1 text-sm text-slate-300">Set login and password for {user.name || "this user"}.</p>
          </div>
          <button type="button" className="btn-muted p-2" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="text-sm text-slate-200">
            Admin Login
            <div className="relative">
              <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" type="text" name="login" defaultValue={defaults.login} required />
            </div>
          </label>

          <label className="text-sm text-slate-200">
            Admin Password
            <div className="relative">
              <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                type="password"
                name="password"
                minLength={4}
                placeholder="Create secure password"
                required
              />
            </div>
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-muted" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <ShieldCheck size={14} />
              {loading ? "Saving..." : "Grant Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
