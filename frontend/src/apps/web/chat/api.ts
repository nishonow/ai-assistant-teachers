import { apiRequest, API_BASE_URL } from "../../../core/api";
import type { AuthSession } from "../../../core/auth";
import type { AskApiResponse, ChatMessage, ChatSource, Conversation, ConversationSummary } from "./types";

interface AskPayload {
  question: string;
  session: AuthSession;
  history: ChatMessage[];
}

interface SaveConversationExchangePayload {
  session: AuthSession;
  conversationId: string;
  question: string;
  answer: string;
  title?: string;
  sources?: ChatSource[];
}

interface CreateConversationPayload {
  session: AuthSession;
  title?: string;
}

interface RenameConversationPayload {
  session: AuthSession;
  conversationId: string;
  title: string;
}

interface DownloadConversationSourcePayload {
  session: AuthSession;
  conversationId: string;
  documentId: number;
}

export async function askAssistant({ question, session, history }: AskPayload): Promise<AskApiResponse> {
  return await apiRequest<AskApiResponse>({
    path: "/api/v1/ask/",
    method: "POST",
    token: session.token,
    body: {
      question,
      platform_user_id: session.user.id,
      platform: "web",
      name: session.user.displayName || session.user.username,
      username: session.user.username,
      history: history.map((item) => ({
        role: item.role,
        content: item.content,
      })),
    },
  });
}

export async function listConversations(session: AuthSession): Promise<ConversationSummary[]> {
  return await apiRequest<ConversationSummary[]>({
    path: "/api/v1/conversations/",
    token: session.token,
  });
}

export async function createConversation({ session, title }: CreateConversationPayload): Promise<Conversation> {
  return await apiRequest<Conversation>({
    path: "/api/v1/conversations/",
    method: "POST",
    token: session.token,
    body: { title },
  });
}

export async function deleteAllConversations(session: AuthSession): Promise<void> {
  await apiRequest<{ ok: boolean }>({
    path: "/api/v1/conversations/",
    method: "DELETE",
    token: session.token,
  });
}

export async function getConversation(session: AuthSession, conversationId: string): Promise<Conversation> {
  return await apiRequest<Conversation>({
    path: `/api/v1/conversations/${conversationId}`,
    token: session.token,
  });
}

export async function deleteConversation(session: AuthSession, conversationId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>({
    path: `/api/v1/conversations/${conversationId}`,
    method: "DELETE",
    token: session.token,
  });
}

export async function renameConversation({
  session,
  conversationId,
  title,
}: RenameConversationPayload): Promise<Conversation> {
  return await apiRequest<Conversation>({
    path: `/api/v1/conversations/${conversationId}`,
    method: "PATCH",
    token: session.token,
    body: { title },
  });
}

export async function saveConversationExchange({
  session,
  conversationId,
  question,
  answer,
  title,
  sources,
}: SaveConversationExchangePayload): Promise<Conversation> {
  return await apiRequest<Conversation>({
    path: `/api/v1/conversations/${conversationId}/exchange`,
    method: "POST",
    token: session.token,
    body: { question, answer, title, sources },
  });
}

export async function downloadConversationSource({
  session,
  conversationId,
  documentId,
}: DownloadConversationSourcePayload): Promise<Blob> {
  return await apiRequest<Blob>({
    path: `/api/v1/conversations/${conversationId}/sources/${documentId}/download`,
    token: session.token,
    responseType: "blob",
  });
}
export function getConversationSourceViewUrl(
  session: AuthSession,
  conversationId: string,
  documentId: number,
  pageNumber?: number | null,
): string {
  const url = new URL(
    `${API_BASE_URL}/api/v1/conversations/${conversationId}/sources/${documentId}/download`,
    window.location.origin
  );
  url.searchParams.set("token", session.token);
  if (pageNumber) {
    url.hash = `page=${pageNumber}`;
  }
  return url.toString();
}
