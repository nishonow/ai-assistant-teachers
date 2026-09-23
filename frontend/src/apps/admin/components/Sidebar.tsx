import { FileStack, LayoutDashboard, MessageSquare, ShieldCheck, Upload, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { TabId, TabItem } from "../../../core/types";

interface SidebarProps {
  items: TabItem[];
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  open: boolean;
  onClose: () => void;
}

const ICONS: Record<TabId, LucideIcon> = {
  overview: LayoutDashboard,
  users: Users,
  documents: FileStack,
  upload: Upload,
};

export default function Sidebar({ items, activeTab, onSelect, open, onClose }: SidebarProps) {
  return (
    <>
      <aside
        className={`sidebar-shell fixed bottom-3 left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 flex w-60 flex-col overflow-hidden rounded-[28px] p-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:bottom-4 md:left-4 md:top-4 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-[110%]"
        }`}
        aria-label="Admin navigation"
      >
        <div className="flex items-center justify-between gap-2 px-2 pb-4 pt-1.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-400 text-ink-950">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300">Mektep AI</p>
              <h2 className="font-heading text-base font-bold leading-tight text-white">Admin Panel</h2>
            </div>
          </div>
          <button className="btn-icon h-9 w-9 md:hidden" onClick={onClose} type="button" aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="scroll-area flex-1 space-y-1 overflow-y-auto">
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
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 pt-3">
          <Link to="/app" onClick={onClose} className="sidebar-item">
            <MessageSquare size={16} />
            <span>Go To App</span>
          </Link>
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-[3px] transition-opacity duration-300 md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
    </>
  );
}
