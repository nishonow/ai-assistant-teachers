import { BookOpenText, ChevronRight, PanelLeft, PanelLeftClose } from "lucide-react";
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
  isBlockedMessagingError,
  isRateLimitError,
  localizeUserErrorMessage,
  RenameConversationModal,
  resolveSelectedSources,
  resolveWebchatTheme,
  renameConversation,
  saveWebchatThemePreference,
  saveConversationExchange,
  SourcesPanel,
  loadWebchatThemePreference,
  upsertConversationSummary,
  WebLogoutConfirmModal,
  type WebchatThemePreference,
} from "../chat";
import type { ChatMessage, ChatSource, Conversation, ConversationSummary } from "../chat";
import useMobileBodyScrollLock from "../chat/hooks/useMobileBodyScrollLock";
import useRateLimitCountdown from "../chat/hooks/useRateLimitCountdown";
import useSystemPrefersDark from "../chat/hooks/useSystemPrefersDark";
import useWebchatDocumentMeta from "../chat/hooks/useWebchatDocumentMeta";
import useChatConversationsData from "../chat/hooks/useChatConversationsData";

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
  const [composerFocusKey, setComposerFocusKey] = useState(0);
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
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [themePreference, setThemePreference] = useState<WebchatThemePreference>(() => loadWebchatThemePreference());
  const systemPrefersDark = useSystemPrefersDark();

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

  const requestComposerFocus = useCallback(() => {
    setComposerFocusKey((current) => current + 1);
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

  useChatConversationsData({
    session,
    routeConversationId,
    activeConversation,
    navigate,
    showNotice,
    syncActiveConversation,
    conversationRequestIdRef,
    selectedSourcesMessageIdRef,
    setConversations,
    setIsLoadingList,
    setIsLoadingConversation,
    setActiveConversationId,
    setActiveConversation,
    setActiveSources,
    setSelectedSourcesMessageId,
    setRenameTargetConversation,
    setRenameValue,
    setDeleteTargetConversation,
  });

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    saveWebchatThemePreference(themePreference);
  }, [themePreference]);

  const resolvedTheme = resolveWebchatTheme(themePreference, systemPrefersDark);

  const handleRateLimitExpire = useCallback(() => {
    setRateLimitUntil(null);
  }, []);
  const rateLimitSecondsLeft = useRateLimitCountdown(rateLimitUntil, handleRateLimitExpire);
  useWebchatDocumentMeta({
    conversationTitle: activeConversation?.title,
    resolvedTheme,
  });
  useMobileBodyScrollLock();

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      if (!session) return;

      requestComposerFocus();

      if (conversationId === routeConversationId) return;

      navigate(`/app/chat/${conversationId}`);
    },
    [navigate, requestComposerFocus, routeConversationId, session],
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
    requestComposerFocus();
    navigate("/app");
  }, [navigate, requestComposerFocus]);

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

  const handleSelectMessageSources = useCallback(
    (message: ChatMessage) => {
      if (message.role !== "assistant" || !message.sources?.length) return;

      if (selectedSourcesMessageIdRef.current === message.id) {
        const selection = resolveSelectedSources(activeConversation, null);
        selectedSourcesMessageIdRef.current = selection.messageId;
        setSelectedSourcesMessageId(selection.messageId);
        setActiveSources(selection.sources);
        return;
      }

      selectedSourcesMessageIdRef.current = message.id;
      setSelectedSourcesMessageId(message.id);
      setActiveSources(message.sources);

      if (window.matchMedia("(min-width: 1024px)").matches) {
        setDesktopSourcesOpen(true);
        return;
      }

      setMobileSourcesOpen(true);
    },
    [activeConversation],
  );

  const handleSelectSuggestion = useCallback((question: string) => {
    setSuggestedQuestion(question);
  }, []);

  if (!session) {
    return null;
  }

  return (
    <div className={`webchat-shell webchat-theme-${resolvedTheme} relative flex w-full h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,_#ffffff_0%,_#f5f7fb_100%)] text-[#1c1b18] dark:bg-[linear-gradient(180deg,_#07101a_0%,_#03070d_100%)] dark:text-slate-100`}>
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
        onStartNewChat={handleStartDraftConversation}
        onOpenAdmin={() => {
          setMobileSidebarOpen(false);
          const adminUrl = new URL("/admin", window.location.origin);
          window.open(adminUrl.toString(), "_blank", "noopener,noreferrer");
        }}
        onLogout={() => setLogoutConfirmOpen(true)}
        onRenameConversation={handleOpenRenameConversation}
        onSelectConversation={handleSelectConversation}
        onThemeChange={setThemePreference}
        resolvedTheme={resolvedTheme}
      />

      <div className="webchat-main-surface flex min-w-0 flex-1 bg-[#07101a]">
        <main className="webchat-main-panel flex min-w-0 flex-1 flex-col bg-[#07101a]">
          <header className="webchat-header relative z-20 flex flex-col justify-center border-b border-[#1e3448]/60 bg-[#08121c]/85 shrink-0 md:bg-[#08111c] md:backdrop-blur-none backdrop-blur-xl md:border-[#21384b] md:h-[62px]">
            <div className="flex h-[48px] md:hidden items-center justify-between gap-2 px-3">
              <div className="flex w-10 items-center justify-start">
                <button
                  type="button"
                  className="btn-muted px-2.5 py-2"
                  onClick={() => setMobileSidebarOpen((current) => !current)}
                  aria-label={mobileSidebarOpen ? "Закрыть меню" : "Открыть меню"}
                >
                  {mobileSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
                </button>
              </div>

              <div className="min-w-0 flex-1 px-2 text-center">
                <h1 className="truncate font-heading text-[13px] text-slate-100">
                  {activeConversation?.title ?? "Mugalim AI"}
                </h1>
              </div>

              <div className="flex w-10 items-center justify-end">
                <button
                  type="button"
                  className="btn-muted px-2.5 py-2"
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    setMobileSourcesOpen((current) => !current);
                  }}
                  aria-label={mobileSourcesOpen ? "Закрыть источники" : "Открыть источники"}
                >
                  <BookOpenText size={16} />
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
            suggestionsDisabled={pending || isLoadingList || isLoadingConversation || isMessagingBlocked}
          />
          {isMessagingBlocked ? (
            <div className="webchat-warning-banner mx-3 mb-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 md:mx-6">
              Вы заблокированы. Отправка новых сообщений временно недоступна.
            </div>
          ) : null}
          <ChatComposer
            disabled={pending || isLoadingList || isLoadingConversation || isMessagingBlocked || rateLimitSecondsLeft > 0}
            onSubmit={handleSend}
            suggestedValue={suggestedQuestion}
            onSuggestedValueConsumed={() => setSuggestedQuestion(null)}
            focusRequestKey={composerFocusKey}
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
