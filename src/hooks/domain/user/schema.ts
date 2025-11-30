import * as z from 'zod';

export const userSchema = z.object({
  avatar: z.url().optional(),
  bio: z.string().optional(),
  id: z.string(),
  isBot: z.boolean().optional(),
  name: z.string(),
  online: z.boolean().optional(),
});

export type User = z.infer<typeof userSchema>;

// WebSocket event types
export type UserOnlineEvent = {
  online: boolean;
  userId: string;
};
