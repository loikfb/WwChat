import type { User, UserOnlineEvent } from './schema';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { webSocketService } from '@/services/websocket';

import { UserServices } from './userService';

const enum UserQueryKey {
  user = 'user',
  users = 'users',
}

// Constants
const CURRENT_USER_ID = 'a1b2c3d4'; // Alice Johnson

// Queries
const useUsersQuery = () =>
  useQuery({
    queryFn: UserServices.fetchAll,
    queryKey: [UserQueryKey.users],
    select: (data) => data.filter((user) => user.id !== CURRENT_USER_ID), // Filter out the current user
  });

const useUserQuery = (id: string) =>
  useQuery({
    enabled: !!id,
    queryFn: () => UserServices.fetchOne(id),
    queryKey: [UserQueryKey.user, id],
  });

export const useUser = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Register listeners for user events
    webSocketService.registerListenersOnce('user', {
      onUserOnline: (event: UserOnlineEvent) => {
        // Update user online status
        queryClient.setQueryData<User>(
          [UserQueryKey.user, event.userId],
          (old) => {
            if (!old) return old;
            return { ...old, online: event.online };
          },
        );

        // Update in users list
        queryClient.setQueryData<User[]>([UserQueryKey.users], (old = []) =>
          old.map((user) =>
            user.id === event.userId ? { ...user, online: event.online } : user,
          ),
        );
      },
    });
  }, [queryClient]);
  // Helpers
  const getCurrentUserId = useCallback(() => CURRENT_USER_ID, []);

  return {
    getCurrentUserId,
    useUserQuery,
    useUsersQuery,
  };
};
