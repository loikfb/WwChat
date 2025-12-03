import type { Heart, Message, Thread } from '@/hooks/domain/chat/schema';
import type { RootScreenProps } from '@/navigation/types';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { MMKV } from 'react-native-mmkv';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Paths } from '@/navigation/paths';
import { ThemeProvider } from '@/theme';
import i18n from '@/translations';

import Chat from './Chat';

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

// Default mock implementations
const mockSendMessage = jest.fn();
const mockUseMessagesQuery = jest.fn<
  { data: Message[]; isError: boolean; isLoading: boolean },
  []
>(() => ({
  data: [],
  isError: false,
  isLoading: false,
}));
const mockUseThreadsQuery = jest.fn<
  { data: Thread[]; isError: boolean; isLoading: boolean },
  []
>(() => ({
  data: [],
  isError: false,
  isLoading: false,
}));
const mockUseHeartsQuery = jest.fn<
  { data: Heart[]; isError: boolean; isLoading: boolean },
  []
>(() => ({
  data: [],
  isError: false,
  isLoading: false,
}));

// Mock hooks
jest.mock('@/hooks', () => ({
  useChat: () => ({
    getWebSocketStatus: () => 'connected',
    onHeartReceived: jest.fn(() => jest.fn()),
    sendMessage: mockSendMessage,
    sendTyping: jest.fn(),
    toggleHeart: jest.fn(),
    useHeartsQuery: mockUseHeartsQuery,
    useMessagesQuery: mockUseMessagesQuery,
    useThreadsQuery: mockUseThreadsQuery,
  }),
  useI18n: () => ({
    toggleLanguage: jest.fn(),
  }),
  useUser: () => ({
    getCurrentUserId: () => 'a1b2c3d4',
    useUserQuery: jest.fn(() => ({
      data: {
        avatar: 'https://example.com/avatar.jpg',
        id: 'e5f6g7h8',
        name: 'Test User',
      },
      isError: false,
      isLoading: false,
    })),
  }),
}));

describe('Chat screen should render correctly', () => {
  let storage: MMKV;
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        gcTime: Infinity,
      },
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  const mockNavigation = {
    addListener: jest.fn(),
    canGoBack: jest.fn(() => true),
    dispatch: jest.fn(),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    navigate: jest.fn(),
    removeListener: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
  } as unknown as RootScreenProps<Paths.Chat>['navigation'];

  const mockRoute = {
    key: 'test-route-key',
    name: Paths.Chat,
    params: {
      userId: 'e5f6g7h8',
    },
  } as RootScreenProps<Paths.Chat>['route'];

  beforeAll(() => {
    storage = new MMKV();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default mocks
    mockUseMessagesQuery.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    });
    mockUseThreadsQuery.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    });
  });

  test('renders chat screen with user', () => {
    const component = (
      <SafeAreaProvider>
        <ThemeProvider storage={storage}>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              <Chat navigation={mockNavigation} route={mockRoute} />
            </QueryClientProvider>
          </I18nextProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    render(component);

    // Check if user name is displayed
    expect(screen.getByText('Test User')).toBeDefined();
  });

  test('shows "No messages yet" when there are no messages', () => {
    const component = (
      <SafeAreaProvider>
        <ThemeProvider storage={storage}>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              <Chat navigation={mockNavigation} route={mockRoute} />
            </QueryClientProvider>
          </I18nextProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    render(component);

    // Check if "No messages yet" is displayed
    expect(screen.getByText('No messages yet')).toBeDefined();
  });

  test('derives threadId from threads query and displays messages', () => {
    // Mock existing thread and messages
    const mockThreadId = 'thread_123';
    const mockThread = {
      createdAt: '2024-01-01T00:00:00.000Z',
      id: mockThreadId,
      lastMessage: 'Hello!',
      lastMessageAt: '2024-01-01T00:01:00.000Z',
      participants: ['a1b2c3d4', 'e5f6g7h8'],
    };

    const mockMessage = {
      id: 'msg_1',
      read: false,
      receiverId: 'e5f6g7h8',
      senderId: 'a1b2c3d4',
      text: 'Hello!',
      threadId: mockThreadId,
      timestamp: '2024-01-01T00:01:00.000Z',
    };

    mockUseThreadsQuery.mockReturnValue({
      data: [mockThread],
      isError: false,
      isLoading: false,
    });

    mockUseMessagesQuery.mockReturnValue({
      data: [mockMessage],
      isError: false,
      isLoading: false,
    });

    const component = (
      <SafeAreaProvider>
        <ThemeProvider storage={storage}>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              <Chat navigation={mockNavigation} route={mockRoute} />
            </QueryClientProvider>
          </I18nextProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    render(component);

    // Should show the message
    expect(screen.getByText('Hello!')).toBeDefined();

    // Should not show "No messages yet"
    expect(screen.queryByText('No messages yet')).toBeNull();
  });

  test('handles new conversation: threadId starts as null then appears after message sent', () => {
    // Initially no threads
    mockUseThreadsQuery.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    });

    mockUseMessagesQuery.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    });

    const component = (
      <SafeAreaProvider>
        <ThemeProvider storage={storage}>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              <Chat navigation={mockNavigation} route={mockRoute} />
            </QueryClientProvider>
          </I18nextProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    const { rerender } = render(component);

    // Initially should show "No messages yet"
    expect(screen.getByText('No messages yet')).toBeDefined();

    // Simulate: user sends message, server creates thread and returns it
    // The invalidateQueries in useChat will cause threads query to refetch
    const mockThreadId = 'thread_new_123';
    const mockNewThread = {
      createdAt: '2024-01-01T00:00:00.000Z',
      id: mockThreadId,
      lastMessage: 'First message!',
      lastMessageAt: '2024-01-01T00:01:00.000Z',
      participants: ['a1b2c3d4', 'e5f6g7h8'],
    };

    const mockNewMessage = {
      id: 'msg_new_1',
      read: false,
      receiverId: 'e5f6g7h8',
      senderId: 'a1b2c3d4',
      text: 'First message!',
      threadId: mockThreadId,
      timestamp: '2024-01-01T00:01:00.000Z',
    };

    // Update mocks to return new thread and message
    mockUseThreadsQuery.mockReturnValue({
      data: [mockNewThread],
      isError: false,
      isLoading: false,
    });

    mockUseMessagesQuery.mockReturnValue({
      data: [mockNewMessage],
      isError: false,
      isLoading: false,
    });

    // Rerender to simulate query refetch
    rerender(
      <SafeAreaProvider>
        <ThemeProvider storage={storage}>
          <I18nextProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              <Chat navigation={mockNavigation} route={mockRoute} />
            </QueryClientProvider>
          </I18nextProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    // Now should show the message
    expect(screen.getByText('First message!')).toBeDefined();

    // Should not show "No messages yet" anymore
    expect(screen.queryByText('No messages yet')).toBeNull();
  });
});
