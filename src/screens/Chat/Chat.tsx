import type { RootScreenProps } from '@/navigation/types';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  type Heart,
  HeartEvent,
  type Message,
  useChat,
  useUser,
} from '@/hooks';
import { Paths } from '@/navigation/paths';
import { useTheme } from '@/theme';

import { MessageWithHearts } from '@/components/molecules';
import { HeartsOverlay } from '@/components/organisms';
import { SafeScreen } from '@/components/templates';

import { webSocketService } from '@/services/websocket';

const SCROLL_DELAY_MS = 100;
const TYPING_TIMEOUT_MS = 1000;

function Chat({ navigation, route }: RootScreenProps<Paths.Chat>) {
  const { userId } = route.params;
  const { t } = useTranslation();
  const { backgrounds, colors, fonts, gutters, layout } = useTheme();

  const {
    getWebSocketStatus,
    onHeartReceived,
    sendMessage,
    sendTyping,
    toggleHeart,
    useMessagesQuery,
    useThreadsQuery,
  } = useChat();

  const { getCurrentUserId, useUserQuery } = useUser();

  const currentUserId = getCurrentUserId();
  const otherUserQuery = useUserQuery(userId);
  const threadsQuery = useThreadsQuery();
  const wsStatus = getWebSocketStatus();

  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHeartsOverlay, setShowHeartsOverlay] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | undefined>(
    undefined,
  );
  const flatListReference = useRef<FlatList>(null);
  const typingTimeoutReference = useRef<NodeJS.Timeout | null>(null);
  const sentReadReceipts = useRef<Set<string>>(new Set());

  // Derive threadId from threads query - no local state needed
  const threadId = useMemo(() => {
    if (!threadsQuery.data || !userId) return '';

    const thread = threadsQuery.data.find(
      (t) =>
        t.participants.includes(currentUserId) &&
        t.participants.includes(userId),
    );

    return thread?.id ?? '';
  }, [threadsQuery.data, userId, currentUserId]);

  // Fetch messages when threadId is available
  const messagesQueryWithThread = useMessagesQuery(threadId);

  // Listen to heart events to show overlay when receiving a heart
  useEffect(() => {
    const cleanup = onHeartReceived((heart: HeartEvent) => {
      // Show overlay when current user receives a heart from the other user
      if (heart.receiverId === currentUserId && heart.senderId === userId) {
        setShowHeartsOverlay(true);
      }
    });

    return cleanup;
  }, [onHeartReceived, userId, currentUserId]);

  // Listen to typing events to show typing indicator
  useEffect(() => {
    const handleTypingEvent = (event: {
      isTyping: boolean;
      senderId: string;
    }) => {
      if (event.senderId === userId) {
        setTypingUserId(event.isTyping ? event.senderId : undefined);
      }
    };

    webSocketService.setListeners({
      onTyping: handleTypingEvent,
    });

    return () => {
      // Cleanup - remove typing listener
      webSocketService.setListeners({
        onTyping: undefined,
      });
    };
  }, [userId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (
      messagesQueryWithThread.data &&
      messagesQueryWithThread.data.length > 0
    ) {
      setTimeout(() => {
        flatListReference.current?.scrollToEnd({ animated: true });
      }, SCROLL_DELAY_MS);
    }
  }, [messagesQueryWithThread.data]);

  // Mark unread messages as read when they appear
  useEffect(() => {
    const unreadMessages = messagesQueryWithThread.data?.filter(
      (m) =>
        m.senderId === userId && !m.read && !sentReadReceipts.current.has(m.id),
    );
    if (unreadMessages)
      for (const m of unreadMessages) {
        sentReadReceipts.current.add(m.id);
        webSocketService.sendMessageRead(m.id);
      }
  }, [messagesQueryWithThread.data, userId]);

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim()) return;

    sendMessage(userId, messageText.trim(), threadId || undefined);
    setMessageText('');
    setIsTyping(false);
    if (typingTimeoutReference.current) {
      clearTimeout(typingTimeoutReference.current);
    }
  }, [messageText, sendMessage, threadId, userId]);

  const handleTyping = useCallback(
    (text: string) => {
      setMessageText(text);
      if (!isTyping && text.length > 0) {
        setIsTyping(true);
        sendTyping(userId, true);
      }
      if (typingTimeoutReference.current) {
        clearTimeout(typingTimeoutReference.current);
      }
      typingTimeoutReference.current = setTimeout(() => {
        setIsTyping(false);
        sendTyping(userId, false);
      }, TYPING_TIMEOUT_MS);
    },
    [isTyping, sendTyping, userId],
  );

  const handleHeartPress = useCallback(
    (messageId: string, existingHeart?: Heart) => {
      toggleHeart(messageId, userId, existingHeart);
    },
    [toggleHeart, userId],
  );

  const handleLongPress = useCallback(
    (messageId: string, existingHeart?: Heart) => {
      // Toggle heart first
      toggleHeart(messageId, userId, existingHeart);
      // Show hearts overlay if heart in not already added
      if (!existingHeart) {
        setShowHeartsOverlay(true);
      }
    },
    [toggleHeart, userId],
  );

  const handleHeartsOverlayComplete = useCallback(() => {
    setShowHeartsOverlay(false);
  }, []);

  if (otherUserQuery.isLoading) {
    return (
      <SafeScreen>
        <View style={[layout.flex_1, layout.itemsCenter, layout.justifyCenter]}>
          <ActivityIndicator size="large" />
        </View>
      </SafeScreen>
    );
  }

  const otherUser = otherUserQuery.data;

  if (!otherUser) {
    return (
      <SafeScreen>
        <View style={[layout.flex_1, layout.itemsCenter, layout.justifyCenter]}>
          <Text style={[fonts.size_16, fonts.red500]}>
            {t('common_error', 'Error loading user')}
          </Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[layout.flex_1]}
      >
        {/* Header */}
        <View
          style={[
            layout.row,
            layout.itemsCenter,
            gutters.paddingHorizontal_16,
            gutters.paddingVertical_12,
            {
              backgroundColor: colors.primary,
              borderBottomColor: colors.secondary,
              borderBottomWidth: 1,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              navigation.goBack();
            }}
            style={[gutters.marginRight_12]}
          >
            <Text style={[fonts.size_16, fonts.gray800]}>←</Text>
          </TouchableOpacity>
          {otherUser.avatar ? (
            <Image
              source={{ uri: otherUser.avatar }}
              style={[
                {
                  borderRadius: 20,
                  height: 40,
                  marginRight: 12,
                  width: 40,
                },
              ]}
            />
          ) : undefined}
          <View style={[layout.flex_1]}>
            <Text style={[fonts.size_16, fonts.bold, fonts.gray800]}>
              {otherUser.name}
            </Text>
            <View style={[layout.row, layout.itemsCenter, { gap: 6 }]}>
              <View
                style={[
                  {
                    backgroundColor:
                      otherUser.online && wsStatus === 'connected'
                        ? '#4CAF50'
                        : colors.gray200,
                    borderRadius: 4,
                    height: 8,
                    width: 8,
                  },
                ]}
              />
              <Text style={[fonts.size_12, fonts.gray200]}>
                {otherUser.online && wsStatus === 'connected'
                  ? 'Online'
                  : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          contentContainerStyle={[
            gutters.paddingHorizontal_16,
            gutters.paddingVertical_12,
          ]}
          data={messagesQueryWithThread.data ?? []}
          keyExtractor={(item: Message) => item.id}
          ListEmptyComponent={
            messagesQueryWithThread.isLoading ? (
              <View style={[layout.itemsCenter, gutters.marginTop_40]}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <View style={[layout.itemsCenter, gutters.marginTop_40]}>
                <Text style={[fonts.size_16, fonts.gray200]}>
                  {t('screen_chat.no_messages')}
                </Text>
              </View>
            )
          }
          ref={flatListReference}
          renderItem={({ item: message }) => (
            <MessageWithHearts
              currentUserId={currentUserId}
              message={message}
              onLongPress={handleLongPress}
              onPress={handleHeartPress}
              otherUser={otherUser}
            />
          )}
        />

        {/* Typing Indicator */}
        {typingUserId && typingUserId !== currentUserId ? (
          <View
            style={[
              layout.row,
              layout.itemsCenter,
              gutters.paddingHorizontal_16,
              gutters.paddingBottom_12,
            ]}
          >
            <Text style={[fonts.size_12, fonts.gray200]}>
              {otherUser.name} is typing...
            </Text>
          </View>
        ) : undefined}

        {/* Input */}
        <View
          style={[
            layout.row,
            layout.itemsCenter,
            gutters.paddingHorizontal_16,
            gutters.paddingVertical_12,
            {
              backgroundColor: colors.primary,
              borderTopColor: colors.secondary,
              borderTopWidth: 1,
            },
          ]}
        >
          <TextInput
            multiline
            onChangeText={handleTyping}
            placeholder={t(
              'screen_chat.input_placeholder',
              'Type a message...',
            )}
            placeholderTextColor={colors.gray200}
            style={[
              layout.flex_1,
              fonts.size_16,
              fonts.gray800,
              backgrounds.secondary,
              gutters.paddingHorizontal_16,
              gutters.paddingVertical_12,
              {
                borderRadius: 24,
                maxHeight: 100,
              },
            ]}
            value={messageText}
          />
          <TouchableOpacity
            disabled={!messageText.trim()}
            onPress={handleSendMessage}
            style={[
              gutters.marginLeft_12,
              layout.justifyCenter,
              {
                alignItems: 'center',
                backgroundColor: messageText.trim()
                  ? colors.tintColor
                  : colors.secondary,
                borderRadius: 22,
                height: 44,
                width: 44,
              },
            ]}
          >
            <Text
              style={{
                color: messageText.trim() ? colors.placeholder : colors.label,
                fontSize: 20,
              }}
            >
              ➤
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hearts Overlay */}
        <HeartsOverlay
          onAnimationComplete={handleHeartsOverlayComplete}
          visible={showHeartsOverlay}
        />
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

export default Chat;
