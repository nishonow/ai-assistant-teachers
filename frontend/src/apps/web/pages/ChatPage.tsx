import { BookOpenText, ChevronRight, MessageSquarePlus, PanelLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  DeleteAllHistoryModal,
  DeleteConversationModal,
  deleteAllConversations,
  deleteConversation,
  downloadConversationSource,
  EditProfileModal,
  getConversation,
  listConversations,
  RenameConversationModal,
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

function getLatestAssistantMessage(conversation: Conversation | null): ChatMessage | null {
  if (!conversation) return null;

  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const message = conversation.messages[index];
    if (message.role === "assistant") {
      return message;
    }
  }

  return null;
}

function resolveSelectedSources(
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

function getConversationPreview(conversation: Conversation): string {
  const firstUserMessage = conversation.messages.find((message) => message.role === "user" && message.content.trim());
  return (firstUserMessage?.content || conversation.title).slice(0, 120);
}

function toConversationSummary(conversation: Conversation): ConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    lastMessagePreview: getConversationPreview(conversation),
    messageCount: conversation.messages.length,
  };
}

function upsertConversationSummary(
  conversations: ConversationSummary[],
  conversation: Conversation,
  mode: "preserve" | "move-to-top" = "preserve",
): ConversationSummary[] {
  const next = toConversationSummary(conversation);
  const existingIndex = conversations.findIndex((item) => item.id === next.id);

  if (mode === "move-to-top" || existingIndex === -1) {
    return [next, ...conversations.filter((item) => item.id !== next.id)];
  }

  return conversations.map((item) => (item.id === next.id ? next : item));
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const { session, logout, updateProfile } = useAuth();
  const conversationRequestIdRef = useRef(0);
  const selectedSourcesMessageIdRef = useRef<string | null>(null);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeSources, setActiveSources] = useState<ChatSource[]>([]);
  const [selectedSourcesMessageId, setSelectedSourcesMessageId] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [pending, setPending] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSourcesOpen, setMobileSourcesOpen] = useState(false);
  const [desktopSourcesOpen, setDesktopSourcesOpen] = useState(false);
  const [suggestedQuestion, setSuggestedQuestion] = useState<string | null>(null);
  const [deleteTargetConversation, setDeleteTargetConversation] = useState<ConversationSummary | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deleteAllPending, setDeleteAllPending] = useState(false);
  const [renameTargetConversation, setRenameTargetConversation] = useState<ConversationSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profilePending, setProfilePending] = useState(false);
  const [downloadPendingId, setDownloadPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const showNotice = useCallback((type: NoticeState["type"], message: string) => {
    setNotice({ type, message });
  }, []);

  const syncActiveConversation = useCallback(
    (
      conversation: Conversation,
      orderMode: "preserve" | "move-to-top" = "preserve",
      sourcesMode: "preserve" | "latest" = "preserve",
    ) => {
      const preferredMessageId = sourcesMode === "preserve" ? selectedSourcesMessageIdRef.current : null;
      const selection = resolveSelectedSources(conversation, preferredMessageId);

      setActiveConversationId(conversation.id);
      setActiveConversation(conversation);
      setActiveSources(selection.sources);
      selectedSourcesMessageIdRef.current = selection.messageId;
      setSelectedSourcesMessageId(selection.messageId);
      setConversations((prev) => upsertConversationSummary(prev, conversation, orderMode));
    },
    [],
  );

  useEffect(() => {
    if (!session) return;

    const currentSession = session;
    let cancelled = false;
    setIsLoadingList(true);

    async function loadConversations() {
      try {
        const items = await listConversations(currentSession);
        if (cancelled) return;
        setConversations(items);

        void (async () => {
          const hydratedItems = await Promise.allSettled(
            items.map(async (item) => ({
              id: item.id,
              updatedAt: item.updatedAt,
              preview: getConversationPreview(await getConversation(currentSession, item.id)),
            })),
          );
          if (cancelled) return;

          const previewById = new Map(
            hydratedItems.flatMap((result) =>
              result.status === "fulfilled" ? [[result.value.id, result.value] as const] : [],
            ),
          );

          setConversations((prev) =>
            prev.map((item) => {
              const hydratedItem = previewById.get(item.id);
              if (!hydratedItem || hydratedItem.updatedAt !== item.updatedAt) {
                return item;
              }

              return {
                ...item,
                lastMessagePreview: hydratedItem.preview,
              };
            }),
          );
        })();
      } catch (requestError) {
        if (cancelled) return;
        showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось загрузить диалоги.");
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    }

    void loadConversations();

    return () => {
      cancelled = true;
    };
  }, [session, showNotice]);

  useEffect(() => {
    if (!session) return;

    const currentSession = session;
    if (!routeConversationId) {
      conversationRequestIdRef.current += 1;
      setIsLoadingConversation(false);
      setActiveConversationId(null);
      setActiveConversation(null);
      setActiveSources([]);
      selectedSourcesMessageIdRef.current = null;
      setSelectedSourcesMessageId(null);
      setRenameTargetConversation(null);
      setRenameValue("");
      setDeleteTargetConversation(null);
      return;
    }

    const currentConversationId = routeConversationId;
    if (activeConversation?.id === currentConversationId && activeConversation.messages.length > 0) {
      setActiveConversationId(currentConversationId);
      setIsLoadingConversation(false);
      return;
    }

    let cancelled = false;
    const requestId = ++conversationRequestIdRef.current;

    setIsLoadingConversation(true);
    setActiveConversationId(routeConversationId);
    setActiveConversation(null);
    setActiveSources([]);
    selectedSourcesMessageIdRef.current = null;
    setSelectedSourcesMessageId(null);
    setRenameTargetConversation(null);
    setRenameValue("");
    setDeleteTargetConversation(null);

    async function loadConversation() {
      try {
        const conversation = await getConversation(currentSession, currentConversationId);
        if (cancelled || conversationRequestIdRef.current !== requestId) return;

        syncActiveConversation(conversation, "preserve");
      } catch (requestError) {
        if (cancelled || conversationRequestIdRef.current !== requestId) return;

        showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось открыть диалог.");
        navigate("/app", { replace: true });
        setActiveConversationId(null);
        setActiveConversation(null);
        setActiveSources([]);
        setSelectedSourcesMessageId(null);
      } finally {
        if (!cancelled && conversationRequestIdRef.current === requestId) {
          setIsLoadingConversation(false);
        }
      }
    }

    void loadConversation();

    return () => {
      cancelled = true;
    };
  }, [activeConversation, navigate, routeConversationId, session, showNotice, syncActiveConversation]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) return;

    const originalContent = viewportMeta.getAttribute("content") || "width=device-width, initial-scale=1, viewport-fit=cover";

    const isFocusableFormControl = (target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;

    const lockViewportScale = (event: FocusEvent) => {
      if (!isFocusableFormControl(event.target)) return;

      viewportMeta.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover");
    };

    const restoreViewportScale = () => {
      window.setTimeout(() => {
        if (isFocusableFormControl(document.activeElement)) return;
        viewportMeta.setAttribute("content", originalContent);
      }, 0);
    };

    document.addEventListener("focusin", lockViewportScale);
    document.addEventListener("focusout", restoreViewportScale);

    return () => {
      viewportMeta.setAttribute("content", originalContent);
      document.removeEventListener("focusin", lockViewportScale);
      document.removeEventListener("focusout", restoreViewportScale);
    };
  }, []);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      if (!session || conversationId === routeConversationId) return;

      navigate(`/app/chat/${conversationId}`);
    },
    [navigate, routeConversationId, session],
  );

  const handleStartDraftConversation = useCallback(() => {
    conversationRequestIdRef.current += 1;
    setActiveConversationId(null);
    setActiveConversation(null);
    setActiveSources([]);
    selectedSourcesMessageIdRef.current = null;
    setSelectedSourcesMessageId(null);
    setRenameTargetConversation(null);
    setRenameValue("");
    setDeleteTargetConversation(null);
    setMobileSidebarOpen(false);
    setMobileSourcesOpen(false);
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

      syncActiveConversation(optimisticConversation, "move-to-top", "preserve");

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

        syncActiveConversation(answeredConversation, "move-to-top", "latest");
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

          syncActiveConversation(persistedConversation, "move-to-top", "latest");
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

  const handleOpenProfile = () => {
    if (!session) return;

    setProfileName(session.user.displayName || session.user.username);
    setProfileEmail(session.user.username);
    setProfilePassword("");
    setProfileOpen(true);
  };

  const handleSaveProfile = useCallback(async () => {
    const name = profileName.trim();
    const email = profileEmail.trim();

    if (!name) {
      showNotice("error", "Укажите имя.");
      return;
    }

    if (!email) {
      showNotice("error", "Укажите адрес электронной почты.");
      return;
    }

    setProfilePending(true);

    try {
      await updateProfile({ name, email, password: profilePassword });
      setProfileOpen(false);
      setProfilePassword("");
      showNotice("success", "Профиль успешно обновлён.");
    } catch (requestError) {
      showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось обновить профиль.");
    } finally {
      setProfilePending(false);
    }
  }, [profileEmail, profileName, profilePassword, showNotice, updateProfile]);

  const handleOpenRenameConversation = useCallback((conversation: ConversationSummary) => {
    setDeleteTargetConversation(null);
    setRenameTargetConversation(conversation);
    setRenameValue(conversation.title);
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (!session || !renameTargetConversation) return;

    const title = renameValue.trim();
    if (!title) {
      showNotice("error", "Название диалога не может быть пустым.");
      return;
    }

    setRenamePending(true);

    try {
      const renamedConversation = await renameConversation({
        session,
        conversationId: renameTargetConversation.id,
        title,
      });

      if (activeConversationId === renamedConversation.id) {
        syncActiveConversation(renamedConversation, "preserve");
      } else {
        setConversations((prev) => upsertConversationSummary(prev, renamedConversation, "preserve"));
      }

      setRenameTargetConversation(null);
      setRenameValue("");
    } catch (requestError) {
      showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось переименовать диалог.");
    } finally {
      setRenamePending(false);
    }
  }, [activeConversationId, renameTargetConversation, renameValue, session, showNotice, syncActiveConversation]);

  const handleOpenDeleteConversation = useCallback((conversation: ConversationSummary) => {
    setRenameTargetConversation(null);
    setRenameValue("");
    setDeleteTargetConversation(conversation);
  }, []);

  const handleDeleteConversation = useCallback(async () => {
    if (!session || !deleteTargetConversation) return;

    setDeletePending(true);

    try {
      await deleteConversation(session, deleteTargetConversation.id);

      setConversations((prev) => prev.filter((item) => item.id !== deleteTargetConversation.id));
      setDeleteTargetConversation(null);

      if (deleteTargetConversation.id === activeConversationId) {
        conversationRequestIdRef.current += 1;
        setActiveConversationId(null);
        setActiveConversation(null);
        setActiveSources([]);
        selectedSourcesMessageIdRef.current = null;
        setSelectedSourcesMessageId(null);
        setMobileSourcesOpen(false);
        navigate("/app", { replace: true });
      }
    } catch (requestError) {
      showNotice("error", requestError instanceof Error ? requestError.message : "Не удалось удалить диалог.");
    } finally {
      setDeletePending(false);
    }
  }, [activeConversationId, deleteTargetConversation, navigate, session, showNotice]);

  const handleDeleteAllConversations = useCallback(async () => {
    if (!session) return;

    setDeleteAllPending(true);

    try {
      await deleteAllConversations(session);
      conversationRequestIdRef.current += 1;
      setDeleteAllConfirmOpen(false);
      setConversations([]);
      setActiveConversationId(null);
      setActiveConversation(null);
      setActiveSources([]);
      selectedSourcesMessageIdRef.current = null;
      setSelectedSourcesMessageId(null);
      setRenameTargetConversation(null);
      setRenameValue("");
      setDeleteTargetConversation(null);
      setMobileSidebarOpen(false);
      setMobileSourcesOpen(false);
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

  const handleSelectMessageSources = useCallback((message: ChatMessage) => {
    if (message.role !== "assistant" || !message.sources?.length) return;

    selectedSourcesMessageIdRef.current = message.id;
    setSelectedSourcesMessageId(message.id);
    setActiveSources(message.sources);
  }, []);

  const handleSelectSuggestion = useCallback((question: string) => {
    setSuggestedQuestion(question);
  }, []);

  if (!session) {
    return null;
  }

  return (
    <div className="relative flex h-[100svh] overflow-visible bg-[radial-gradient(circle_at_top,_rgba(84,214,198,0.12),_transparent_24%),linear-gradient(180deg,_#07101a_0%,_#03070d_100%)] text-slate-100 md:h-[100dvh]">
      <ChatSidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        hasHistory={conversations.length > 0}
        loading={isLoadingList}
        isMobileOpen={mobileSidebarOpen}
        historyPending={deleteAllPending}
        username={session.user.displayName || session.user.username}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onDeleteAllHistory={() => setDeleteAllConfirmOpen(true)}
        onDeleteConversation={handleOpenDeleteConversation}
        onEditProfile={handleOpenProfile}
        onLogout={() => setLogoutConfirmOpen(true)}
        onRenameConversation={handleOpenRenameConversation}
        onSelectConversation={handleSelectConversation}
      />

      <div className="flex min-w-0 flex-1 bg-[#07101a]">
        <main className="flex min-w-0 flex-1 flex-col bg-[#07101a]">
          <header className="flex h-[56px] items-center justify-between gap-2 border-b border-[#21384b] bg-[#08111c] px-3 md:h-[72px] md:gap-3 md:px-6">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              <button type="button" className="btn-muted md:hidden" onClick={() => setMobileSidebarOpen(true)}>
                <PanelLeft size={16} />
              </button>

              <div className="min-w-0">
                <h1 className="truncate font-heading text-[14px] text-slate-100 md:text-lg">
                  {activeConversation?.title ?? "Новый чат"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-muted hidden sm:inline-flex"
                onClick={handleStartDraftConversation}
                disabled={pending || isLoadingConversation || deletePending || renamePending || deleteAllPending}
              >
                <MessageSquarePlus size={16} />
                Новый чат
              </button>
              <button
                type="button"
                className="btn-muted sm:hidden"
                onClick={handleStartDraftConversation}
                disabled={pending || isLoadingConversation || deletePending || renamePending || deleteAllPending}
              >
                <MessageSquarePlus size={16} />
              </button>
              <button
                type="button"
                className="btn-muted hidden lg:inline-flex"
                onClick={() => setDesktopSourcesOpen((current) => !current)}
              >
                <BookOpenText size={16} />
                Источники
                <ChevronRight
                  size={14}
                  className={[
                    "transition-transform duration-200",
                    desktopSourcesOpen ? "rotate-180" : "rotate-0",
                  ].join(" ")}
                />
              </button>
              <button type="button" className="btn-muted lg:hidden" onClick={() => setMobileSourcesOpen(true)}>
                <BookOpenText size={16} />
              </button>
            </div>
          </header>

          <ChatMessageList
            messages={activeConversation?.messages ?? []}
            pending={pending}
            loading={isLoadingConversation || (Boolean(routeConversationId) && isLoadingList)}
            selectedSourcesMessageId={selectedSourcesMessageId}
            onSelectSources={handleSelectMessageSources}
            onSelectSuggestion={handleSelectSuggestion}
            suggestionsDisabled={pending || isLoadingList || isLoadingConversation}
          />
          <ChatComposer
            disabled={pending || isLoadingList || isLoadingConversation}
            onSubmit={handleSend}
            suggestedValue={suggestedQuestion}
            onSuggestedValueConsumed={() => setSuggestedQuestion(null)}
          />
        </main>

        <SourcesPanel
          activeConversationId={activeConversationId}
          activeConversationTitle={activeConversation?.title ?? "Новый чат"}
          downloadPendingId={downloadPendingId}
          loading={isLoadingConversation}
          desktopOpen={desktopSourcesOpen}
          mobileOpen={mobileSourcesOpen}
          sources={activeSources}
          onCloseMobile={() => setMobileSourcesOpen(false)}
          onDownloadSource={(source) => {
            void handleDownloadSource(source);
          }}
        />
      </div>

      <DeleteConversationModal
        open={Boolean(deleteTargetConversation)}
        title={deleteTargetConversation?.title ?? "этот диалог"}
        pending={deletePending}
        onCancel={() => setDeleteTargetConversation(null)}
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
      <RenameConversationModal
        open={Boolean(renameTargetConversation)}
        pending={renamePending}
        value={renameValue}
        onChange={setRenameValue}
        onCancel={() => {
          setRenameTargetConversation(null);
          setRenameValue("");
        }}
        onConfirm={() => {
          void handleConfirmRename();
        }}
      />
      <EditProfileModal
        open={profileOpen}
        pending={profilePending}
        canEdit
        name={profileName}
        email={profileEmail}
        password={profilePassword}
        onChangeName={setProfileName}
        onChangeEmail={setProfileEmail}
        onChangePassword={setProfilePassword}
        onCancel={() => {
          setProfileOpen(false);
          setProfilePassword("");
        }}
        onConfirm={() => {
          void handleSaveProfile();
        }}
      />
      <WebLogoutConfirmModal open={logoutConfirmOpen} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={handleConfirmLogout} />
      <ToastNotice notice={notice} />
    </div>
  );
}
