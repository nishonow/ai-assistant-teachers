import { BookOpenText, Check, MessageSquarePlus, MoreHorizontal, PanelLeft, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../../core/auth";
import {
  askAssistant,
  ChatComposer,
  ChatMessageList,
  ChatSidebar,
  createConversation,
  deleteAllConversations,
  DeleteConversationModal,
  DeleteAllHistoryModal,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  saveConversationExchange,
  SourcesPanel,
  WebLogoutConfirmModal,
} from "../chat";
import type { ChatMessage, ChatSource, Conversation, ConversationSummary } from "../chat";

function createTransientMessage(role: ChatMessage["role"], content: string, sources?: ChatSource[]): ChatMessage {
  return {
    id: `temp-${crypto.randomUUID()}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    sources,
  };
}

function getLatestSources(conversation: Conversation | null): ChatSource[] {
  if (!conversation) return [];

  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const message = conversation.messages[index];
    if (message.role === "assistant" && message.sources?.length) {
      return message.sources;
    }
  }

  return [];
}

function toConversationSummary(conversation: Conversation): ConversationSummary {
  const lastMessage = conversation.messages[conversation.messages.length - 1]?.content || "";
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    lastMessagePreview: lastMessage.slice(0, 120),
    messageCount: conversation.messages.length,
  };
}

function upsertConversationSummary(conversations: ConversationSummary[], conversation: Conversation): ConversationSummary[] {
  const next = toConversationSummary(conversation);
  return [next, ...conversations.filter((item) => item.id !== next.id)];
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const { session, logout } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeSources, setActiveSources] = useState<ChatSource[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSourcesOpen, setMobileSourcesOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deleteAllPending, setDeleteAllPending] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);

  const syncActiveConversation = useCallback((conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    setActiveConversation(conversation);
    setActiveSources(getLatestSources(conversation));
    setRenameOpen(false);
    setRenameValue("");
    setConversations((prev) => upsertConversationSummary(prev, conversation));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      if (!session) return;

      setIsLoadingList(true);
      setError("");

      try {
        const items = await listConversations(session);
        if (cancelled) return;

        setConversations(items);
        if (!routeConversationId) {
          setActiveConversationId(null);
          setActiveConversation(null);
          setActiveSources([]);
          return;
        }

        if (activeConversationId === routeConversationId && (pending || Boolean(activeConversation?.messages.length))) {
          return;
        }

        setIsLoadingConversation(true);
        const conversation = await getConversation(session, routeConversationId);
        if (cancelled) return;

        syncActiveConversation(conversation);
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : "Could not load conversations.");
        if (routeConversationId) {
          navigate("/app", { replace: true });
          setActiveConversationId(null);
          setActiveConversation(null);
          setActiveSources([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
          setIsLoadingConversation(false);
        }
      }
    }

    void loadInitialState();

    return () => {
      cancelled = true;
    };
  }, [activeConversation?.messages.length, activeConversationId, navigate, pending, routeConversationId, session, syncActiveConversation]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!mobileActionsRef.current?.contains(event.target as Node)) {
        setMobileActionsOpen(false);
      }
    }

    if (!mobileActionsOpen) return;

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [mobileActionsOpen]);

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      if (!session || conversationId === activeConversationId) return;

      setIsLoadingConversation(true);
      setActiveConversationId(conversationId);
      setError("");

      try {
        const conversation = await getConversation(session, conversationId);
        syncActiveConversation(conversation);
        navigate(`/app/chat/${conversationId}`);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not open conversation.");
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [activeConversationId, navigate, session, syncActiveConversation],
  );

  const handleStartDraftConversation = useCallback(() => {
    setError("");
    setActiveConversationId(null);
    setActiveConversation(null);
    setActiveSources([]);
    setRenameOpen(false);
    setRenameValue("");
    setMobileActionsOpen(false);
    setMobileSidebarOpen(false);
    navigate("/app");
  }, [navigate]);

  const handleSend = useCallback(
    async (prompt: string) => {
      if (!session || pending) return;

      setError("");
      setPending(true);

      let conversation = activeConversation;
      let isFreshConversation = false;
      if (!conversation) {
        try {
          conversation = await createConversation({ session });
          isFreshConversation = true;
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Could not start a new conversation.");
          setPending(false);
          return;
        }
      }

      const userMessage = createTransientMessage("user", prompt);
      const optimisticTitle =
        conversation.messages.length === 0 ? prompt.slice(0, 40).trim() || conversation.title : conversation.title;
      const optimisticConversation: Conversation = {
        ...conversation,
        title: optimisticTitle,
        updatedAt: new Date().toISOString(),
        messages: [...conversation.messages, userMessage],
      };

      syncActiveConversation(optimisticConversation);
      if (isFreshConversation) {
        navigate(`/app/chat/${conversation.id}`, { replace: true });
      }

      try {
        const response = await askAssistant({
          question: prompt,
          session,
          history: optimisticConversation.messages,
        });
        const answer = response.answer || "No answer returned.";
        const sources = response.sources || [];
        const answeredConversation: Conversation = {
          ...optimisticConversation,
          updatedAt: new Date().toISOString(),
          messages: [...optimisticConversation.messages, createTransientMessage("assistant", answer, sources)],
        };

        syncActiveConversation(answeredConversation);
        setPending(false);

        try {
          const persistedConversation = await saveConversationExchange({
            session,
            conversationId: conversation.id,
            question: prompt,
            answer,
            title: conversation.messages.length === 0 ? optimisticTitle : undefined,
            sources,
          });
          syncActiveConversation(persistedConversation);
        } catch (saveError) {
          setError(saveError instanceof Error ? `${saveError.message} Conversation was not saved.` : "Conversation was not saved.");
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Request failed.");
      } finally {
        setPending(false);
      }
    },
    [activeConversation, navigate, pending, session, syncActiveConversation],
  );

  const handleConfirmLogout = () => {
    setLogoutConfirmOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  const handleStartRename = () => {
    if (!activeConversation) return;
    setMobileActionsOpen(false);
    setRenameValue(activeConversation.title);
    setRenameOpen(true);
  };

  const handleCancelRename = () => {
    setRenameOpen(false);
    setRenameValue("");
  };

  const handleConfirmRename = useCallback(async () => {
    if (!session || !activeConversationId) return;

    const title = renameValue.trim();
    if (!title) {
      setError("Conversation title cannot be empty.");
      return;
    }

    setRenamePending(true);
    setError("");

    try {
      const renamedConversation = await renameConversation({
        session,
        conversationId: activeConversationId,
        title,
      });
      syncActiveConversation(renamedConversation);
      setRenameOpen(false);
      setRenameValue("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not rename conversation.");
    } finally {
      setRenamePending(false);
    }
  }, [activeConversationId, renameValue, session, syncActiveConversation]);

  const handleDeleteConversation = useCallback(async () => {
    if (!session || !activeConversationId) return;

    setDeletePending(true);
    setError("");

    const remaining = conversations.filter((item) => item.id !== activeConversationId);

    try {
      await deleteConversation(session, activeConversationId);
      setDeleteConfirmOpen(false);
      setConversations(remaining);

      if (!remaining.length) {
        setActiveConversationId(null);
        setActiveConversation(null);
        setActiveSources([]);
        navigate("/app", { replace: true });
        return;
      }

      setIsLoadingConversation(true);
      setActiveConversationId(remaining[0].id);

      const nextConversation = await getConversation(session, remaining[0].id);
      syncActiveConversation(nextConversation);
      navigate(`/app/chat/${remaining[0].id}`, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete conversation.");
    } finally {
      setDeletePending(false);
      setIsLoadingConversation(false);
    }
  }, [activeConversationId, conversations, navigate, session, syncActiveConversation]);

  const handleDeleteAllConversations = useCallback(async () => {
    if (!session) return;

    setDeleteAllPending(true);
    setError("");

    try {
      await deleteAllConversations(session);
      setDeleteAllConfirmOpen(false);
      setConversations([]);
      setActiveConversationId(null);
      setActiveConversation(null);
      setActiveSources([]);
      setRenameOpen(false);
      setRenameValue("");
      setMobileActionsOpen(false);
      setMobileSidebarOpen(false);
      navigate("/app", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete chat history.");
    } finally {
      setDeleteAllPending(false);
    }
  }, [navigate, session]);

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(84,214,198,0.12),_transparent_24%),linear-gradient(180deg,_#07101a_0%,_#03070d_100%)] text-slate-100">
      <ChatSidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        hasHistory={conversations.length > 0}
        isMobileOpen={mobileSidebarOpen}
        historyPending={deleteAllPending}
        username={session.user.displayName}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onCreateConversation={handleStartDraftConversation}
        onDeleteAllHistory={() => setDeleteAllConfirmOpen(true)}
        onSelectConversation={(conversationId) => {
          void handleSelectConversation(conversationId);
        }}
        onLogout={() => setLogoutConfirmOpen(true)}
      />

      <div className="flex min-w-0 flex-1 bg-[#07101a]">
        <main className="flex min-w-0 flex-1 flex-col bg-[#07101a]">
          <header className="flex h-[72px] items-center justify-between gap-3 border-b border-[#21384b] bg-[#08111c] px-3 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" className="btn-muted md:hidden" onClick={() => setMobileSidebarOpen(true)}>
                <PanelLeft size={16} />
              </button>
              <div className="min-w-0">
                {renameOpen ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                        if (event.key === "Enter") {
                          void handleConfirmRename();
                        }
                        if (event.key === "Escape") {
                          handleCancelRename();
                        }
                      }}
                      className="w-[180px] rounded-xl border border-[#284863] bg-[#0d1827] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none md:w-[260px]"
                      maxLength={120}
                      disabled={renamePending}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-muted p-2"
                      onClick={() => {
                        void handleConfirmRename();
                      }}
                      disabled={renamePending}
                    >
                      <Check size={15} />
                    </button>
                    <button type="button" className="btn-muted p-2" onClick={handleCancelRename} disabled={renamePending}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="truncate font-heading text-base text-slate-100 md:text-lg">Mugallim AI</h1>
                    <p className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      {activeConversation?.title ?? "New chat"}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeConversationId && !renameOpen ? (
                <button
                  type="button"
                  className="btn-muted hidden md:inline-flex"
                  onClick={handleStartRename}
                  disabled={pending || isLoadingConversation || deletePending || renamePending || deleteAllPending}
                >
                  <Pencil size={16} />
                </button>
              ) : null}
              {activeConversationId ? (
                <button
                  type="button"
                  className="btn-muted hidden md:inline-flex"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={pending || isLoadingConversation || deletePending || renamePending || deleteAllPending}
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
              <button type="button" className="btn-muted md:hidden" onClick={handleStartDraftConversation}>
                <MessageSquarePlus size={16} />
              </button>
              {activeConversationId && !renameOpen ? (
                <div className="relative md:hidden" ref={mobileActionsRef}>
                  <button
                    type="button"
                    className="btn-muted"
                    onClick={() => setMobileActionsOpen((current) => !current)}
                    disabled={pending || isLoadingConversation || deletePending || renamePending || deleteAllPending}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {mobileActionsOpen ? (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[180px] overflow-hidden rounded-2xl border border-[#284863] bg-[#0d1827] p-2">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-[#102033]"
                        onClick={handleStartRename}
                      >
                        <Pencil size={15} />
                        Rename chat
                      </button>
                      <button
                        type="button"
                        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-200 transition-colors hover:bg-[#102033]"
                        onClick={() => {
                          setMobileActionsOpen(false);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 size={15} />
                        Delete chat
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button type="button" className="btn-muted lg:hidden" onClick={() => setMobileSourcesOpen(true)}>
                <BookOpenText size={16} />
              </button>
            </div>
          </header>

          <ChatMessageList
            messages={activeConversation?.messages ?? []}
            pending={pending}
            loading={isLoadingConversation || (Boolean(routeConversationId) && isLoadingList)}
            error={error}
          />
          <ChatComposer disabled={pending || isLoadingList || isLoadingConversation} onSubmit={handleSend} />
        </main>

        <SourcesPanel
          activeConversationTitle={activeConversation?.title ?? "New chat"}
          mobileOpen={mobileSourcesOpen}
          sources={activeSources}
          onCloseMobile={() => setMobileSourcesOpen(false)}
        />
      </div>

      <DeleteConversationModal
        open={deleteConfirmOpen}
        title={activeConversation?.title ?? "this conversation"}
        pending={deletePending}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          void handleDeleteConversation();
        }}
      />
      <DeleteAllHistoryModal
        open={deleteAllConfirmOpen}
        pending={deleteAllPending}
        onCancel={() => setDeleteAllConfirmOpen(false)}
        onConfirm={() => {
          void handleDeleteAllConversations();
        }}
      />
      <WebLogoutConfirmModal open={logoutConfirmOpen} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={handleConfirmLogout} />
    </div>
  );
}
