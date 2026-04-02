import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect } from "react";
import type { NavigateFunction } from "react-router-dom";

import type { NoticeState } from "../../../../core/types";
import { getConversation, listConversations } from "../utils/api";
import { getConversationPreview, localizeUserErrorMessage, sortConversationsByRecent } from "../utils/chatPageUtils";
import type { Conversation, ConversationSummary, ChatSource } from "../utils/types";
import type { AuthSession } from "../../../../core/auth";

interface UseChatConversationsDataOptions {
  session: AuthSession | null;
  routeConversationId?: string;
  activeConversation: Conversation | null;
  navigate: NavigateFunction;
  showNotice: (type: NoticeState["type"], message: string) => void;
  syncActiveConversation: (
    conversation: Conversation,
    orderMode?: "preserve" | "move-to-top",
    sourcesMode?: "preserve" | "latest",
  ) => void;
  conversationRequestIdRef: MutableRefObject<number>;
  selectedSourcesMessageIdRef: MutableRefObject<string | null>;
  setConversations: Dispatch<SetStateAction<ConversationSummary[]>>;
  setIsLoadingList: Dispatch<SetStateAction<boolean>>;
  setIsLoadingConversation: Dispatch<SetStateAction<boolean>>;
  setActiveConversationId: Dispatch<SetStateAction<string | null>>;
  setActiveConversation: Dispatch<SetStateAction<Conversation | null>>;
  setActiveSources: Dispatch<SetStateAction<ChatSource[]>>;
  setSelectedSourcesMessageId: Dispatch<SetStateAction<string | null>>;
  setRenameTargetConversation: Dispatch<SetStateAction<ConversationSummary | null>>;
  setRenameValue: Dispatch<SetStateAction<string>>;
  setDeleteTargetConversation: Dispatch<SetStateAction<ConversationSummary | null>>;
}

export default function useChatConversationsData({
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
}: UseChatConversationsDataOptions) {
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
  }, [session, setConversations, setIsLoadingList, showNotice]);

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
  }, [
    activeConversation,
    conversationRequestIdRef,
    navigate,
    routeConversationId,
    selectedSourcesMessageIdRef,
    session,
    setActiveConversation,
    setActiveConversationId,
    setActiveSources,
    setDeleteTargetConversation,
    setIsLoadingConversation,
    setRenameTargetConversation,
    setRenameValue,
    setSelectedSourcesMessageId,
    showNotice,
    syncActiveConversation,
  ]);
}