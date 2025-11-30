import { useEffect, useRef } from 'react';

import {
  type WebSocketListeners,
  webSocketService,
} from '@/services/websocket';

/**
 * Custom hook to initialize and manage WebSocket singleton instance.
 * This hook should be called at the app root level to ensure a single WebSocket connection
 * is established and maintained throughout the app lifecycle.
 *
 * @param userId - The current user ID to connect with
 * @param listeners - Optional WebSocket event listeners
 * @returns The WebSocket service instance
 */
export const useWebSocket = (
  userId: string,
  listeners?: Partial<WebSocketListeners>,
) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      console.log('[useWebSocket] Initializing WebSocket connection');
      webSocketService.connect(userId);
      initialized.current = true;

      if (listeners) {
        webSocketService.setListeners(listeners);
      }
    }

    // Cleanup on unmount - disconnect WebSocket
    return () => {
      if (initialized.current) {
        console.log('[useWebSocket] Cleaning up WebSocket connection');
        webSocketService.disconnect();
        initialized.current = false;
      }
    };
  }, [userId, listeners]);

  return webSocketService;
};
