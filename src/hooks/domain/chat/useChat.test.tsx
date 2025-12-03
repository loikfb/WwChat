/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';

import { webSocketService } from '@/services/websocket';

import { useChat } from './useChat';

// Mock WebSocket service
jest.mock('@/services/websocket', () => ({
  webSocketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getStatus: jest.fn(() => 'connected'),
    isConnected: jest.fn(() => true),
    registerListenersOnce: jest.fn(),
    removeHeart: jest.fn(),
    sendHeart: jest.fn(),
    sendMessage: jest.fn(),
    sendTyping: jest.fn(),
    setListeners: jest.fn(),
    subscribeToHeartReceived: jest.fn(() => jest.fn()),
  },
}));

// Mock chat services
jest.mock('./chatService', () => ({
  ChatServices: {
    fetchHearts: jest.fn(() => Promise.resolve([])),
    fetchMessages: jest.fn(() => Promise.resolve([])),
    fetchThread: jest.fn(() => Promise.resolve(undefined)),
    fetchThreads: jest.fn(() => Promise.resolve([])),
  },
}));

describe('useChat Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('WebSocket Listeners Setup', () => {
    test('should set up WebSocket listeners on mount', async () => {
      renderHook(() => useChat(), { wrapper });

      await waitFor(() => {
        expect(webSocketService.registerListenersOnce).toHaveBeenCalledWith(
          'chat',
          expect.objectContaining({
            onHeart: expect.any(Function),
            onHeartRemoved: expect.any(Function),
            onHeartSent: expect.any(Function),
            onMessage: expect.any(Function),
            onMessageSent: expect.any(Function),
          }),
        );
      });
    });

    test('should not call connect or disconnect - managed by singleton', () => {
      const { unmount } = renderHook(() => useChat(), { wrapper });

      // Should NOT call connect - WebSocket is initialized in App.tsx
      expect(webSocketService.connect).not.toHaveBeenCalled();

      unmount();

      // Should NOT call disconnect - WebSocket is managed by App.tsx
      expect(webSocketService.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Hook API', () => {
    test('should return getWebSocketStatus function', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      expect(result.current.getWebSocketStatus).toBeDefined();
      expect(result.current.getWebSocketStatus()).toBe('connected');
    });

    test('should return sendMessage function', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      result.current.sendMessage('receiver-id', 'Hello');

      expect(webSocketService.sendMessage).toHaveBeenCalledWith(
        'a1b2c3d4',
        'receiver-id',
        'Hello',
      );
    });

    test('should return sendTyping function', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      result.current.sendTyping('receiver-id', true);

      expect(webSocketService.sendTyping).toHaveBeenCalledWith(
        'a1b2c3d4',
        'receiver-id',
        true,
      );
    });

    test('should return toggleHeart function for adding heart', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      result.current.toggleHeart('message-id', 'receiver-id', undefined);

      expect(webSocketService.sendHeart).toHaveBeenCalledWith(
        'a1b2c3d4',
        'receiver-id',
        'message-id',
      );
    });

    test('should return toggleHeart function for removing heart', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      const existingHeart = {
        id: 'heart-1',
        messageId: 'message-id',
        receiverId: 'receiver-id',
        senderId: 'a1b2c3d4',
        timestamp: new Date().toISOString(),
      };

      result.current.toggleHeart('message-id', 'receiver-id', existingHeart);

      expect(webSocketService.removeHeart).toHaveBeenCalledWith(
        'heart-1',
        'a1b2c3d4',
        'receiver-id',
        'message-id',
      );
    });
  });

  describe('Query Hooks', () => {
    test('should provide useThreadsQuery hook', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      expect(result.current.useThreadsQuery).toBeDefined();
      expect(typeof result.current.useThreadsQuery).toBe('function');
    });

    test('should provide useThreadQuery hook', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      expect(result.current.useThreadQuery).toBeDefined();
      expect(typeof result.current.useThreadQuery).toBe('function');
    });

    test('should provide useMessagesQuery hook', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      expect(result.current.useMessagesQuery).toBeDefined();
      expect(typeof result.current.useMessagesQuery).toBe('function');
    });

    test('should provide useHeartsQuery hook', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      expect(result.current.useHeartsQuery).toBeDefined();
      expect(typeof result.current.useHeartsQuery).toBe('function');
    });
  });

  describe('WebSocket Event Handlers', () => {
    test('should handle incoming message events', async () => {
      renderHook(() => useChat(), { wrapper });

      await waitFor(() => {
        expect(webSocketService.registerListenersOnce).toHaveBeenCalled();
      });

      // Get the onMessage handler
      const registerListenersCall = (
        webSocketService.registerListenersOnce as jest.Mock
      ).mock.calls[0][1];
      const onMessage = registerListenersCall.onMessage;

      const testMessage = {
        id: 'msg-1',
        senderId: 'user-1',
        text: 'Hello',
        threadId: 'thread-1',
        timestamp: new Date().toISOString(),
      };

      // Should not throw when handling message
      expect(() => onMessage(testMessage)).not.toThrow();
    });

    test('should invalidate threads query when message_sent event fires', async () => {
      renderHook(() => useChat(), { wrapper });

      await waitFor(() => {
        expect(webSocketService.registerListenersOnce).toHaveBeenCalled();
      });

      // Get the onMessageSent handler
      const registerListenersCall = (
        webSocketService.registerListenersOnce as jest.Mock
      ).mock.calls[0][1];
      const onMessageSent = registerListenersCall.onMessageSent;

      const testMessage = {
        id: 'msg-1',
        receiverId: 'user-2',
        senderId: 'a1b2c3d4',
        text: 'First message in new conversation',
        threadId: 'thread-new-123',
        timestamp: new Date().toISOString(),
      };

      // Spy on invalidateQueries
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      // Trigger message_sent event
      onMessageSent(testMessage);

      // Should invalidate threads query (with refetchType: 'none' to mark as stale only)
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['chatThreads'],
        refetchType: 'none',
      });

      invalidateQueriesSpy.mockRestore();
    });

    test('should optimistically update threads cache when message_sent fires for new thread', async () => {
      renderHook(() => useChat(), { wrapper });

      await waitFor(() => {
        expect(webSocketService.registerListenersOnce).toHaveBeenCalled();
      });

      // Set initial threads cache (empty)
      queryClient.setQueryData(['chatThreads'], []);

      // Get the onMessageSent handler
      const registerListenersCall = (
        webSocketService.registerListenersOnce as jest.Mock
      ).mock.calls[0][1];
      const onMessageSent = registerListenersCall.onMessageSent;

      const testMessage = {
        id: 'msg-1',
        receiverId: 'user-2',
        senderId: 'a1b2c3d4',
        text: 'First message in new conversation',
        threadId: 'thread-new-123',
        timestamp: new Date().toISOString(),
      };

      // Trigger message_sent event
      onMessageSent(testMessage);

      // Should optimistically add thread to cache
      const threadsCache = queryClient.getQueryData(['chatThreads']);
      expect(threadsCache).toEqual([
        {
          createdAt: testMessage.timestamp,
          id: 'thread-new-123',
          lastMessage: 'First message in new conversation',
          lastMessageAt: testMessage.timestamp,
          participants: ['a1b2c3d4', 'user-2'],
        },
      ]);
    });

    test('should update existing thread when message_sent fires for existing thread', async () => {
      renderHook(() => useChat(), { wrapper });

      await waitFor(() => {
        expect(webSocketService.registerListenersOnce).toHaveBeenCalled();
      });

      // Set initial threads cache with existing thread
      const existingThread = {
        createdAt: '2024-01-01T00:00:00.000Z',
        id: 'thread-123',
        lastMessage: 'Old message',
        lastMessageAt: '2024-01-01T00:00:00.000Z',
        participants: ['a1b2c3d4', 'user-2'],
      };
      queryClient.setQueryData(['chatThreads'], [existingThread]);

      // Get the onMessageSent handler
      const registerListenersCall = (
        webSocketService.registerListenersOnce as jest.Mock
      ).mock.calls[0][1];
      const onMessageSent = registerListenersCall.onMessageSent;

      const testMessage = {
        id: 'msg-2',
        receiverId: 'user-2',
        senderId: 'a1b2c3d4',
        text: 'New message',
        threadId: 'thread-123',
        timestamp: '2024-01-01T01:00:00.000Z',
      };

      // Trigger message_sent event
      onMessageSent(testMessage);

      // Should update existing thread
      const threadsCache = queryClient.getQueryData(['chatThreads']);
      expect(threadsCache).toEqual([
        {
          createdAt: '2024-01-01T00:00:00.000Z',
          id: 'thread-123',
          lastMessage: 'New message',
          lastMessageAt: '2024-01-01T01:00:00.000Z',
          participants: ['a1b2c3d4', 'user-2'],
        },
      ]);
    });

    test('should handle incoming heart events', async () => {
      renderHook(() => useChat(), { wrapper });

      await waitFor(() => {
        expect(webSocketService.registerListenersOnce).toHaveBeenCalled();
      });

      const registerListenersCall = (
        webSocketService.registerListenersOnce as jest.Mock
      ).mock.calls[0][1];
      const onHeart = registerListenersCall.onHeart;

      const testHeart = {
        id: 'heart-1',
        messageId: 'msg-1',
        senderId: 'user-1',
        timestamp: new Date().toISOString(),
      };

      expect(() => onHeart(testHeart)).not.toThrow();
    });

    test('should handle heart removed events', async () => {
      renderHook(() => useChat(), { wrapper });

      await waitFor(() => {
        expect(webSocketService.registerListenersOnce).toHaveBeenCalled();
      });

      const registerListenersCall = (
        webSocketService.registerListenersOnce as jest.Mock
      ).mock.calls[0][1];
      const onHeartRemoved = registerListenersCall.onHeartRemoved;

      const testEvent = {
        heartId: 'heart-1',
        messageId: 'msg-1',
      };

      expect(() => onHeartRemoved(testEvent)).not.toThrow();
    });
  });

  describe('Multiple Hook Instances Behavior', () => {
    test('should share same WebSocket connection across multiple hook instances', () => {
      // Render multiple hook instances
      const { result: result1 } = renderHook(() => useChat(), { wrapper });
      const { result: result2 } = renderHook(() => useChat(), { wrapper });
      const { result: result3 } = renderHook(() => useChat(), { wrapper });

      // WebSocket connection is managed by App.tsx singleton, not by individual hooks
      expect(webSocketService.connect).not.toHaveBeenCalled();

      // All instances should work correctly with the singleton connection
      expect(result1.current.getWebSocketStatus()).toBe('connected');
      expect(result2.current.getWebSocketStatus()).toBe('connected');
      expect(result3.current.getWebSocketStatus()).toBe('connected');
    });

    test('should not disconnect when individual hook instances unmount', () => {
      // First hook instance
      const { unmount: unmount1 } = renderHook(() => useChat(), { wrapper });

      // Second hook instance
      const { result: result2 } = renderHook(() => useChat(), { wrapper });

      // No connect calls - managed by App.tsx
      expect(webSocketService.connect).not.toHaveBeenCalled();

      // Unmount first instance
      unmount1();

      // Should not disconnect - WebSocket is managed by App.tsx singleton
      expect(webSocketService.disconnect).not.toHaveBeenCalled();

      // Second instance should still work
      expect(result2.current.getWebSocketStatus()).toBe('connected');
    });
  });
});
