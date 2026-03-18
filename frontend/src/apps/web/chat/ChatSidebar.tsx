import { LogOut, MessageSquarePlus, PanelLeftClose } from "lucide-react";
import type { Conversation } from "./types";

interface ChatSidebarProps {
  activeConversationId: string;
  conversations: Conversation[];
  isMobileOpen: boolean;
  username: string;
  onCloseMobile: () => void;
  onCreateConversation: () => void;
  onSelectConversation: (id: string) => void;
  onLogout: () => void;
}

export default function ChatSidebar({
  activeConversationId,
  conversations,
  isMobileOpen,
  username,
  onCloseMobile,
  onCreateConversation,
  onSelectConversation,
  onLogout,
}: ChatSidebarProps) {
  return (
    <>
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex h-full w-[86vw] max-w-sm flex-col border-r border-ink-700/70 bg-ink-900/95 p-3 backdrop-blur-sm transition-transform duration-200 md:relative md:translate-x-0 md:w-72 md:bg-ink-900/65",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="btn-muted" onClick={onCreateConversation}>
            <MessageSquarePlus size={16} />
            New chat
          </button>
          <button type="button" className="btn-muted md:hidden" onClick={onCloseMobile}>
            <PanelLeftClose size={16} />
          </button>
        </div>

        <div className="scroll-area min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => {
                onSelectConversation(conversation.id);
                onCloseMobile();
              }}
              className={[
                "w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                conversation.id === activeConversationId
                  ? "border-brand-400/45 bg-brand-500/20 text-brand-300"
                  : "border-transparent bg-ink-800/65 text-slate-200 hover:border-ink-500 hover:bg-ink-700",
              ].join(" ")}
            >
              <p className="truncate font-medium">{conversation.title}</p>
              <p className="mt-1 truncate text-xs text-slate-400">{conversation.messages[conversation.messages.length - 1]?.content || "Start chatting"}</p>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-ink-700/70 bg-ink-800/70 p-3">
          <p className="truncate text-sm font-semibold text-slate-100">{username}</p>
          <button type="button" className="btn-danger mt-3 w-full" onClick={onLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {isMobileOpen ? <div className="fixed inset-0 z-30 bg-ink-950/70 md:hidden" onClick={onCloseMobile} /> : null}
    </>
  );
}
