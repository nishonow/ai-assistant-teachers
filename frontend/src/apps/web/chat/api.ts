import { apiRequest } from "../../../core/api";
import type { AuthSession } from "../../../core/auth";
import type { AskApiResponse, ChatMessage } from "./types";

interface AskPayload {
  question: string;
  session: AuthSession;
  history: ChatMessage[];
}

export async function askAssistant({ question, session, history }: AskPayload): Promise<AskApiResponse> {
  return await apiRequest<AskApiResponse>({
    path: "/api/v1/ask/",
    method: "POST",
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

