import { ChevronsUpDown, CircleHelp, Download, LogOut, Monitor, Moon, MoreHorizontal, Pencil, Settings, Shield, SquarePen, Sun, Trash2, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";

import AnimatedTitle from "./AnimatedTitle";

import logoDark from "../../../../../logofull-dark.svg";
import logoLight from "../../../../../logofull.svg";

import type { WebchatResolvedTheme, WebchatThemePreference } from "../utils/theme";
import type { ConversationSummary } from "../utils/types";
import useDrawerVisibility from "../hooks/useDrawerVisibility";

interface ChatSidebarProps {
  activeConversationId: string | null;
  conversations: ConversationSummary[];
  loading?: boolean;
  isMobileOpen: boolean;
  username?: string | null;
  userEmail?: string | null;
  isAdmin?: boolean;
  titleAnimationTrigger?: number;
  onCloseMobile: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (conversation: ConversationSummary) => void;
  onDeleteConversation: (conversation: ConversationSummary) => void;
  onOpenSettings: () => void;
  onStartNewChat: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  showInstallAppAction?: boolean;
  onInstallApp?: () => void;
  onThemeChange: (themePreference: WebchatThemePreference) => void;
  themePreference: WebchatThemePreference;
  resolvedTheme: WebchatResolvedTheme;
}

interface SidebarListProps {
  activeConversationId: string | null;
  conversations: ConversationSummary[];
  loading: boolean;
  titleAnimationTrigger: number;
  onCloseMobile: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (conversation: ConversationSummary) => void;
  onDeleteConversation: (conversation: ConversationSummary) => void;
}

interface SidebarAccountMenuProps {
  avatarLetter: string;
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  username: string;
  userEmail: string;
  isAdmin: boolean;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  showInstallAppAction: boolean;
  onInstallApp: () => void;
  onThemeChange: (themePreference: WebchatThemePreference) => void;
  themePreference: WebchatThemePreference;
}

const TELEGRAM_HELP_URL = "https://t.me/mugallim_bot";

const THEME_CHOICES: { id: WebchatThemePreference; label: string; icon: typeof Sun }[] = [
  { id: "system", label: "Авто", icon: Monitor },
  { id: "light", label: "Светлая", icon: Sun },
  { id: "dark", label: "Тёмная", icon: Moon },
];

const MENU_ITEM_CLASS = "wc-menu-item flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors";

function SidebarBrand({ compact = false, resolvedTheme }: { compact?: boolean; resolvedTheme: WebchatResolvedTheme }) {
  const logo = resolvedTheme === "light" ? logoLight : logoDark;
  return (
    <div className={compact ? "px-1 py-0" : "mb-4 px-2 pt-1"}>
      <div className="inline-flex items-center">
        <img src={logo} alt="Mektep AI" className="h-8 w-auto object-contain" />
      </div>
    </div>
  );
}

function SidebarList({
  activeConversationId,
  conversations,
  loading,
  titleAnimationTrigger,
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
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="webchat-loading-card chat-card-enter rounded-full px-3 py-2.5"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="webchat-loading-line h-3 w-[68%] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-area min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-visible pr-2">
      {conversations.length ? (
        conversations.map((conversation) => (
          <div
            key={conversation.id}
            role="button"
            tabIndex={0}
            data-active={conversation.id === activeConversationId ? "true" : "false"}
            className={[
              "webchat-conversation-item chat-card-enter group isolate relative flex cursor-pointer items-center gap-2 rounded-full py-1 pl-4 pr-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70 md:hover:z-30 md:focus-within:z-30",
              openMenuId === conversation.id ? "z-20" : "z-0",
            ].join(" ")}
            onClick={() => {
              setOpenMenuId(null);
              onSelectConversation(conversation.id);
              onCloseMobile();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenMenuId(null);
                onSelectConversation(conversation.id);
                onCloseMobile();
              }
            }}
          >
            <div className="min-w-0 flex-1 self-center">
              <p className="truncate text-[13.5px] font-medium leading-5" title={conversation.title}>
                {conversation.id === activeConversationId ? (
                  <AnimatedTitle title={conversation.title} animationTrigger={titleAnimationTrigger} />
                ) : (
                  conversation.title
                )}
              </p>
            </div>

            <div className="relative z-30 shrink-0 self-center" data-chat-actions-menu>
                <button
                  type="button"
                  className={[
                  "webchat-chat-actions-trigger inline-flex h-8 w-8 items-center justify-center rounded-full transition-[opacity,color,background-color] duration-150",
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
                <div className="webchat-floating-menu absolute right-0 top-[calc(100%+8px)] z-40 min-w-[190px] rounded-[22px] p-1.5" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="wc-menu-item flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors"
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
                    role="menuitem"
                    className="wc-menu-item-danger flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors"
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
        <div className="webchat-empty-state rounded-3xl px-4 py-5 text-sm leading-6">
          У вас пока нет диалогов. Начните новый чат, чтобы продолжить.
        </div>
      )}
    </div>
  );
}

function SidebarAccountMenu({
  avatarLetter,
  menuOpen,
  setMenuOpen,
  username,
  userEmail,
  isAdmin,
  onOpenSettings,
  onOpenAdmin,
  onLogout,
  showInstallAppAction,
  onInstallApp,
  onThemeChange,
  themePreference,
}: SidebarAccountMenuProps) {
  const run = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className="relative py-2">
      {menuOpen ? (
        <div className="webchat-account-panel absolute inset-x-0 bottom-[calc(100%+10px)] z-40 rounded-[24px] p-1.5" role="menu">
          {/* Who is signed in */}
          <div className="flex items-center gap-3 px-2.5 pb-2.5 pt-2">
            <span className="webchat-account-avatar inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
              {avatarLetter}
            </span>
            <div className="min-w-0">
              <p className="wc-text truncate text-sm font-semibold">{username}</p>
              {userEmail && userEmail !== username ? <p className="wc-muted truncate text-xs">{userEmail}</p> : null}
            </div>
          </div>

          {/* Theme: three-way, including "follow the device" */}
          <div className="wc-divider border-t px-2.5 pb-2 pt-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="wc-text text-sm font-medium">
                Тема
                <span className="wc-muted font-normal"> · {THEME_CHOICES.find((choice) => choice.id === themePreference)?.label}</span>
              </p>
              <div className="webchat-theme-toggle inline-flex items-center gap-0.5 rounded-full p-0.5" role="group" aria-label="Тема">
                {THEME_CHOICES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className="webchat-theme-toggle-button inline-flex h-7 w-8 items-center justify-center rounded-full"
                    onClick={() => onThemeChange(id)}
                    aria-pressed={themePreference === id}
                    aria-label={label}
                    title={label}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="wc-divider border-t pt-1">
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={run(onOpenSettings)}>
              <Settings size={15} />
              Настройки
            </button>
            {isAdmin ? (
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={run(onOpenAdmin)}>
                <Shield size={15} />
                Админ-панель
              </button>
            ) : null}
            {showInstallAppAction ? (
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={run(onInstallApp)}>
                <Download size={15} />
                Установить на экран
              </button>
            ) : null}
            <a
              href={TELEGRAM_HELP_URL}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={() => setMenuOpen(false)}
            >
              <CircleHelp size={15} />
              Помощь в Telegram
            </a>
          </div>

          <div className="wc-divider mt-1 border-t pt-1">
            <button
              type="button"
              role="menuitem"
              className="wc-menu-item-danger flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors"
              onClick={run(onLogout)}
            >
              <LogOut size={15} />
              Выйти
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="webchat-account-button flex w-full items-center justify-between gap-3 rounded-full py-1.5 pl-1.5 pr-3 text-left transition-colors"
        onClick={() => setMenuOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="webchat-account-avatar inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
            {avatarLetter}
          </span>
          <p className="wc-text truncate text-sm font-semibold">{username}</p>
        </div>
        <ChevronsUpDown size={16} className="wc-muted shrink-0" />
      </button>
    </div>
  );
}

export default function ChatSidebar({
  activeConversationId,
  conversations,
  loading = false,
  isMobileOpen,
  username,
  userEmail,
  isAdmin = false,
  titleAnimationTrigger = 0,
  onCloseMobile,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  onStartNewChat,
  onOpenAdmin,
  onLogout,
  showInstallAppAction = false,
  onInstallApp = () => undefined,
  onThemeChange,
  themePreference,
  resolvedTheme,
}: ChatSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isVisible: mobileVisible, isClosing: mobileClosing } = useDrawerVisibility(isMobileOpen);
  const safeUsername = (username || "").trim() || "User";
  const mobileDrawerRef = useRef<HTMLElement | null>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);
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

  useEffect(() => {
    if (!isMobileOpen) return;
    const drawer = mobileDrawerRef.current;
    if (!drawer) return;
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();
    return () => {
      (drawerTriggerRef.current as HTMLElement | null)?.focus();
    };
  }, [isMobileOpen]);

  return (
    <>
      <aside className="webchat-sidebar-shell relative z-10 hidden h-full w-[262px] shrink-0 flex-col rounded-[30px] px-3 py-3 md:flex">
        <SidebarBrand resolvedTheme={resolvedTheme} />

        <button type="button" className="webchat-new-chat-button mb-4 flex w-full items-center justify-start gap-2.5 rounded-full px-4 py-2.5 text-left text-sm font-semibold" onClick={onStartNewChat}>
          <SquarePen size={16} />
          Новый чат
        </button>

        <div className="px-3 pb-1.5">
          <p className="wc-subtle text-[11px] font-semibold uppercase tracking-[0.16em]">Мои чаты</p>
        </div>

        <SidebarList
          activeConversationId={activeConversationId}
          conversations={conversations}
          loading={loading}
          titleAnimationTrigger={titleAnimationTrigger ?? 0}
          onCloseMobile={onCloseMobile}
          onSelectConversation={onSelectConversation}
          onRenameConversation={onRenameConversation}
          onDeleteConversation={onDeleteConversation}
        />

        <div className="webchat-sidebar-footer shrink-0">
          <div data-account-menu>
            <SidebarAccountMenu              avatarLetter={avatarLetter}              menuOpen={menuOpen}              setMenuOpen={setMenuOpen}              username={safeUsername}              userEmail={(userEmail || "").trim()}              isAdmin={isAdmin}              onOpenSettings={onOpenSettings}              onOpenAdmin={onOpenAdmin}              onLogout={onLogout}              showInstallAppAction={showInstallAppAction}              onInstallApp={onInstallApp}              onThemeChange={onThemeChange}              themePreference={themePreference}
            />
          </div>
        </div>
      </aside>

      {mobileVisible ? (
        <>
          <div
            className={[mobileClosing ? "drawer-overlay-exit" : "drawer-overlay-enter", "fixed inset-0 z-30 bg-black/30 backdrop-blur-[3px] md:hidden"].join(" ")}
            style={{ touchAction: 'manipulation' }}
            onClick={onCloseMobile}
          />
          <aside
            ref={mobileDrawerRef}
            aria-modal="true"
            role="dialog"
            className={["webchat-sidebar-shell wc-glass-strong fixed bottom-2 left-2 top-[calc(0.5rem+env(safe-area-inset-top))] z-40 flex w-[86vw] max-w-[21rem] flex-col overflow-hidden rounded-[30px] px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-3 md:hidden", mobileClosing ? "drawer-sheet-left-exit" : "drawer-sheet-left"].join(" ")}
            style={{ willChange: 'transform', transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="mb-3 flex items-center justify-between pl-1">
              <SidebarBrand compact resolvedTheme={resolvedTheme} />
              <button type="button" style={{ touchAction: 'manipulation' }} className="wc-icon-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full" onClick={onCloseMobile} aria-label="Закрыть меню">
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              className="webchat-new-chat-button mb-4 flex w-full items-center justify-start gap-2.5 rounded-full px-4 py-3 text-left text-[15px] font-semibold"
              onClick={() => {
                onStartNewChat();
                onCloseMobile();
              }}
            >
              <SquarePen size={16} />
              Новый чат
            </button>

            <div className="px-3 pb-1.5">
              <p className="wc-subtle text-[11px] font-semibold uppercase tracking-[0.16em]">Мои чаты</p>
            </div>

            <SidebarList
              activeConversationId={activeConversationId}
              conversations={conversations}
              loading={loading}
              titleAnimationTrigger={titleAnimationTrigger ?? 0}
              onCloseMobile={onCloseMobile}
              onSelectConversation={onSelectConversation}
              onRenameConversation={onRenameConversation}
              onDeleteConversation={onDeleteConversation}
            />

            <div className="webchat-sidebar-footer shrink-0">
              <div data-account-menu>
                <SidebarAccountMenu                  avatarLetter={avatarLetter}                  menuOpen={menuOpen}                  setMenuOpen={setMenuOpen}                  username={safeUsername}                  userEmail={(userEmail || "").trim()}                  isAdmin={isAdmin}                  onOpenSettings={onOpenSettings}                  onOpenAdmin={onOpenAdmin}                  onLogout={onLogout}                  showInstallAppAction={showInstallAppAction}                  onInstallApp={onInstallApp}                  onThemeChange={onThemeChange}                  themePreference={themePreference}
                />
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
