import type { Heart, Message } from '@/hooks/domain/chat/schema';
import type { User } from '@/hooks/domain/user/schema';

import { useChat } from '@/hooks';

import MessageBubble from '@/components/molecules/MessageBubble';

type MessageWithHeartsProps = {
  readonly currentUserId: string;
  readonly message: Message;
  readonly onHeartPress: (messageId: string, existingHeart?: Heart) => void;
  readonly onLongPress: (messageId: string, existingHeart?: Heart) => void;
  readonly otherUser?: User;
};

function MessageWithHearts({
  currentUserId,
  message,
  onHeartPress,
  onLongPress,
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
      currentUserId={currentUserId}
      hearts={heartsQuery.data ?? []}
      isOwn={isOwn}
      message={message}
      onHeartPress={() => {
        onHeartPress(message.id, existingHeart);
      }}
      onLongPress={() => {
        onLongPress(message.id, existingHeart);
      }}
      sender={isOwn ? undefined : otherUser}
    />
  );
}

export default MessageWithHearts;
