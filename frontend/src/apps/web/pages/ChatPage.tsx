import { BookOpenText, MessageSquarePlus, PanelLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../core/auth";
import { askAssistant, ChatComposer, ChatMessageList, ChatSidebar, SourcesPanel, WebLogoutConfirmModal } from "../chat";
import type { ChatMessage, Conversation } from "../chat";

function createConversation(title = "New chat"): Conversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    messages: [],
    updatedAt: now,
  };
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(() => [createConversation("Welcome")]);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => conversations[0].id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSourcesOpen, setMobileSourcesOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? conversations[0],
    [activeConversationId, conversations]
  );

  const updateActiveConversation = (updater: (conversation: Conversation) => Conversation) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversationId
          ? updater({ ...conversation, updatedAt: new Date().toISOString() })
          : conversation
      )
    );
  };

  const handleCreateConversation = () => {
    const conversation = createConversation();
    setConversations((prev) => [conversation, ...prev]);
    setActiveConversationId(conversation.id);
    setError("");
    setMobileSidebarOpen(false);
  };

  const handleSend = async (prompt: string) => {
    if (!session || !activeConversation) return;

    setError("");
    setPending(true);

    const userMessage = createMessage("user", prompt);
    updateActiveConversation((conversation) => {
      const updatedMessages = [...conversation.messages, userMessage];
      const nextTitle = conversation.messages.length === 0 ? prompt.slice(0, 40) : conversation.title;
      return {
        ...conversation,
        title: nextTitle || conversation.title,
        messages: updatedMessages,
      };
    });

    try {
      const history = [...activeConversation.messages, userMessage];
      const response = await askAssistant({
        question: prompt,
        session,
        history,
      });

      updateActiveConversation((conversation) => ({
        ...conversation,
        messages: [...conversation.messages, createMessage("assistant", response.answer || "No answer returned.")],
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setPending(false);
    }
  };

  const handleConfirmLogout = () => {
    setLogoutConfirmOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  if (!activeConversation || !session) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gradient-to-b from-[#07101f] to-[#040a14]">
      <ChatSidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        isMobileOpen={mobileSidebarOpen}
        username={session.user.displayName}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onCreateConversation={handleCreateConversation}
        onSelectConversation={setActiveConversationId}
        onLogout={() => setLogoutConfirmOpen(true)}
      />

      <div className="flex min-w-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-ink-700/80 bg-ink-900/60 px-3 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" className="btn-muted md:hidden" onClick={() => setMobileSidebarOpen(true)}>
                <PanelLeft size={16} />
              </button>
              <h1 className="truncate font-heading text-base text-slate-100 md:text-lg">AI Assistant</h1>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="btn-muted md:hidden" onClick={handleCreateConversation}>
                <MessageSquarePlus size={16} />
              </button>
              <button type="button" className="btn-muted lg:hidden" onClick={() => setMobileSourcesOpen(true)}>
                <BookOpenText size={16} />
              </button>
            </div>
          </header>

          <ChatMessageList messages={activeConversation.messages} pending={pending} error={error} />
          <ChatComposer disabled={pending} onSubmit={handleSend} />
        </main>

        <SourcesPanel
          activeConversationTitle={activeConversation.title}
          mobileOpen={mobileSourcesOpen}
          onCloseMobile={() => setMobileSourcesOpen(false)}
        />
      </div>

      <WebLogoutConfirmModal open={logoutConfirmOpen} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={handleConfirmLogout} />
    </div>
  );
}
