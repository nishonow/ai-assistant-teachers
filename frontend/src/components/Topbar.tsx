import { LogOut, Menu } from "lucide-react";

interface TopbarProps {
  username: string;
  onOpenMenu: () => void;
  onRequestLogout: () => void;
}

export default function Topbar({ username, onOpenMenu, onRequestLogout }: TopbarProps) {
  return (
    <header className="panel p-3 md:p-4">
      <div className="flex items-center justify-between gap-2 md:hidden">
        <button className="btn-muted" onClick={onOpenMenu} type="button" aria-label="Open menu">
          <Menu size={16} />
          Menu
        </button>

        <button className="btn-danger" type="button" onClick={onRequestLogout}>
          <LogOut size={14} />
          Logout
        </button>
      </div>

      <div className="mt-3 md:mt-0 md:flex md:items-center md:justify-between md:gap-3">
        <div>
          <p className="font-heading text-xl font-bold">Welcome, {username}</p>
          <p className="text-sm text-slate-400">Manage users, documents and access</p>
        </div>

        <button className="btn-danger hidden md:inline-flex" type="button" onClick={onRequestLogout}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
}
