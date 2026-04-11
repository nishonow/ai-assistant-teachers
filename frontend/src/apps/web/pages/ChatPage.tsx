import { BookOpenText, ChevronRight, PanelLeft, PanelLeftClose } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AnimatedTitle from "../chat/components/AnimatedTitle";
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
  SourceViewerModal,
  SourcesPanel,
  loadWebchatThemePreference,
  upsertConversationSummary,
  WebLogoutConfirmModal,
  type WebchatThemePreference,
} from "../chat";
import type { ChatMessage, ChatSource, Conversation, ConversationSummary } from "../chat";
import useRateLimitCountdown from "../chat/hooks/useRateLimitCountdown";
import useSystemPrefersDark from "../chat/hooks/useSystemPrefersDark";
import useWebchatDocumentMeta from "../chat/hooks/useWebchatDocumentMeta";
import useChatConversationsData from "../chat/hooks/useChatConversationsData";
import usePwaInstallPrompt from "../hooks/usePwaInstallPrompt";
import { usePreventIosInputZoom } from "../chat/hooks/usePreventIosInputZoom";
import { useThemeColor } from "../chat/hooks/useThemeColor";

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
  const [viewPendingId, setViewPendingId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSource, setViewerSource] = useState<ChatSource | null>(null);
  const [viewerSourceUrl, setViewerSourceUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [isMessagingBlocked, setIsMessagingBlocked] = useState(() => session?.user.isBlocked ?? false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(() => {
    const key = session ? `rateLimitUntil:${session.user.id}` : null;
    if (!key) return null;
    const stored = Number(localStorage.getItem(key) ?? "0");
    return stored > Date.now() ? stored : null;
  });
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [themePreference, setThemePreference] = useState<WebchatThemePreference>(() => loadWebchatThemePreference());
  const [pendingDraftTitle, setPendingDraftTitle] = useState<string | null>(null);
  const [titleAnimationTrigger, setTitleAnimationTrigger] = useState(0);
  const systemPrefersDark = useSystemPrefersDark();
  const { canPromptInstall, canShowManualInstall, shouldShowInstallAction, promptInstall } = usePwaInstallPrompt();

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

  // Keep blocked state in sync with the session (updated on hydration / re-auth)
  useEffect(() => {
    setIsMessagingBlocked(session?.user.isBlocked ?? false);
  }, [session?.user.isBlocked]);

  useEffect(() => {
    return () => {
      if (viewerSourceUrl) {
        URL.revokeObjectURL(viewerSourceUrl);
      }
    };
  }, [viewerSourceUrl]);

  const replaceViewerSourceUrl = useCallback((nextUrl: string | null) => {
    setViewerSourceUrl((current) => {
      if (current && current !== nextUrl) {
        URL.revokeObjectURL(current);
      }
      return nextUrl;
    });
  }, []);

  const handleCloseSourceViewer = useCallback(() => {
    setViewerOpen(false);
    setViewerSource(null);
    setViewerLoading(false);
    setViewerError(null);
    replaceViewerSourceUrl(null);
  }, [replaceViewerSourceUrl]);

  const handleInstallApp = useCallback(async () => {
    if (canPromptInstall) {
      const outcome = await promptInstall();

      if (outcome === "accepted") {
        showNotice("success", "Приложение установлено на главный экран.");
        return;
      }

      if (outcome === "dismissed") {
        showNotice("warning", "Установка отменена. Можно попробовать позже снова.");
        return;
      }

      showNotice("warning", "Запрос на установку недоступен. Откройте меню браузера и выберите \"Установить приложение\".");
      return;
    }

    if (canShowManualInstall) {
      showNotice("warning", "На iPhone откройте меню \"Поделиться\" и выберите \"На экран Домой\".");
      return;
    }

    showNotice("warning", "Кнопка установки есть в меню \"Установить приложение\". Если кнопки нет, обновите страницу.");
  }, [canPromptInstall, canShowManualInstall, promptInstall, showNotice]);

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

  const applyRateLimit = useCallback((until: number | null) => {
    const key = session ? `rateLimitUntil:${session.user.id}` : null;
    if (key) {
      if (until) {
        localStorage.setItem(key, String(until));
      } else {
        localStorage.removeItem(key);
      }
    }
    setRateLimitUntil(until);
  }, [session]);

  const handleRateLimitExpire = useCallback(() => {
    applyRateLimit(null);
  }, [applyRateLimit]);
  const rateLimitSecondsLeft = useRateLimitCountdown(rateLimitUntil, handleRateLimitExpire);
  useWebchatDocumentMeta({
    conversationTitle: activeConversation?.title,
    resolvedTheme,
    preservePreviousConversationTitle: Boolean(routeConversationId && isLoadingConversation),
  });
  usePreventIosInputZoom();
  useThemeColor(resolvedTheme);

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
    setPendingDraftTitle(null);
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

  const resolveImmediateDraftTitle = useCallback((prompt: string) => {
    const normalized = prompt.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return "New chat";
    }

    return normalized.length > 60 ? `${normalized.slice(0, 57).trimEnd()}...` : normalized;
  }, []);

  const handleSend = useCallback(
    async (prompt: string) => {
      if (!session || pending || sendLockRef.current || isMessagingBlocked || rateLimitSecondsLeft > 0) return;

      sendLockRef.current = true;
      setPending(true);

      let conversation = activeConversation;
      let isFreshConversation = false;

      // Show the user's question as the title instantly — before any API call.
      const draftTitle = !conversation ? resolveImmediateDraftTitle(prompt) : null;
      if (draftTitle) {
        setPendingDraftTitle(draftTitle);
      }

      if (!conversation) {
        try {
          conversation = await createConversation({ session });
          isFreshConversation = true;
        } catch (requestError) {
          setPendingDraftTitle(null);
          showNotice("error", localizeUserErrorMessage(requestError, "Не удалось начать новый диалог."));
          setPending(false);
          sendLockRef.current = false;
          return;
        }
      }

      const userMessage = createTransientMessage("user", prompt);
      const immediateTitle =
        conversation.messages.length === 0 && conversation.title.trim() === "New chat"
          ? resolveImmediateDraftTitle(prompt)
          : conversation.title;
      const optimisticConversation: Conversation = {
        ...conversation,
        title: immediateTitle,
        updatedAt: new Date().toISOString(),
        messages: [...conversation.messages, userMessage],
      };

      // Conversation is in state now — the header uses activeConversation.title, drop the draft.
      setPendingDraftTitle(null);
      syncActiveConversation(optimisticConversation, "move-to-top", "preserve");

      // Navigate only after the conversation is created — we'll confirm navigation on success.
      // For fresh conversations we navigate now so the URL is correct, but we handle
      // cleanup (deletion) on terminal failures so no stale empty chat remains.
      if (isFreshConversation) {
        navigate(`/app/chat/${conversation.id}`, { replace: true });
      }

      try {
        const response = await askAssistant({
          question: prompt,
          session,
          history: optimisticConversation.messages,
          conversationId: conversation.id,
        });
        setIsMessagingBlocked(false);
        applyRateLimit(null);
        const answer = response.answer || "Ответ не был получен.";
        const sources = response.sources || [];
        const aiTitle = response.title || null;
        const answeredConversation: Conversation = {
          ...optimisticConversation,
          title: aiTitle ?? optimisticConversation.title,
          updatedAt: new Date().toISOString(),
          messages: [...optimisticConversation.messages, createTransientMessage("assistant", answer, sources)],
        };

        if (aiTitle) {
          setTitleAnimationTrigger((n) => n + 1);
        }
        syncActiveConversation(answeredConversation, "move-to-top", "latest");
        setPending(false);

        try {
          const persistedConversation = await saveConversationExchange({
            session,
            conversationId: conversation.id,
            question: prompt,
            answer,
            sources,
          });

          syncActiveConversation(persistedConversation, "move-to-top", "latest");
        } catch (saveError) {
          showNotice(
            "error",
            saveError instanceof Error ? `${saveError.message} Ответ не был сохранен.` : "Ответ не был сохранен.",
          );
        }
      } catch (requestError) {
        if (isBlockedMessagingError(requestError)) {
          setIsMessagingBlocked(true);
          // Clean up the stale empty conversation so the sidebar and URL don't linger
          if (isFreshConversation) {
            void deleteConversation(session, conversation.id).catch(() => undefined);
            setConversations((prev) => prev.filter((c) => c.id !== conversation!.id));
            navigate("/app", { replace: true });
          } else {
            syncActiveConversation(conversation, "preserve", "preserve");
          }
          return;
        }

        if (isRateLimitError(requestError)) {
          applyRateLimit(Date.now() + RATE_LIMIT_WINDOW_SECONDS * 1000);
          // Clean up the stale empty conversation so the sidebar and URL don't linger
          if (isFreshConversation) {
            void deleteConversation(session, conversation.id).catch(() => undefined);
            setConversations((prev) => prev.filter((c) => c.id !== conversation!.id));
            navigate("/app", { replace: true });
          } else {
            syncActiveConversation(conversation, "preserve", "preserve");
          }
          return;
        }

        showNotice("error", localizeUserErrorMessage(requestError, "Ответ не получен."));
        syncActiveConversation(conversation, "preserve", "preserve");
      } finally {
        setPending(false);
        sendLockRef.current = false;
      }
    },
    [
      activeConversation,
      applyRateLimit,
      isMessagingBlocked,
      navigate,
      pending,
      rateLimitSecondsLeft,
      resolveImmediateDraftTitle,
      session,
      setConversations,
      setPendingDraftTitle,
      setTitleAnimationTrigger,
      showNotice,
      syncActiveConversation,
    ],
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

    setProfilePending(true);

    try {
      await updateProfile({ name, email, password: profilePassword });
      setProfileOpen(false);
      setProfilePassword("");
      showNotice("success", "Профиль успешно обновлен.");
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

      if (window.matchMedia("(max-width: 1023px)").matches) {
        showNotice("warning", "Просмотр PDF доступен только на десктопе для текущей версии.");
        return;
      }

      setViewerOpen(true);
      setViewerSource(source);
      setViewerLoading(true);
      setViewerError(null);
      setViewPendingId(source.id);
      replaceViewerSourceUrl(null);

      try {
        const blob = await downloadConversationSource({
          session,
          conversationId: activeConversationId,
          documentId: source.documentId,
        });

        const sourceLooksPdf = source.title.toLowerCase().endsWith(".pdf");
        const blobIsPdf = blob.type.toLowerCase().includes("application/pdf");
        const headerSignature = await blob.slice(0, 5).text();
        const headerLooksPdf = headerSignature === "%PDF-";

        if (!sourceLooksPdf && !blobIsPdf && !headerLooksPdf) {
          setViewerError("Неподдерживаемый формат файла для PDF-просмотра.");
          return;
        }

        const previewBlob = blobIsPdf ? blob : new Blob([blob], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(previewBlob);
        replaceViewerSourceUrl(objectUrl);
      } catch (requestError) {
        setViewerError(localizeUserErrorMessage(requestError, "Не удалось открыть источник."));
      } finally {
        setViewerLoading(false);
        setViewPendingId(null);
      }
    },
    [activeConversationId, replaceViewerSourceUrl, session, showNotice],
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
    <div
      className={[
        `webchat-shell webchat-theme-${resolvedTheme} fixed inset-0 flex overflow-hidden pt-[env(safe-area-inset-top)]`,
        resolvedTheme === "light"
          ? "bg-[linear-gradient(180deg,_#ffffff_0%,_#f5f7fb_100%)] text-[#1c1b18]"
          : "bg-[linear-gradient(180deg,_#07101a_0%,_#03070d_100%)] text-slate-100",
      ].join(" ")}
      style={{ height: "100dvh" }}
    >
      <ChatSidebar
        activeConversationId={activeConversationId}
        conversations={conversations}
        hasHistory={conversations.length > 0}
        loading={isLoadingList}
        isMobileOpen={mobileSidebarOpen}
        isAdmin={session.user.role === "admin"}
        historyPending={deleteAllPending}
        titleAnimationTrigger={titleAnimationTrigger}
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
        showInstallAppAction={shouldShowInstallAction}
        onInstallApp={() => {
          void handleInstallApp();
        }}
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
                  aria-label={mobileSidebarOpen ? "Скрыть меню" : "Открыть меню"}
                >
                  {mobileSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
                </button>
              </div>

              <div className="min-w-0 flex-1 px-2 text-center">
                <h1 className="truncate font-heading text-[13px] text-slate-100">
                  <AnimatedTitle
                    title={activeConversation?.title ?? pendingDraftTitle ?? "Mugallim AI"}
                    animationTrigger={titleAnimationTrigger}
                  />
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
                  aria-label={mobileSourcesOpen ? "Скрыть источники" : "Показать источники"}
                >
                  <BookOpenText size={16} />
                </button>
              </div>
            </div>

            <div className="hidden h-full items-center justify-between gap-2.5 px-5 md:flex">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-[16px] text-slate-100">
                    <AnimatedTitle
                      title={activeConversation?.title ?? pendingDraftTitle ?? "Новый чат"}
                      animationTrigger={titleAnimationTrigger}
                    />
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
            suggestionsDisabled={pending || isLoadingList || isLoadingConversation || isMessagingBlocked || rateLimitSecondsLeft > 0}
          />
          <ChatComposer
            disabled={pending || isLoadingList || isLoadingConversation}
            isMessagingBlocked={isMessagingBlocked}
            rateLimitSecondsLeft={rateLimitSecondsLeft}
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
          viewPendingId={viewPendingId}
          loading={isLoadingConversation}
          desktopOpen={desktopSourcesOpen}
          mobileOpen={mobileSourcesOpen}
          sources={activeSources}          
          onCloseMobile={() => setMobileSourcesOpen(false)}
          onViewSource={(source) => {
            void handleViewSource(source);
          }}
          onDownloadSource={(source) => {
            void handleDownloadSource(source);
          }}
        />
      </div>

      <SourceViewerModal
        open={viewerOpen}
        source={viewerSource}
        sourceUrl={viewerSourceUrl}
        loading={viewerLoading}
        error={viewerError}
        resolvedTheme={resolvedTheme}
        onClose={handleCloseSourceViewer}
        onDownload={(source) => {
          void handleDownloadSource(source);
        }}
      />

      <DeleteConversationModal
        open={Boolean(deleteTargetConversation)}
        title={deleteTargetConversation?.title ?? "Этот диалог"}
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
      <ToastNotice notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}
