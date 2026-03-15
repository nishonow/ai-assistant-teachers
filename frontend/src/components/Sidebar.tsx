import { FileStack, LayoutDashboard, Upload, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TabId, TabItem } from "../lib/types";

interface SidebarProps {
  items: TabItem[];
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  open: boolean;
  onClose: () => void;
  apiBaseUrl: string;
}

const ICONS: Record<TabId, LucideIcon> = {
  overview: LayoutDashboard,
  users: Users,
  documents: FileStack,
  upload: Upload,
};

export default function Sidebar({ items, activeTab, onSelect, open, onClose, apiBaseUrl }: SidebarProps) {
  return (
    <>
      <aside
        className={`sidebar-shell fixed left-0 top-0 z-40 flex h-screen w-72 flex-col overflow-hidden p-5 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-ink-600/60 pb-4">
          <div>
            <p className="font-heading text-xs uppercase tracking-[0.2em] text-brand-300">Mugallim AI</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">Admin Panel</h2>
          </div>
          <button className="btn-muted p-2 md:hidden" onClick={onClose} type="button" aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="mt-5 flex-1 space-y-2">
          {items.map((item) => {
            const Icon = ICONS[item.id];
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`sidebar-item ${active ? "sidebar-item-active" : ""}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-ink-600/80 pt-4 text-xs text-slate-400">
          <p className="font-heading uppercase tracking-[0.15em]">API Endpoint</p>
          <p className="mt-2 break-all">{apiBaseUrl}</p>
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-30 bg-black/45 transition md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
    </>
  );
}
