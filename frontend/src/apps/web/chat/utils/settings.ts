export type SettingsTab = "profile" | "appearance" | "chats" | "app";
export type ChatTextSize = "sm" | "md" | "lg";

export const SETTINGS_TABS: readonly SettingsTab[] = ["profile", "appearance", "chats", "app"];

/** Query parameter that opens the settings window, e.g. `/app/chat/42?settings=profile`. */
export const SETTINGS_QUERY_PARAM = "settings";

export function parseSettingsTab(search: string): SettingsTab | null {
  const value = new URLSearchParams(search).get(SETTINGS_QUERY_PARAM);
  return SETTINGS_TABS.includes(value as SettingsTab) ? (value as SettingsTab) : null;
}

const TEXT_SIZE_STORAGE_KEY = "mektep-chat-text-size";

function isTextSize(value: string | null): value is ChatTextSize {
  return value === "sm" || value === "md" || value === "lg";
}

export function loadChatTextSize(): ChatTextSize {
  try {
    const stored = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    return isTextSize(stored) ? stored : "md";
  } catch {
    return "md";
  }
}

export function saveChatTextSize(size: ChatTextSize): void {
  try {
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, size);
  } catch {
    // Storage can be unavailable (private mode); the size simply won't persist.
  }
}
