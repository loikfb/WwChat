import type {
  Heart,
  HeartEvent,
  HeartRemovedEvent,
  Message,
  MessageEvent,
  Thread,
} from './schema';

import { useQuery, useQueryClient } from '@tanstack/react-query';
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
const CURRENT_USER_ID = 'a1b2c3d4'; // Alice Johnson

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

export const useChat = () => {
  const queryClient = useQueryClient();

  // Setup WebSocket listeners
  // WebSocket is initialized as singleton in App.tsx
  useEffect(() => {
    // Setup WebSocket listeners for chat events
    webSocketService.setListeners({
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
        // First, optimistically update threads cache
        // This must happen BEFORE we update messages to avoid race conditions
        queryClient.setQueryData<Thread[]>(
          [ChatQueryKey.threads],
          (old = []) => {
            // Check if thread already exists
            if (old.some((t) => t.id === message.threadId)) {
              // Update existing thread's last message
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

            // Add new thread (for new conversations)
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
          },
        );
        // Update messages cache
        queryClient.setQueryData<Message[]>(
          [ChatQueryKey.messages, message.threadId],
          (old = []) => {
            // Check if message already exists
            if (old.some((m) => m.id === message.id)) {
              return old;
            }
            return [...old, message].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            );
          },
        );

        // Invalidate threads to sync with server in background
        void queryClient.invalidateQueries({
          queryKey: [ChatQueryKey.threads],
          refetchType: 'none',
        });
      },
      onMessageSent: (message: MessageEvent) => {
        // First, optimistically update threads cache
        // This must happen BEFORE we update messages to avoid race conditions
        queryClient.setQueryData<Thread[]>(
          [ChatQueryKey.threads],
          (old = []) => {
            // Check if thread already exists
            if (old.some((t) => t.id === message.threadId)) {
              // Update existing thread's last message
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

            // Add new thread (for new conversations)
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
          },
        );

        // Then, optimistically update messages cache
        // This ensures the message is in cache before the query becomes enabled
        queryClient.setQueryData<Message[]>(
          [ChatQueryKey.messages, message.threadId],
          (old = []) => {
            const filtered = old.filter((m) => m.id !== message.id);
            return [...filtered, message].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            );
          },
        );

        // Invalidate threads to sync with server in background
        void queryClient.invalidateQueries({
          queryKey: [ChatQueryKey.threads],
          refetchType: 'none',
        });
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

  return {
    getWebSocketStatus,
    sendMessage,
    sendTyping,
    toggleHeart,
    useHeartsQuery,
    useMessagesQuery,
    useThreadQuery,
    useThreadsQuery,
  };
};
