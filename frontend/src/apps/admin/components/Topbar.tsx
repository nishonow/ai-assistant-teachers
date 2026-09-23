import { LogOut, Menu } from "lucide-react";

interface TopbarProps {
  username: string;
  onOpenMenu: () => void;
  onRequestLogout: () => void;
}

export default function Topbar({ username, onOpenMenu, onRequestLogout }: TopbarProps) {
  const initial = username.trim().charAt(0).toUpperCase() || "A";

  return (
    <header className="panel rounded-full p-1.5 md:pl-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <button className="btn-icon shrink-0 md:hidden" onClick={onOpenMenu} type="button" aria-label="Open menu">
            <Menu size={17} />
          </button>

          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-400 text-sm font-bold text-ink-950 md:flex">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-[15px] font-semibold text-white">Welcome, {username}</p>
            <p className="hidden truncate text-xs text-slate-400 sm:block">Manage users, documents and access</p>
          </div>
        </div>

        <button className="btn-danger h-9 shrink-0" type="button" onClick={onRequestLogout} aria-label="Logout">
          <LogOut size={15} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
