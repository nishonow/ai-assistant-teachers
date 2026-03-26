import { BookOpenText, ChevronRight, Eye, MessageSquarePlus, PanelLeft, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ToastNotice from "../../../core/components/ToastNotice";
import { useAuth } from "../../../core/auth";
import type { NoticeState } from "../../../core/types";
import {
  askAssistant,
  RATE_LIMIT_WINDOW_SECONDS,
  ChatComposer,
  ChatMessageList,
  ChatSidebar,
  createTransientMessage,
  createConversation,
  DeleteAllHistoryModal,
  DeleteConversationModal,
  deleteAllConversations,
  deleteConversation,
  downloadConversationSource,
  EditProfileModal,
  getConversation,
  getConversationPreview,
  getConversationSourceViewUrl,
  isBlockedMessagingError,
  isRateLimitError,
  listConversations,
  localizeUserErrorMessage,
  RenameConversationModal,
  resolveSelectedSources,
  renameConversation,
  saveConversationExchange,
  sortConversationsByRecent,
  SourcesPanel,
  upsertConversationSummary,
  WebLogoutConfirmModal,
} from "../chat";
import type { ChatMessage, ChatSource, Conversation, ConversationSummary } from "../chat";

export default function ChatPage() {
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const { session, logout, updateProfile } = useAuth();
  const conversationRequestIdRef = useRef(0);
  const selectedSourcesMessageIdRef = useRef<string | null>(null);
  const sendLockRef = useRef(false);

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
  const [isMessagingBlocked, setIsMessagingBlocked] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [viewSource, setViewSource] = useState<ChatSource | null>(null);
  const [viewBlobUrl, setViewBlobUrl] = useState<string | null>(null);
  const [isViewLoading, setIsViewLoading] = useState(false);

  const noticeTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((type: NoticeState["type"], message: string) => {
    setNotice({ type, message });
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
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
        setConversations(sortConversationsByRecent(items));

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
            sortConversationsByRecent(
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
            ),
          );
        })();
      } catch (requestError) {
        if (cancelled) return;
        showNotice("error", localizeUserErrorMessage(requestError, "Не удалось загрузить диалоги."));
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

        showNotice("error", localizeUserErrorMessage(requestError, "Не удалось открыть диалог."));
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
    if (!rateLimitUntil) {
      setRateLimitSecondsLeft(0);
      return;
    }

    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setRateLimitSecondsLeft(secondsLeft);
      if (secondsLeft === 0) {
        setRateLimitUntil(null);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimitUntil]);

  useEffect(() => {
    const title = activeConversation?.title?.trim();
    document.title = title ? `${title} — Mugallim AI` : "Mugallim AI";
  }, [activeConversation?.title]);

  useEffect(() => {
    return () => {
      document.title = "Mugallim AI";
    };
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
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
      if (!session || pending || sendLockRef.current || rateLimitSecondsLeft > 0) return;

      sendLockRef.current = true;
      setPending(true);

      let conversation = activeConversation;
      let isFreshConversation = false;

      if (!conversation) {
        try {
          conversation = await createConversation({ session });
          isFreshConversation = true;
        } catch (requestError) {
          showNotice("error", localizeUserErrorMessage(requestError, "Не удалось начать новый диалог."));
          setPending(false);
          sendLockRef.current = false;
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
        setIsMessagingBlocked(false);
        setRateLimitUntil(null);
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
        if (isBlockedMessagingError(requestError)) {
          setIsMessagingBlocked(true);
          showNotice("error", "Пользователь заблокирован. Отправка сообщений недоступна.");
          syncActiveConversation(conversation, "preserve", "preserve");
          return;
        }

        if (isRateLimitError(requestError)) {
          setRateLimitUntil(Date.now() + RATE_LIMIT_WINDOW_SECONDS * 1000);
          showNotice("warning", localizeUserErrorMessage(requestError, "Слишком много запросов."));
          syncActiveConversation(conversation, "preserve", "preserve");
          return;
        }

        showNotice("error", localizeUserErrorMessage(requestError, "Запрос не выполнен."));
        syncActiveConversation(conversation, "preserve", "preserve");
      } finally {
        setPending(false);
        sendLockRef.current = false;
      }
    },
    [activeConversation, navigate, pending, rateLimitSecondsLeft, session, showNotice, syncActiveConversation],
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
      showNotice("error", localizeUserErrorMessage(requestError, "Не удалось обновить профиль."));
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

      showNotice("success", "Диалог успешно переименован.");
      setRenameTargetConversation(null);
      setRenameValue("");
    } catch (requestError) {
      showNotice("error", localizeUserErrorMessage(requestError, "Не удалось переименовать диалог."));
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
      showNotice("success", "Диалог удален.");
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
      showNotice("error", localizeUserErrorMessage(requestError, "Не удалось удалить диалог."));
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
      showNotice("error", localizeUserErrorMessage(requestError, "Не удалось удалить историю чатов."));
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
        showNotice("error", localizeUserErrorMessage(requestError, "Не удалось скачать источник."));
      } finally {
        setDownloadPendingId(null);
      }
    },
    [activeConversationId, session, showNotice],
  );

  const handleViewSource = useCallback(
    async (source: ChatSource) => {
      if (!session || !activeConversationId || !source.documentId) return;

      setIsViewLoading(true);
      setViewSource(source);

      try {
        const blob = await downloadConversationSource({
          session,
          conversationId: activeConversationId,
          documentId: source.documentId,
        });

        const objectUrl = URL.createObjectURL(blob);
        const viewUrl = getConversationSourceViewUrl(
          activeConversationId,
          source.documentId,
          source.pageNumber,
        );
        
        // Combine blob URL with hash fragment for specialized browser navigation
        const finalUrl = `${objectUrl}${new URL(viewUrl).hash}`;
        setViewBlobUrl(finalUrl);
      } catch (requestError) {
        showNotice("error", localizeUserErrorMessage(requestError, "Не удалось открыть просмотр."));
        setViewSource(null);
      } finally {
        setIsViewLoading(false);
      }
    },
    [activeConversationId, session, showNotice],
  );

  const handleCloseView = useCallback(() => {
    if (viewBlobUrl) {
      URL.revokeObjectURL(viewBlobUrl.split("#")[0]);
    }
    setViewSource(null);
    setViewBlobUrl(null);
  }, [viewBlobUrl]);

  const handleSelectMessageSources = useCallback((message: ChatMessage) => {
    if (message.role !== "assistant" || !message.sources?.length) return;

    selectedSourcesMessageIdRef.current = message.id;
    setSelectedSourcesMessageId(message.id);
    setActiveSources(message.sources);

    if (window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopSourcesOpen(true);
      return;
    }

    setMobileSourcesOpen(true);
  }, []);

  const handleSelectSuggestion = useCallback((question: string) => {
    setSuggestedQuestion(question);
  }, []);

  if (!session) {
    return null;
  }

  return (
    <div className="relative flex w-full h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,_#07101a_0%,_#03070d_100%)] text-slate-100">
      <ChatSidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        hasHistory={conversations.length > 0}
        loading={isLoadingList}
        isMobileOpen={mobileSidebarOpen}
        isAdmin={session.user.role === "admin"}
        historyPending={deleteAllPending}
        username={session.user.displayName || session.user.username}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onDeleteAllHistory={() => setDeleteAllConfirmOpen(true)}
        onDeleteConversation={handleOpenDeleteConversation}
        onEditProfile={handleOpenProfile}
        onOpenAdmin={() => {
          setMobileSidebarOpen(false);
          const adminUrl = new URL("/admin", window.location.origin);
          window.open(adminUrl.toString(), "_blank", "noopener,noreferrer");
        }}
        onLogout={() => setLogoutConfirmOpen(true)}
        onRenameConversation={handleOpenRenameConversation}
        onSelectConversation={handleSelectConversation}
      />

      <div className="flex min-w-0 flex-1 bg-[#07101a]">
        <main className="flex min-w-0 flex-1 flex-col bg-[#07101a]">
          <header className="relative z-20 flex flex-col justify-center border-b border-[#1e3448]/60 bg-[#08121c]/85 shrink-0 md:bg-[#08111c] md:backdrop-blur-none backdrop-blur-xl md:border-[#21384b] md:h-[62px]">
            <div className="flex h-[48px] md:hidden items-center justify-between gap-2 px-3">
              <div className="flex w-10 items-center justify-start">
                <button type="button" className="btn-muted px-2.5 py-2" onClick={() => setMobileSidebarOpen(true)} aria-label="Открыть меню">
                  <PanelLeft size={16} />
                </button>
              </div>

              <div className="min-w-0 flex-1 px-2 text-center">
                <h1 className="truncate font-heading text-[13px] text-slate-100">
                  {activeConversation?.title ?? "Mugallim AI"}
                </h1>
              </div>

              <div className="flex w-10 items-center justify-end">
                <button
                  type="button"
                  className="btn-muted px-2.5 py-2"
                  onClick={handleStartDraftConversation}
                  disabled={pending || isLoadingConversation || deletePending || renamePending || deleteAllPending}
                  aria-label="Новый чат"
                >
                  <MessageSquarePlus size={16} />
                </button>
              </div>
            </div>

            <div className="hidden h-full items-center justify-between gap-2.5 px-5 md:flex">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-[16px] text-slate-100">
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
              </div>
            </div>
          </header>

          <ChatMessageList
            messages={activeConversation?.messages ?? []}
            pending={pending}
            loading={isLoadingConversation || (Boolean(routeConversationId) && isLoadingList)}
            selectedSourcesMessageId={selectedSourcesMessageId}
            onSelectSources={handleSelectMessageSources}
            onSelectSuggestion={handleSelectSuggestion}
            suggestionsDisabled={pending || isLoadingList || isLoadingConversation || isMessagingBlocked || rateLimitSecondsLeft > 0}
          />
          {isMessagingBlocked ? (
            <div className="mx-3 mb-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 md:mx-6">
              Вы заблокированы. Отправка новых сообщений временно недоступна.
            </div>
          ) : null}
          <ChatComposer
            disabled={pending || isLoadingList || isLoadingConversation || isMessagingBlocked || rateLimitSecondsLeft > 0}
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
          onViewSource={(source) => {
            void handleViewSource(source);
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

      {viewSource && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020508]/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-300">
          <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-[#21384b] bg-[#08111c] shadow-2xl chat-card-enter">
            <header className="flex shrink-0 items-center justify-between border-b border-[#21384b] bg-[#0b1623] px-6 py-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#305169] bg-[#102033] text-[#9af5ea]">
                  <Eye size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-heading text-sm font-semibold tracking-wide text-slate-100">
                    {viewSource.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {viewSource.pageNumber ? `Страница ${viewSource.pageNumber}` : "Просмотр документа"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="btn-muted hidden h-10 px-4 text-xs font-semibold sm:inline-flex"
                  onClick={() => handleDownloadSource(viewSource)}
                  disabled={!!downloadPendingId}
                >
                  Скачать оригинал
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#305169] bg-[#102033] text-slate-200 transition-colors hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30"
                  onClick={handleCloseView}
                  aria-label="Закрыть"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="relative flex-1 bg-[#04080d]">
              {isViewLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#9af5ea] border-t-transparent" />
                  <p className="text-xs font-medium tracking-[0.14em] text-[#9af5ea] uppercase">
                    Загрузка документа...
                  </p>
                </div>
              ) : viewBlobUrl ? (
                <iframe
                  src={viewBlobUrl}
                  className="h-full w-full border-none"
                  title={viewSource.title}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500">
                  <p>Не удалось отобразить документ в реальном времени.</p>
                  <button
                    type="button"
                    className="mt-4 text-sm font-semibold text-[#9af5ea] underline underline-offset-4"
                    onClick={() => handleDownloadSource(viewSource)}
                  >
                    Скачать и посмотреть локально
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
