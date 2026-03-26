export type ChatMessageRole = "user" | "assistant";

export interface ChatSource {
  id: string;
  documentId?: number | null;
  pageNumber?: number | null;
  title: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt?: string;
  sources?: ChatSource[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  lastMessagePreview: string;
  messageCount: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface AskApiResponse {
  answer: string;
  sources?: ChatSource[];
}
