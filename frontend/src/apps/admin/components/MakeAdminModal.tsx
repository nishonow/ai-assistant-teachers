import { KeyRound, ShieldCheck, UserRound, X } from "lucide-react";
import { useMemo } from "react";
import type { FormEvent } from "react";
import type { MakeAdminPayload, UserRecord } from "../../../core/types";

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
    <div className="modal-backdrop">
      <div className="modal-card max-w-sm p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold">Make admin</h3>
            <p className="mt-0.5 text-[13px] text-slate-400">Set a login and password for {user.name || "this user"}.</p>
          </div>
          <button type="button" className="btn-icon h-8 w-8" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-[12px] font-medium text-slate-400">
            Admin login
            <div className="relative">
              <UserRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input h-9 rounded-xl py-0 pl-9 text-[13px]" type="text" name="login" defaultValue={defaults.login} required />
            </div>
          </label>

          <label className="block text-[12px] font-medium text-slate-400">
            Admin password
            <div className="relative">
              <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input h-9 rounded-xl py-0 pl-9 text-[13px]"
                type="password"
                name="password"
                minLength={4}
                placeholder="Create secure password"
                required
              />
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-muted btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={loading}>
              <ShieldCheck size={14} />
              {loading ? "Saving…" : "Grant admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


