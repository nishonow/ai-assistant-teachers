import { Menu } from "lucide-react";

interface TopbarProps {
  title: string;
  onOpenMenu: () => void;
}

/** Phone-only bar: menu button + current page. On desktop the sidebar holds everything. */
export default function Topbar({ title, onOpenMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 -mx-3 mb-3 flex h-12 items-center gap-2 bg-[#070d17]/80 px-3 backdrop-blur-xl md:hidden">
      <button className="btn-icon h-9 w-9" onClick={onOpenMenu} type="button" aria-label="Open menu">
        <Menu size={16} />
      </button>
      <p className="truncate text-[14px] font-semibold text-white">
        Mektep AI <span className="font-normal text-slate-400">· Admin</span>
      </p>
      <span className="sr-only">{title}</span>
    </header>
  );
}
