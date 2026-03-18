export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface AskApiResponse {
  answer: string;
  sources?: string[];
}

