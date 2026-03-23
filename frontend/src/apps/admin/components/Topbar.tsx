import { LogOut, Menu } from "lucide-react";

interface TopbarProps {
  username: string;
  onOpenMenu: () => void;
  onRequestLogout: () => void;
}

export default function Topbar({ username, onOpenMenu, onRequestLogout }: TopbarProps) {
  return (
    <header className="panel p-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button className="btn-muted mt-0.5 px-2.5 md:hidden" onClick={onOpenMenu} type="button" aria-label="Open menu">
            <Menu size={16} />
          </button>

          <div className="min-w-0">
            <p className="font-heading text-xl font-bold">Welcome, {username}</p>
            <p className="text-sm text-slate-400">Manage users, documents and access</p>
          </div>
        </div>

        <button className="btn-danger shrink-0" type="button" onClick={onRequestLogout}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
}
