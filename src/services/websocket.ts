import type {
  HeartEvent,
  HeartRemovedEvent,
  MessageEvent,
  TypingEvent,
} from '@/hooks/domain/chat/schema';
import type { UserOnlineEvent } from '@/hooks/domain/user/schema';

import { io, type Socket } from 'socket.io-client';

export type WebSocketListeners = {
  onError: (error: { message: string }) => void;
  onHeart: (heart: HeartEvent) => void;
  onHeartRemoved: (event: HeartRemovedEvent) => void;
  onHeartSent: (heart: HeartEvent) => void;
  onMessage: (message: MessageEvent) => void;
  onMessageSent: (message: MessageEvent) => void;
  onStatusChange: (status: WebSocketStatus) => void;
  onTyping: (event: TypingEvent) => void;
  onUserOnline: (event: UserOnlineEvent) => void;
};

export type WebSocketStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error';

class WebSocketService {
  private listeners: Partial<WebSocketListeners> = {};
  private socket: Socket | undefined = undefined;
  private status: WebSocketStatus = 'disconnected';
  private wsUrl: string;
  // Support multiple subscribers for specific events
  private heartReceivedSubscribers: ((heart: HeartEvent) => void)[] = [];
  // Track which listener groups have been registered to avoid duplicates
  private registeredListenerGroups = new Set<string>();

  constructor() {
    this.wsUrl = process.env.WS_URL ?? 'ws://localhost:3002';
  }

  connect(userId: string) {
    // If socket already exists and is connected, do nothing
    if (this.socket?.connected) {
      console.log(
        '[WebSocket] Connection already exists and connected, reusing socket',
      );
      return;
    }

    // If socket exists but disconnected, reconnect it
    if (this.socket && !this.socket.connected) {
      console.log(
        '[WebSocket] Socket exists but disconnected, reconnecting...',
      );
      this.socket.connect();
      return;
    }

    // Create new socket connection
    console.log('[WebSocket] Creating new connection');
    this.updateStatus('connecting');

    this.socket = io(this.wsUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
    });

    this.setupEventListeners(userId);
  }

  disconnect() {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting and cleaning up');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = undefined;
      this.updateStatus('disconnected');
    }
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  removeHeart(
    heartId: string,
    senderId: string,
    receiverId: string,
    messageId: string,
  ) {
    if (!this.socket?.connected) {
      console.error('[WebSocket] Cannot remove heart: not connected');
      return;
    }

    this.socket.emit('remove_heart', {
      heartId,
      messageId,
      receiverId,
      senderId,
    });
  }

  sendHeart(senderId: string, receiverId: string, messageId: string) {
    if (!this.socket?.connected) {
      console.error('[WebSocket] Cannot send heart: not connected');
      return;
    }

    this.socket.emit('heart', { messageId, receiverId, senderId });
  }

  sendMessage(senderId: string, receiverId: string, text: string) {
    if (!this.socket?.connected) {
      console.error('[WebSocket] Cannot send message: not connected');
      return;
    }

    this.socket.emit('message', { receiverId, senderId, text });
  }

  sendTyping(senderId: string, receiverId: string, isTyping: boolean) {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('typing', { isTyping, receiverId, senderId });
  }

  setListeners(listeners: Partial<WebSocketListeners>) {
    this.listeners = { ...this.listeners, ...listeners };
  }

  /**
   * Register a group of listeners only once
   * @param groupKey - Unique identifier for this group of listeners
   * @param listeners - The listeners to register
   * @returns true if registered, false if already registered
   */
  registerListenersOnce(
    groupKey: string,
    listeners: Partial<WebSocketListeners>,
  ): boolean {
    if (this.registeredListenerGroups.has(groupKey)) {
      return false;
    }

    this.registeredListenerGroups.add(groupKey);
    this.setListeners(listeners);
    return true;
  }

  /**
   * Subscribe to heart received events
   * @returns Cleanup function to unsubscribe
   */
  subscribeToHeartReceived(callback: (heart: HeartEvent) => void) {
    this.heartReceivedSubscribers.push(callback);

    return () => {
      const index = this.heartReceivedSubscribers.indexOf(callback);
      if (index !== -1) {
        this.heartReceivedSubscribers.splice(index, 1);
      }
    };
  }

  private setupEventListeners(userId: string) {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.updateStatus('connected');
      this.socket?.emit('join', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      this.updateStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.updateStatus('error');
      this.listeners.onError?.({ message: error.message });
    });

    this.socket.on('message', (message: MessageEvent) => {
      this.listeners.onMessage?.(message);
    });

    this.socket.on('message_sent', (message: MessageEvent) => {
      this.listeners.onMessageSent?.(message);
    });

    this.socket.on('heart', (heart: HeartEvent) => {
      this.listeners.onHeart?.(heart);
      // Notify all subscribers
      for (const subscriber of this.heartReceivedSubscribers) {
        subscriber(heart);
      }
    });

    this.socket.on('heart_sent', (heart: HeartEvent) => {
      this.listeners.onHeartSent?.(heart);
    });

    this.socket.on('heart_removed', (event: HeartRemovedEvent) => {
      this.listeners.onHeartRemoved?.(event);
    });

    this.socket.on('typing', (event: TypingEvent) => {
      this.listeners.onTyping?.(event);
    });

    this.socket.on('user_online', (event: UserOnlineEvent) => {
      this.listeners.onUserOnline?.(event);
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('[WebSocket] Error:', error);
      this.listeners.onError?.(error);
    });
  }

  private updateStatus(status: WebSocketStatus) {
    if (this.status !== status) {
      this.status = status;
      this.listeners.onStatusChange?.(status);
    }
  }
}

export const webSocketService = new WebSocketService();
