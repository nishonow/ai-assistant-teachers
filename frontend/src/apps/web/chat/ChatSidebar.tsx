import { LogOut, MoreHorizontal, PanelLeftClose, Pencil, Shield, Trash2, UserRound } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";

import logo from "../../../../logo.png";

import type { ConversationSummary } from "./types";

interface ChatSidebarProps {
  activeConversationId: string | null;
  conversations: ConversationSummary[];
  hasHistory?: boolean;
  loading?: boolean;
  isMobileOpen: boolean;
  username?: string | null;
  isAdmin?: boolean;
  historyPending?: boolean;
  onCloseMobile: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (conversation: ConversationSummary) => void;
  onDeleteConversation: (conversation: ConversationSummary) => void;
  onDeleteAllHistory: () => void;
  onEditProfile: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

interface SidebarListProps {
  activeConversationId: string | null;
  conversations: ConversationSummary[];
  loading: boolean;
  onCloseMobile: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (conversation: ConversationSummary) => void;
  onDeleteConversation: (conversation: ConversationSummary) => void;
}

interface SidebarAccountMenuProps {
  avatarLetter: string;
  hasHistory: boolean;
  historyPending: boolean;
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  username: string;
  isAdmin: boolean;
  onDeleteAllHistory: () => void;
  onEditProfile: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

function SidebarBrand() {
  return (
    <div className="mb-5 px-2 py-1">
      <div className="inline-flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-white/5 md:h-11 md:w-11">
          <img
            src={logo}
            alt="Mugallim AI"
            className="h-[112%] w-[112%] rounded-[14px] object-contain"
          />
        </span>
        <p className="truncate font-heading text-lg tracking-[0.08em] text-[#f5fffd]">Mugallim AI</p>
      </div>
    </div>
  );
}

function SidebarList({
  activeConversationId,
  conversations,
  loading,
  onCloseMobile,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}: SidebarListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-chat-actions-menu]")) {
        setOpenMenuId(null);
      }
    }

    if (!openMenuId) return;

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openMenuId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    if (!openMenuId) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  if (loading && !conversations.length) {
    return (
      <div className="scroll-area min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mb-3 flex items-center justify-between gap-3 px-2 pb-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Мои чаты</p>
          <span className="inline-flex animate-pulse items-center justify-center rounded-full border border-[#305169] bg-[#102033] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-brand-200">
            Загрузка
          </span>
        </div>

        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="chat-card-enter animate-pulse rounded-[22px] border border-[#284863] bg-[#0f1c2c] px-3 py-3.5"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="h-4 w-[68%] rounded-full bg-slate-700/70" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded-full bg-slate-800/70" />
                <div className="h-3 w-[82%] rounded-full bg-slate-800/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-area min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-visible pr-2">
      <div className="flex items-center justify-between gap-3 px-2 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Мои чаты</p>
        {loading ? (
          <span className="inline-flex animate-pulse items-center justify-center rounded-full border border-[#305169] bg-[#102033] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-brand-200">
            Обновляем
          </span>
        ) : null}
      </div>

      {conversations.length ? (
        conversations.map((conversation) => (
          <div
            key={conversation.id}
                    className={[
                      "chat-card-enter group isolate relative flex items-center gap-2 rounded-2xl border px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 md:hover:z-30 md:focus-within:z-30",
              openMenuId === conversation.id ? "z-20" : "z-0",
              conversation.id === activeConversationId
                ? "border-brand-400/35 bg-brand-500/15 text-slate-100"
                : "border-transparent bg-transparent text-slate-300 hover:border-[#284863] hover:bg-[#102033]",
            ].join(" ")}
          >
            <button
              type="button"
                      className="min-w-0 flex-1 self-center text-left"
              onClick={() => {
                setOpenMenuId(null);
                onSelectConversation(conversation.id);
                onCloseMobile();
              }}
            >
              <div className="group/title relative min-w-0">
                <p className="truncate text-[13px] font-medium leading-5">{conversation.title}</p>
                <div className="pointer-events-none absolute left-0 top-full z-40 mt-2 hidden max-w-[18rem] rounded-xl border border-[#325774] bg-[#102033] px-3 py-2 md:group-hover/title:block">
                  <p
                    className="text-xs leading-5 text-slate-200"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {conversation.title}
                  </p>
                </div>
              </div>
            </button>

            <div className="relative z-30 shrink-0 self-center" data-chat-actions-menu>
              <button
                type="button"
                className={[
                  "inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-[opacity,color,background-color] duration-150",
                  "hover:bg-[#152638] hover:text-slate-200",
                  openMenuId === conversation.id ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                ].join(" ")}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuId((current) => (current === conversation.id ? null : conversation.id));
                }}
                aria-label="Действия чата"
              >
                <MoreHorizontal size={15} />
              </button>

              {openMenuId === conversation.id ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-40 min-w-[182px] rounded-2xl border border-[#3a6382] bg-[#152434] p-2 ring-1 ring-black/35 backdrop-blur-xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-100 transition-colors hover:bg-[#1c3045]"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(null);
                      onRenameConversation(conversation);
                    }}
                  >
                    <Pencil size={14} />
                    Переименовать
                  </button>
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-rose-200 transition-colors hover:bg-[#2a1d28]"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(null);
                      onDeleteConversation(conversation);
                    }}
                  >
                    <Trash2 size={14} />
                    Удалить
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-[#284863] bg-[#0d1827]/70 px-4 py-5 text-sm leading-6 text-slate-400">
          Сохранённые чаты появятся здесь после первого сообщения.
        </div>
      )}
    </div>
  );
}

function SidebarAccountMenu({
  avatarLetter,
  hasHistory,
  historyPending,
  menuOpen,
  setMenuOpen,
  username,
  isAdmin,
  onDeleteAllHistory,
  onEditProfile,
  onOpenAdmin,
  onLogout,
}: SidebarAccountMenuProps) {
  return (
    <div className="relative mt-3 border-t border-[#21384b] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 md:border-t-0 md:pt-0">
      {menuOpen ? (
        <div className="absolute inset-x-0 bottom-[calc(100%+12px)] z-40 rounded-2xl border border-[#3a6382] bg-[#152434] p-2 ring-1 ring-black/35 backdrop-blur-xl">
          <div className="border-b border-[#294459] px-3 py-2">
            <p className="truncate text-sm font-semibold text-slate-100">{username}</p>
          </div>
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-100 transition-colors hover:bg-[#1c3045]"
            onClick={() => {
              setMenuOpen(false);
              onEditProfile();
            }}
          >
            <UserRound size={15} />
            Профиль
          </button>
          {isAdmin ? (
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-100 transition-colors hover:bg-[#1c3045]"
              onClick={() => {
                setMenuOpen(false);
                onOpenAdmin();
              }}
            >
              <Shield size={15} />
              Админ панель
            </button>
          ) : null}
          <button
            type="button"
            className={[
              "mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
              historyPending || !hasHistory ? "cursor-not-allowed text-slate-500" : "text-slate-100 hover:bg-[#1c3045]",
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
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-rose-200 transition-colors hover:bg-[#2a1d28]"
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
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300">
          <MoreHorizontal size={16} />
        </span>
      </button>
    </div>
  );
}

export default function ChatSidebar({
  activeConversationId,
  conversations,
  hasHistory = false,
  loading = false,
  isMobileOpen,
  username,
  isAdmin = false,
  historyPending = false,
  onCloseMobile,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onDeleteAllHistory,
  onEditProfile,
  onOpenAdmin,
  onLogout,
}: ChatSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const safeUsername = (username || "").trim() || "User";
  const avatarLetter = useMemo(() => safeUsername.charAt(0).toUpperCase() || "U", [safeUsername]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-account-menu]")) {
        setMenuOpen(false);
      }
    }

    if (!menuOpen) return;

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (!menuOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!isMobileOpen) {
      setMenuOpen(false);
    }
  }, [isMobileOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseMobile();
      }
    }

    if (!isMobileOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen, onCloseMobile]);

  return (
    <>
      <aside className="sidebar-shell hidden h-full w-[290px] flex-col border-r border-[#21384b] bg-[#09111d] px-3 py-3 md:flex">
        <SidebarBrand />

        <SidebarList
          activeConversationId={activeConversationId}
          conversations={conversations}
          loading={loading}
          onCloseMobile={onCloseMobile}
          onSelectConversation={onSelectConversation}
          onRenameConversation={onRenameConversation}
          onDeleteConversation={onDeleteConversation}
        />

        <div data-account-menu>
          <SidebarAccountMenu
            avatarLetter={avatarLetter}
            hasHistory={hasHistory}
            historyPending={historyPending}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            username={safeUsername}
            isAdmin={isAdmin}
            onDeleteAllHistory={onDeleteAllHistory}
            onEditProfile={onEditProfile}
            onOpenAdmin={onOpenAdmin}
            onLogout={onLogout}
          />
        </div>
      </aside>

      {isMobileOpen ? (
        <>
          <div className="drawer-overlay-enter fixed inset-0 z-30 bg-[#020508]/70 md:hidden" onClick={onCloseMobile} />
          <aside className="drawer-sheet-left fixed inset-y-0 left-0 z-40 flex h-full w-[88vw] max-w-[22rem] flex-col overflow-hidden rounded-r-[32px] border-r border-[#1e3448]/60 bg-[#08121c]/85 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-2xl md:hidden">
            <div className="mb-3 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <SidebarBrand />
              </div>
              <button type="button" className="btn-muted shrink-0" onClick={onCloseMobile}>
                <PanelLeftClose size={16} />
              </button>
            </div>

            <SidebarList
              activeConversationId={activeConversationId}
              conversations={conversations}
              loading={loading}
              onCloseMobile={onCloseMobile}
              onSelectConversation={onSelectConversation}
              onRenameConversation={onRenameConversation}
              onDeleteConversation={onDeleteConversation}
            />

            <div data-account-menu>
              <SidebarAccountMenu
                avatarLetter={avatarLetter}
                hasHistory={hasHistory}
                historyPending={historyPending}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                username={safeUsername}
                isAdmin={isAdmin}
                onDeleteAllHistory={onDeleteAllHistory}
                onEditProfile={onEditProfile}
                onOpenAdmin={onOpenAdmin}
                onLogout={onLogout}
              />
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
