import { BookOpenText, Check, MessageSquarePlus, MoreHorizontal, PanelLeft, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ToastNotice from "../../../core/components/ToastNotice";
import { useAuth } from "../../../core/auth";
import type { NoticeState } from "../../../core/types";
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
  downloadConversationSource,
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
  const [downloadPendingId, setDownloadPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);

  const showNotice = useCallback((type: NoticeState["type"], message: string) => {
    setNotice({ type, message });
  }, []);

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
        showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось загрузить диалоги.");
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
  }, [activeConversation?.messages.length, activeConversationId, navigate, pending, routeConversationId, session, showNotice, syncActiveConversation]);

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

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      if (!session || conversationId === activeConversationId) return;

      setIsLoadingConversation(true);
      setActiveConversationId(conversationId);

      try {
        const conversation = await getConversation(session, conversationId);
        syncActiveConversation(conversation);
        navigate(`/app/chat/${conversationId}`);
      } catch (requestError) {
        showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось открыть диалог.");
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [activeConversationId, navigate, session, showNotice, syncActiveConversation],
  );

  const handleStartDraftConversation = useCallback(() => {
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

      setPending(true);

      let conversation = activeConversation;
      let isFreshConversation = false;
      if (!conversation) {
        try {
          conversation = await createConversation({ session });
          isFreshConversation = true;
        } catch (requestError) {
          showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось начать новый диалог.");
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
        const answer = response.answer || "Ответ не был получен.";
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
          showNotice(
            "error",
            saveError instanceof Error ? `${saveError.message} Диалог не был сохранён.` : "Диалог не был сохранён.",
          );
        }
      } catch (requestError) {
        showNotice("error", requestError instanceof Error ? requestError.message : "Запрос не выполнен.");
      } finally {
        setPending(false);
      }
    },
    [activeConversation, navigate, pending, session, showNotice, syncActiveConversation],
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
      showNotice("error", "Название диалога не может быть пустым.");
      return;
    }

    setRenamePending(true);

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
      showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось переименовать диалог.");
    } finally {
      setRenamePending(false);
    }
  }, [activeConversationId, renameValue, session, showNotice, syncActiveConversation]);

  const handleDeleteConversation = useCallback(async () => {
    if (!session || !activeConversationId) return;

    setDeletePending(true);

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
      showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось удалить диалог.");
    } finally {
      setDeletePending(false);
      setIsLoadingConversation(false);
    }
  }, [activeConversationId, conversations, navigate, session, showNotice, syncActiveConversation]);

  const handleDeleteAllConversations = useCallback(async () => {
    if (!session) return;

    setDeleteAllPending(true);

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
      showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось удалить историю чатов.");
    } finally {
      setDeleteAllPending(false);
    }
  }, [navigate, session, showNotice]);

  const handleDownloadSource = useCallback(
    async (source: ChatSource) => {
      if (!session || !activeConversationId || !source.documentId) return;

      setDownloadPendingId(source.id);

      try {
        const blob = await downloadConversationSource({
          session,
          conversationId: activeConversationId,
          documentId: source.documentId,
        });

        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = source.title || `source-${source.documentId}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (requestError) {
        showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось скачать источник.");
      } finally {
        setDownloadPendingId(null);
      }
    },
    [activeConversationId, session, showNotice],
  );

  if (!session) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex h-[100svh] overflow-hidden overscroll-none bg-[radial-gradient(circle_at_top,_rgba(84,214,198,0.12),_transparent_24%),linear-gradient(180deg,_#07101a_0%,_#03070d_100%)] text-slate-100 md:h-[100dvh]">
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
          <header className="flex h-[60px] items-center justify-between gap-2 border-b border-[#21384b] bg-[#08111c] px-3 md:h-[72px] md:gap-3 md:px-6">
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
                      className="w-[180px] rounded-xl border border-[#284863] bg-[#0d1827] px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none md:w-[260px]"
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
                    <h1 className="truncate font-heading text-sm text-slate-100 md:text-lg">Mugallim AI</h1>
                    <p className="truncate text-[10px] uppercase tracking-[0.14em] text-slate-500 md:text-[11px] md:tracking-[0.16em]">
                      {activeConversation?.title ?? "Новый чат"}
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
                        Переименовать чат
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
                        Удалить чат
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
          />
          <ChatComposer disabled={pending || isLoadingList || isLoadingConversation} onSubmit={handleSend} />
        </main>

        <SourcesPanel
          activeConversationId={activeConversationId}
          activeConversationTitle={activeConversation?.title ?? "Новый чат"}
          downloadPendingId={downloadPendingId}
          mobileOpen={mobileSourcesOpen}
          sources={activeSources}
          onDownloadSource={(source) => {
            void handleDownloadSource(source);
          }}
          onCloseMobile={() => setMobileSourcesOpen(false)}
        />
      </div>

      <DeleteConversationModal
        open={deleteConfirmOpen}
        title={activeConversation?.title ?? "этот диалог"}
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
      <ToastNotice notice={notice} />
    </div>
  );
}
