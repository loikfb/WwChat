import type {
  Heart,
  HeartEvent,
  HeartRemovedEvent,
  Message,
  MessageEvent,
  Thread,
} from './schema';

import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { webSocketService, type WebSocketStatus } from '@/services/websocket';

import { ChatServices } from './chatService';

export const enum ChatQueryKey {
  hearts = 'chatHearts',
  messages = 'chatMessages',
  thread = 'chatThread',
  threads = 'chatThreads',
}

// Constants
const CURRENT_USER_ID = process.env.CURRENT_USER_ID ?? 'a1b2c3d4';

// Queries
const useThreadsQuery = () =>
  useQuery({
    queryFn: () => ChatServices.fetchThreads(CURRENT_USER_ID),
    queryKey: [ChatQueryKey.threads],
  });

const useThreadQuery = (id: string) =>
  useQuery({
    enabled: !!id,
    queryFn: () => ChatServices.fetchThread(id),
    queryKey: [ChatQueryKey.thread, id],
  });

const useMessagesQuery = (threadId: string) =>
  useQuery({
    enabled: !!threadId,
    queryFn: () => ChatServices.fetchMessages(threadId),
    queryKey: [ChatQueryKey.messages, threadId],
    refetchOnMount: false, // Don't refetch on mount if we have data
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

const useHeartsQuery = (messageId: string) =>
  useQuery({
    enabled: !!messageId,
    queryFn: () => ChatServices.fetchHearts(messageId),
    queryKey: [ChatQueryKey.hearts, messageId],
  });

// Helper function for message update logic
const updateMessageCaches = (
  message: MessageEvent,
  queryClient: QueryClient,
) => {
  // Update threads cache
  queryClient.setQueryData<Thread[]>([ChatQueryKey.threads], (old = []) => {
    if (old.some((t) => t.id === message.threadId)) {
      return old.map((t) =>
        t.id === message.threadId
          ? {
              ...t,
              lastMessage: message.text,
              lastMessageAt: message.timestamp,
            }
          : t,
      );
    }

    const newThread: Thread = {
      createdAt: message.timestamp,
      id: message.threadId,
      lastMessage: message.text,
      lastMessageAt: message.timestamp,
      participants: [message.senderId, message.receiverId].sort(),
    };
    return [...old, newThread].sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime(),
    );
  });

  // Update messages cache
  queryClient.setQueryData<Message[]>(
    [ChatQueryKey.messages, message.threadId],
    (old = []) => {
      const filtered = old.filter((m) => m.id !== message.id);
      return [...filtered, message].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    },
  );

  // Invalidate threads
  void queryClient.invalidateQueries({
    queryKey: [ChatQueryKey.threads],
    refetchType: 'none',
  });
};

export const useChat = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Register listeners for chat events
    webSocketService.registerListenersOnce('chat', {
      onHeart: (heart: HeartEvent) => {
        // Update hearts cache
        queryClient.setQueryData<Heart[]>(
          [ChatQueryKey.hearts, heart.messageId],
          (old = []) => {
            if (old.some((h) => h.id === heart.id)) {
              return old;
            }
            return [...old, heart];
          },
        );
      },
      onHeartRemoved: (event: HeartRemovedEvent) => {
        queryClient.setQueryData<Heart[]>(
          [ChatQueryKey.hearts, event.messageId],
          (old = []) => old.filter((h) => h.id !== event.heartId),
        );
      },
      onHeartSent: (heart: HeartEvent) => {
        // Optimistic update confirmation
        queryClient.setQueryData<Heart[]>(
          [ChatQueryKey.hearts, heart.messageId],
          (old = []) => {
            if (old.some((h) => h.id === heart.id)) {
              return old;
            }
            return [...old, heart];
          },
        );
      },
      onMessage: (message: MessageEvent) => {
        updateMessageCaches(message, queryClient);
      },
      onMessageSent: (message: MessageEvent) => {
        updateMessageCaches(message, queryClient);
      },
    });
  }, [queryClient]);

  // Mutations (using WebSocket)
  const sendMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (receiverId: string, text: string, threadId?: string) => {
      webSocketService.sendMessage(CURRENT_USER_ID, receiverId, text);
    },
    [],
  );

  const toggleHeart = useCallback(
    (messageId: string, receiverId: string, existingHeart?: Heart) => {
      if (existingHeart) {
        webSocketService.removeHeart(
          existingHeart.id,
          CURRENT_USER_ID,
          receiverId,
          messageId,
        );
      } else {
        webSocketService.sendHeart(CURRENT_USER_ID, receiverId, messageId);
      }
    },
    [],
  );

  const sendTyping = useCallback((receiverId: string, isTyping: boolean) => {
    webSocketService.sendTyping(CURRENT_USER_ID, receiverId, isTyping);
  }, []);

  const getWebSocketStatus = useCallback((): WebSocketStatus => {
    return webSocketService.getStatus();
  }, []);

  const onHeartReceived = useCallback(
    (callback: (heart: HeartEvent) => void) => {
      return webSocketService.subscribeToHeartReceived(callback);
    },
    [],
  );

  return {
    getWebSocketStatus,
    onHeartReceived,
    sendMessage,
    sendTyping,
    toggleHeart,
    useHeartsQuery,
    useMessagesQuery,
    useThreadQuery,
    useThreadsQuery,
  };
};
