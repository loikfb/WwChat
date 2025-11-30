import type { Heart, Message, Thread } from './schema';

import * as z from 'zod';

import { instance } from '@/services/instance';

import { heartSchema, messageSchema, threadSchema } from './schema';

export const ChatServices = {
  // Threads
  fetchThread: async (id: string): Promise<Thread> => {
    const response = await instance.get(`threads/${id}`).json();
    return threadSchema.parse(response);
  },

  fetchThreads: async (userId: string): Promise<Thread[]> => {
    const response = await instance.get('threads').json();
    const allThreads = z.array(threadSchema).parse(response);
    return allThreads.filter((thread) => thread.participants.includes(userId));
  },

  // Messages
  fetchMessages: async (threadId: string): Promise<Message[]> => {
    const response = await instance
      .get('messages', { searchParams: { threadId } })
      .json();
    return z.array(messageSchema).parse(response);
  },

  // Hearts
  fetchHearts: async (messageId: string): Promise<Heart[]> => {
    const response = await instance
      .get('hearts', { searchParams: { messageId } })
      .json();
    return z.array(heartSchema).parse(response);
  },
};
