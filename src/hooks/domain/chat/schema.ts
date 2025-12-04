import * as z from 'zod';

// Thread schema
export const threadSchema = z.object({
  createdAt: z.string(),
  id: z.string(),
  lastMessage: z.string().optional(),
  lastMessageAt: z.string(),
  participants: z.array(z.string()),
});

export type Thread = z.infer<typeof threadSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.string(),
  read: z.boolean().optional(),
  receiverId: z.string(),
  senderId: z.string(),
  text: z.string(),
  threadId: z.string(),
  timestamp: z.string(),
});

export type Message = z.infer<typeof messageSchema>;

// Heart schema
export const heartSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  receiverId: z.string(),
  senderId: z.string(),
  timestamp: z.string(),
});

export type Heart = z.infer<typeof heartSchema>;

// WebSocket event types
export type HeartEvent = Heart;
export type HeartRemovedEvent = {
  heartId: string;
  messageId: string;
};
export type MessageEvent = Message;
export type MessageReadEvent = {
  messageId: string;
};
export type TypingEvent = {
  isTyping: boolean;
  senderId: string;
};
