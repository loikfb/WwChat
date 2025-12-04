import type { Heart, Message } from '@/hooks/domain/chat/schema';
import type { User } from '@/hooks/domain/user/schema';

import { Image, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

import { useTheme } from '@/theme';

type MessageBubbleProps = {
  readonly hearts: Heart[];
  readonly isOwn: boolean;
  readonly message: Message;
  readonly onLongPress: () => void;
  readonly onPress: () => void;
  readonly sender?: User;
  readonly showTimestamp?: boolean;
};

const MILLISECONDS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const SCALE_PRESSED = 0.95;
const HEART_ICON_PADDING = 8;
const LONG_PRESS_DURATION = 500;

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / MILLISECONDS_PER_MINUTE);
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const days = Math.floor(hours / HOURS_PER_DAY);

  if (minutes < 1) return 'now';
  if (minutes < MINUTES_PER_HOUR) return `${minutes}m`;
  if (hours < HOURS_PER_DAY) return `${hours}h`;
  if (days < DAYS_PER_WEEK) return `${days}d`;
  return date.toLocaleDateString();
}

function MessageBubble({
  hearts,
  isOwn,
  message,
  onLongPress,
  onPress,
  sender = undefined,
  showTimestamp = true,
}: MessageBubbleProps) {
  const { colors, fonts, layout } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(SCALE_PRESSED, { damping: 15, stiffness: 300 });
      runOnJS(onPress)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(LONG_PRESS_DURATION)
    .onStart(() => {
      scale.value = withSpring(SCALE_PRESSED, { damping: 15, stiffness: 300 });
      runOnJS(onLongPress)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          layout.row,
          layout.itemsEnd,
          {
            alignSelf: isOwn ? 'flex-end' : 'flex-start',
            marginVertical: 4,
            maxWidth: '80%',
          },
          animatedStyle,
        ]}
      >
        {!isOwn && sender?.avatar ? (
          <Image
            source={{ uri: sender.avatar }}
            style={[
              {
                borderRadius: 16,
                height: 32,
                marginRight: HEART_ICON_PADDING,
                width: 32,
              },
            ]}
          />
        ) : undefined}
        <View
          style={[
            {
              backgroundColor: isOwn ? colors.tintColor : colors.secondary,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 8,
            },
          ]}
        >
          {!isOwn && sender ? (
            <Text
              style={[
                fonts.size_12,
                fonts.bold,
                {
                  color: colors.gray800,
                  marginBottom: 4,
                },
              ]}
            >
              {sender.name}
            </Text>
          ) : undefined}
          <Text
            style={[
              fonts.size_16,
              {
                color: isOwn ? colors.gray50 : colors.gray800,
              },
            ]}
          >
            {message.text}
          </Text>
          {showTimestamp || hearts.length > 0 ? (
            <View
              style={[layout.row, layout.itemsCenter, { gap: 6, marginTop: 4 }]}
            >
              {showTimestamp ? (
                <Text
                  style={[
                    fonts.size_12,
                    {
                      color: isOwn
                        ? 'rgba(255, 255, 255, 0.7)'
                        : colors.gray200,
                    },
                  ]}
                >
                  {formatTimestamp(message.timestamp)}
                </Text>
              ) : undefined}
              {isOwn && message.read ? (
                <Text
                  style={[
                    fonts.size_12,
                    fonts.bold,
                    { color: 'rgba(255, 255, 255, 0.7)' },
                  ]}
                >
                  ✓✓
                </Text>
              ) : undefined}
              {hearts.length > 0 && (
                <View
                  style={[
                    layout.row,
                    layout.itemsCenter,
                    {
                      backgroundColor: isOwn
                        ? 'rgba(255, 255, 255, 0.2)'
                        : colors.gray50,
                      borderRadius: 12,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12 }}>❤️</Text>
                  {hearts.length > 1 && (
                    <Text
                      style={[
                        fonts.size_12,
                        {
                          color: isOwn ? colors.gray50 : colors.secondaryLabel,
                          marginLeft: 2,
                        },
                      ]}
                    >
                      {hearts.length}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ) : undefined}
        </View>
        {isOwn && sender?.avatar ? (
          <Image
            source={{ uri: sender.avatar }}
            style={[
              {
                borderRadius: 16,
                height: 32,
                marginLeft: HEART_ICON_PADDING,
                width: 32,
              },
            ]}
          />
        ) : undefined}
      </Animated.View>
    </GestureDetector>
  );
}

export default MessageBubble;
