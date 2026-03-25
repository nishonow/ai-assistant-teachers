import type { ChatMessage, ChatSource, Conversation, ConversationSummary } from "./types";

export const RATE_LIMIT_WINDOW_SECONDS = 60;

export type ConversationOrderMode = "preserve" | "move-to-top";

export function createTransientMessage(role: ChatMessage["role"], content: string, sources?: ChatSource[]): ChatMessage {
  return {
    id: `temp-${crypto.randomUUID()}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    sources,
  };
}

export function getLatestAssistantMessage(conversation: Conversation | null): ChatMessage | null {
  if (!conversation) return null;

  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const message = conversation.messages[index];
    if (message.role === "assistant") {
      return message;
    }
  }

  return null;
}

export function resolveSelectedSources(
  conversation: Conversation | null,
  preferredMessageId: string | null,
): { messageId: string | null; sources: ChatSource[] } {
  if (!conversation) {
    return { messageId: null, sources: [] };
  }

  if (preferredMessageId) {
    const preferredMessage = conversation.messages.find(
      (message) => message.id === preferredMessageId && message.role === "assistant" && Boolean(message.sources?.length),
    );
    if (preferredMessage) {
      return { messageId: preferredMessage.id, sources: preferredMessage.sources || [] };
    }
  }

  const latestAssistantMessage = getLatestAssistantMessage(conversation);
  if (!latestAssistantMessage?.sources?.length) {
    return { messageId: null, sources: [] };
  }

  return {
    messageId: latestAssistantMessage.id,
    sources: latestAssistantMessage.sources,
  };
}

export function getConversationPreview(conversation: Conversation): string {
  const firstUserMessage = conversation.messages.find((message) => message.role === "user" && message.content.trim());
  return (firstUserMessage?.content || conversation.title).slice(0, 120);
}

export function toConversationSummary(conversation: Conversation): ConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    lastMessagePreview: getConversationPreview(conversation),
    messageCount: conversation.messages.length,
  };
}

export function sortConversationsByRecent(conversations: ConversationSummary[]): ConversationSummary[] {
  return [...conversations].sort((left, right) => {
    const leftTs = Date.parse(left.updatedAt || "");
    const rightTs = Date.parse(right.updatedAt || "");

    if (Number.isNaN(leftTs) && Number.isNaN(rightTs)) return 0;
    if (Number.isNaN(leftTs)) return 1;
    if (Number.isNaN(rightTs)) return -1;
    return rightTs - leftTs;
  });
}

export function upsertConversationSummary(
  conversations: ConversationSummary[],
  conversation: Conversation,
  mode: ConversationOrderMode = "preserve",
): ConversationSummary[] {
  const next = toConversationSummary(conversation);
  const existingIndex = conversations.findIndex((item) => item.id === next.id);

  if (mode === "move-to-top" || existingIndex === -1) {
    return sortConversationsByRecent([next, ...conversations.filter((item) => item.id !== next.id)]);
  }

  return sortConversationsByRecent(conversations.map((item) => (item.id === next.id ? next : item)));
}

export function isBlockedMessagingError(error: unknown): boolean {
  return error instanceof Error && /user is blocked/i.test(error.message);
}

export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /rate limit exceeded|too many requests|\(429\)/i.test(error.message);
}

export function localizeUserErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const message = error.message.trim();
  const normalized = message.toLowerCase();

  if (/rate limit exceeded|too many requests|\(429\)/i.test(message)) {
    return "Слишком много запросов. Подождите немного и попробуйте снова.";
  }
  if (/user is blocked/i.test(message)) {
    return "Пользователь заблокирован.";
  }
  if (/unauthorized|\(401\)/i.test(message)) {
    return "Сессия истекла. Войдите снова.";
  }
  if (/user mismatch|forbidden|\(403\)/i.test(message)) {
    return "Доступ запрещен.";
  }
  if (/conversation not found/i.test(message)) {
    return "Диалог не найден.";
  }
  if (/source not found/i.test(message)) {
    return "Источник для этого диалога не найден.";
  }
  if (/document not found|file not found/i.test(message)) {
    return "Документ не найден.";
  }
  if (/title is required/i.test(message)) {
    return "Укажите название диалога.";
  }
  if (/question and answer are required/i.test(message)) {
    return "Не удалось сохранить диалог.";
  }
  if (/request failed/i.test(message)) {
    return fallback;
  }

  return normalized ? message : fallback;
}
