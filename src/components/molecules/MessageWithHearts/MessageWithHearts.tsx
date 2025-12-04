import type { Heart, Message } from '@/hooks/domain/chat/schema';
import type { User } from '@/hooks/domain/user/schema';

import { useChat } from '@/hooks';

import MessageBubble from '@/components/molecules/MessageBubble';

type MessageWithHeartsProps = {
  readonly currentUserId: string;
  readonly message: Message;
  readonly onLongPress: (messageId: string, existingHeart?: Heart) => void;
  readonly onPress: (messageId: string, existingHeart?: Heart) => void;
  readonly otherUser?: User;
};

function MessageWithHearts({
  currentUserId,
  message,
  onLongPress,
  onPress,
  otherUser = undefined,
}: MessageWithHeartsProps) {
  const { useHeartsQuery } = useChat();
  const heartsQuery = useHeartsQuery(message.id);
  const isOwn = message.senderId === currentUserId;
  const existingHeart = heartsQuery.data?.find(
    (h) => h.senderId === currentUserId,
  );

  return (
    <MessageBubble
      hearts={heartsQuery.data ?? []}
      isOwn={isOwn}
      message={message}
      onLongPress={() => {
        onLongPress(message.id, existingHeart);
      }}
      onPress={() => {
        onPress(message.id, existingHeart);
      }}
      sender={isOwn ? undefined : otherUser}
    />
  );
}

export default MessageWithHearts;
