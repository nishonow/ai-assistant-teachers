import { FileStack, LayoutDashboard, LogOut, MessageSquare, ShieldCheck, Upload, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { TabId, TabItem } from "../../../core/types";

interface SidebarProps {
  items: TabItem[];
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  open: boolean;
  onClose: () => void;
  username: string;
  onRequestLogout: () => void;
}

const ICONS: Record<TabId, LucideIcon> = {
  overview: LayoutDashboard,
  users: Users,
  documents: FileStack,
  upload: Upload,
};

export default function Sidebar({ items, activeTab, onSelect, open, onClose, username, onRequestLogout }: SidebarProps) {
  const initial = username.trim().charAt(0).toUpperCase() || "A";

  return (
    <>
      <aside
        className={`sidebar-shell fixed bottom-3 left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 flex w-[216px] flex-col overflow-hidden rounded-[22px] p-2.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-[115%]"
        }`}
        aria-label="Admin navigation"
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-2 px-1.5 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-400 text-ink-950">
              <ShieldCheck size={16} />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-white">Mektep AI</p>
              <p className="text-[11px] text-slate-400">Admin panel</p>
            </div>
          </div>
          <button className="btn-icon h-8 w-8 md:hidden" onClick={onClose} type="button" aria-label="Close menu">
            <X size={15} />
          </button>
        </div>

        {/* Navigation */}
        <p className="px-3 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">Manage</p>
        <nav className="scroll-area flex-1 space-y-0.5 overflow-y-auto">
          {items.map((item) => {
            const Icon = ICONS[item.id];
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`sidebar-item ${active ? "sidebar-item-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer: back to the chat + signed-in account */}
        <div className="space-y-1 border-t border-white/10 pt-2">
          <Link to="/app" onClick={onClose} className="sidebar-item">
            <MessageSquare size={15} />
            <span>Open web chat</span>
          </Link>

          <div className="flex items-center gap-2 rounded-xl px-1.5 py-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium text-white">{username}</p>
              <p className="text-[11px] text-slate-400">Administrator</p>
            </div>
            <button
              type="button"
              onClick={onRequestLogout}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
    </>
  );
}
