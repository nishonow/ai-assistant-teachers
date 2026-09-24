import {
  Download,
  ExternalLink,
  FileText,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import useDismissibleLayer from "../hooks/useDismissibleLayer";
import type { WebchatThemePreference } from "../utils/theme";
import type { ChatTextSize, SettingsTab } from "../utils/settings";

const TELEGRAM_URL = "https://t.me/mugallim_bot";

const TABS: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Профиль", icon: UserRound },
  { id: "appearance", label: "Внешний вид", icon: Palette },
  { id: "chats", label: "Чаты", icon: MessageSquare },
  { id: "app", label: "Приложение", icon: Smartphone },
];

const THEME_OPTIONS: { id: WebchatThemePreference; label: string; icon: LucideIcon }[] = [
  { id: "system", label: "Как в системе", icon: Monitor },
  { id: "light", label: "Светлая", icon: Sun },
  { id: "dark", label: "Тёмная", icon: Moon },
];

const TEXT_SIZE_OPTIONS: { id: ChatTextSize; label: string; sample: string }[] = [
  { id: "sm", label: "Мелкий", sample: "text-[13px]" },
  { id: "md", label: "Обычный", sample: "text-[15px]" },
  { id: "lg", label: "Крупный", sample: "text-[18px]" },
];

export interface ProfileValues {
  name: string;
  email: string;
  password: string;
}

interface SettingsModalProps {
  tab: SettingsTab | null;
  onTabChange: (tab: SettingsTab) => void;
  onClose: () => void;
  /** Keep the window open while a confirm dialog is stacked on top of it. */
  dismissDisabled?: boolean;
  userName: string;
  userEmail: string;
  onSaveProfile: (values: ProfileValues) => Promise<boolean>;
  themePreference: WebchatThemePreference;
  onThemeChange: (theme: WebchatThemePreference) => void;
  textSize: ChatTextSize;
  onTextSizeChange: (size: ChatTextSize) => void;
  conversationCount: number;
  historyPending: boolean;
  onDeleteAllHistory: () => void;
  showInstallAppAction: boolean;
  onInstallApp: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="wc-subtle mb-2 text-[11px] font-semibold uppercase tracking-[0.12em]">{children}</h3>;
}

function ProfileSection({
  userName,
  userEmail,
  onSaveProfile,
}: Pick<SettingsModalProps, "userName" | "userEmail" | "onSaveProfile">) {
  const id = useId();
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setName(userName);
    setEmail(userEmail);
  }, [userEmail, userName]);

  const dirty = name.trim() !== userName || email.trim() !== userEmail || password.length > 0;
  const avatarLetter = (name.trim() || userName).charAt(0).toUpperCase() || "U";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || pending) return;

    setPending(true);
    const saved = await onSaveProfile({ name: name.trim(), email: email.trim(), password });
    setPending(false);
    if (saved) setPassword("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3.5">
        <span className="webchat-account-avatar inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold">
          {avatarLetter}
        </span>
        <div className="min-w-0">
          <p className="wc-text truncate text-base font-semibold">{userName}</p>
          <p className="wc-muted truncate text-sm">{userEmail}</p>
        </div>
      </div>

      <div className="space-y-3.5">
        <label htmlFor={`${id}-name`} className="block">
          <span className="wc-text mb-1.5 block text-[13px] font-medium">Имя</span>
          <input id={`${id}-name`} className="input mt-0" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>

        <label htmlFor={`${id}-email`} className="block">
          <span className="wc-text mb-1.5 block text-[13px] font-medium">Email для входа</span>
          <input
            id={`${id}-email`}
            className="input mt-0"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
          />
        </label>

        <label htmlFor={`${id}-password`} className="block">
          <span className="wc-text mb-1.5 block text-[13px] font-medium">Новый пароль</span>
          <input
            id={`${id}-password`}
            className="input mt-0"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Оставьте пустым, чтобы не менять"
            autoComplete="new-password"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={!dirty || pending || !name.trim()}>
          <Save size={15} />
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

function AppearanceSection({
  themePreference,
  onThemeChange,
  textSize,
  onTextSizeChange,
}: Pick<SettingsModalProps, "themePreference" | "onThemeChange" | "textSize" | "onTextSizeChange">) {
  return (
    <div className="space-y-7">
      <section>
        <SectionTitle>Тема</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="webchat-settings-option flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-[13px] font-medium"
              aria-pressed={themePreference === id}
              onClick={() => onThemeChange(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
        <p className="wc-muted mt-2 text-xs">«Как в системе» следует настройке светлой или тёмной темы на устройстве.</p>
      </section>

      <section>
        <SectionTitle>Размер текста в чате</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_SIZE_OPTIONS.map(({ id, label, sample }) => (
            <button
              key={id}
              type="button"
              className="webchat-settings-option flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[13px] font-medium"
              aria-pressed={textSize === id}
              onClick={() => onTextSizeChange(id)}
            >
              <span className={`${sample} font-semibold leading-none`}>Аа</span>
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChatsSection({
  conversationCount,
  historyPending,
  onDeleteAllHistory,
}: Pick<SettingsModalProps, "conversationCount" | "historyPending" | "onDeleteAllHistory">) {
  return (
    <div className="space-y-7">
      <section>
        <SectionTitle>История</SectionTitle>
        <div className="webchat-settings-row flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div>
            <p className="wc-text text-sm font-medium">Сохранённые диалоги</p>
            <p className="wc-muted text-xs">Хранятся в вашем аккаунте и доступны на любом устройстве.</p>
          </div>
          <span className="wc-text shrink-0 text-lg font-semibold tabular-nums">{conversationCount}</span>
        </div>
      </section>

      <section>
        <SectionTitle>Опасная зона</SectionTitle>
        <div className="webchat-settings-row flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="wc-text text-sm font-medium">Удалить всю историю</p>
            <p className="wc-muted text-xs">Все диалоги будут удалены без возможности восстановления.</p>
          </div>
          <button
            type="button"
            className="btn-danger shrink-0"
            onClick={onDeleteAllHistory}
            disabled={historyPending || conversationCount === 0}
          >
            <Trash2 size={14} />
            {historyPending ? "Удаляем…" : "Удалить"}
          </button>
        </div>
      </section>

      <section>
        <SectionTitle>Документы</SectionTitle>
        <div className="space-y-1">
          {[
            { href: "/privacy", label: "Политика конфиденциальности", icon: ShieldCheck },
            { href: "/terms", label: "Пользовательское соглашение", icon: FileText },
          ].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="wc-hoverable wc-text flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm"
            >
              <Icon size={15} className="wc-muted" />
              <span className="flex-1">{label}</span>
              <ExternalLink size={13} className="wc-subtle" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function AppSection({ showInstallAppAction, onInstallApp }: Pick<SettingsModalProps, "showInstallAppAction" | "onInstallApp">) {
  return (
    <div className="space-y-7">
      <section>
        <SectionTitle>Mektep AI на телефоне</SectionTitle>
        <div className="webchat-settings-row flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="wc-text text-sm font-medium">Установить на главный экран</p>
            <p className="wc-muted text-xs">
              {showInstallAppAction
                ? "Открывается как приложение, без адресной строки браузера."
                : "Приложение уже установлено или этот браузер не поддерживает установку."}
            </p>
          </div>
          {showInstallAppAction ? (
            <button type="button" className="btn-muted shrink-0" onClick={onInstallApp}>
              <Download size={14} />
              Установить
            </button>
          ) : null}
        </div>
      </section>

      <section>
        <SectionTitle>Telegram</SectionTitle>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="webchat-settings-row wc-hoverable flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
        >
          <div>
            <p className="wc-text text-sm font-medium">Telegram-бот</p>
            <p className="wc-muted text-xs">Тот же помощник для быстрых вопросов на ходу.</p>
          </div>
          <ExternalLink size={15} className="wc-muted shrink-0" />
        </a>
      </section>
    </div>
  );
}

export default function SettingsModal(props: SettingsModalProps) {
  const { tab, onTabChange, onClose, dismissDisabled = false } = props;
  const titleId = useId();
  const modalRef = useDismissibleLayer<HTMLDivElement>({
    open: tab !== null,
    onDismiss: onClose,
    disabled: dismissDisabled,
  });

  if (!tab) return null;

  const activeLabel = TABS.find((item) => item.id === tab)?.label ?? "Настройки";

  return (
    <div className="modal-backdrop p-0 md:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-card flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none md:h-[min(620px,86vh)] md:max-w-[780px] md:flex-row md:rounded-[26px]"
      >
        {/* Navigation: side column on desktop, scrolling tab row on phones */}
        <nav
          aria-label="Разделы настроек"
          className="wc-divider shrink-0 border-b pt-[env(safe-area-inset-top)] md:w-[210px] md:border-b-0 md:border-r md:pt-0"
        >
          <div className="flex items-center justify-between px-4 pb-1 pt-3 md:px-5 md:pb-3 md:pt-5">
            <h2 id={titleId} className="wc-text text-lg font-semibold">
              Настройки
            </h2>
            <button type="button" className="wc-icon-btn inline-flex h-9 w-9 items-center justify-center rounded-full md:hidden" onClick={onClose} aria-label="Закрыть настройки">
              <X size={17} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1 px-2 pb-2 md:flex md:flex-col md:px-3 md:pb-3">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className="webchat-settings-nav flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium md:flex-row md:gap-2.5 md:rounded-xl md:px-3 md:text-left md:text-sm"
                aria-current={tab === id ? "page" : undefined}
                onClick={() => onTabChange(id)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <section className="flex min-h-0 flex-1 flex-col">
          <header className="hidden items-center justify-between px-6 pb-2 pt-5 md:flex">
            <h3 className="wc-text text-base font-semibold">{activeLabel}</h3>
            <button type="button" className="wc-icon-btn inline-flex h-9 w-9 items-center justify-center rounded-full" onClick={onClose} aria-label="Закрыть настройки">
              <X size={17} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-6 md:pt-3">
            {tab === "profile" ? (
              <ProfileSection userName={props.userName} userEmail={props.userEmail} onSaveProfile={props.onSaveProfile} />
            ) : null}
            {tab === "appearance" ? (
              <AppearanceSection
                themePreference={props.themePreference}
                onThemeChange={props.onThemeChange}
                textSize={props.textSize}
                onTextSizeChange={props.onTextSizeChange}
              />
            ) : null}
            {tab === "chats" ? (
              <ChatsSection
                conversationCount={props.conversationCount}
                historyPending={props.historyPending}
                onDeleteAllHistory={props.onDeleteAllHistory}
              />
            ) : null}
            {tab === "app" ? (
              <AppSection showInstallAppAction={props.showInstallAppAction} onInstallApp={props.onInstallApp} />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
