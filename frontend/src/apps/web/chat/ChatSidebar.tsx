import { LogOut, MessageSquarePlus, MoreHorizontal, PanelLeftClose, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ConversationSummary } from "./types";

interface ChatSidebarProps {
  activeConversationId: string | null;
  conversations: ConversationSummary[];
  hasHistory?: boolean;
  isMobileOpen: boolean;
  username: string;
  historyPending?: boolean;
  onCloseMobile: () => void;
  onCreateConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteAllHistory: () => void;
  onLogout: () => void;
}

export default function ChatSidebar({
  activeConversationId,
  conversations,
  hasHistory = false,
  isMobileOpen,
  username,
  historyPending = false,
  onCloseMobile,
  onCreateConversation,
  onSelectConversation,
  onDeleteAllHistory,
  onLogout,
}: ChatSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "П";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (!menuOpen) return;

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!isMobileOpen) {
      setMenuOpen(false);
    }
  }, [isMobileOpen]);

  return (
    <>
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex h-full w-[88vw] max-w-[22rem] flex-col overflow-hidden border-r border-[#21384b] bg-[#09111d] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] transition-[transform,opacity,visibility] duration-200 will-change-transform md:relative md:h-full md:w-[290px] md:max-w-none md:translate-x-0 md:border-b-0 md:border-l-0 md:border-r md:border-t-0 md:px-3 md:py-3 md:opacity-100 md:visible md:pointer-events-auto",
          isMobileOpen
            ? "translate-x-0 opacity-100 visible"
            : "-translate-x-[calc(100%+1.5rem)] pointer-events-none opacity-0 invisible",
        ].join(" ")}
      >
        <div className="mb-3 rounded-2xl border border-[#1e3448] bg-[#0a1624] p-3 md:border-0 md:bg-transparent md:p-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#284863] bg-[#0d1827] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-[#13253b]"
              onClick={onCreateConversation}
            >
              <MessageSquarePlus size={16} />
              Новый чат
            </button>
            <button type="button" className="btn-muted shrink-0 md:hidden" onClick={onCloseMobile}>
              <PanelLeftClose size={16} />
            </button>
          </div>
        </div>

        <div className="scroll-area min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Мои чаты</p>
          {conversations.length ? (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  onSelectConversation(conversation.id);
                  onCloseMobile();
                }}
                className={[
                  "w-full rounded-2xl border px-3 py-3 text-left text-sm transition-colors",
                  conversation.id === activeConversationId
                    ? "border-brand-400/35 bg-brand-500/15 text-slate-100"
                    : "border-transparent bg-transparent text-slate-300 hover:border-[#284863] hover:bg-[#102033]",
                ].join(" ")}
              >
                <p className="truncate font-medium">{conversation.title}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessagePreview || "Начните диалог"}</p>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[#284863] bg-[#0d1827]/70 px-4 py-5 text-sm leading-6 text-slate-400">
              Сохранённые чаты появятся здесь после того, как вы отправите первое сообщение.
            </div>
          )}
        </div>

        <div className="relative mt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]" ref={menuRef}>
          {menuOpen ? (
            <div className="absolute inset-x-0 bottom-[calc(100%+12px)] overflow-hidden rounded-2xl border border-[#284863] bg-[#0d1827] p-2">
              <div className="border-b border-[#21384b] px-3 py-2">
                <p className="truncate text-sm font-semibold text-slate-100">{username}</p>
              </div>
              <button
                type="button"
                className={[
                  "mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  historyPending || !hasHistory ? "cursor-not-allowed text-slate-500" : "text-slate-200 hover:bg-[#102033]",
                ].join(" ")}
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteAllHistory();
                }}
                disabled={historyPending || !hasHistory}
              >
                <Trash2 size={15} />
                {historyPending ? "Удаление истории..." : "Удалить всю историю"}
              </button>
              <button
                type="button"
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-200 transition-colors hover:bg-[#102033]"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={15} />
                Выйти
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#284863] bg-[#0d1827] px-3 py-3 text-left transition-colors hover:bg-[#102033]"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#2d5775] bg-[linear-gradient(180deg,_#14324c_0%,_#0c1827_100%)] text-sm font-semibold text-brand-300">
                {avatarLetter}
              </span>
              <p className="truncate text-sm font-semibold text-slate-100">{username}</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#284863] bg-[#09111d] text-slate-300">
              <MoreHorizontal size={16} />
            </span>
          </button>
        </div>
      </aside>

      {isMobileOpen ? <div className="fixed inset-0 z-30 bg-black/55 md:hidden" onClick={onCloseMobile} /> : null}
    </>
  );
}