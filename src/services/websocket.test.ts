/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { io } from 'socket.io-client';

import { webSocketService } from './websocket';

// Mock socket.io-client
jest.mock('socket.io-client');

const RAPID_CONNECT_ATTEMPTS = 10;

describe('WebSocketService', () => {
  let mockSocket: any;

  beforeEach(() => {
    // Reset the module to ensure clean state
    jest.clearAllMocks();

    // Disconnect to reset internal state
    webSocketService.disconnect();

    // Create a mock socket
    mockSocket = {
      connect: jest.fn(),
      connected: false,
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    (io as jest.Mock).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  describe('Singleton Connection Pattern', () => {
    test('should create only one socket connection even with multiple connect calls', () => {
      const userId = 'test-user-123';

      // Call connect multiple times
      webSocketService.connect(userId);
      webSocketService.connect(userId);
      webSocketService.connect(userId);

      // Should only call io() once - singleton pattern
      expect(io).toHaveBeenCalledTimes(1);
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          transports: ['websocket'],
        }),
      );
    });

    test('should reuse existing socket when already connected', () => {
      const userId = 'test-user-123';

      // First connection
      webSocketService.connect(userId);

      // Simulate connection
      mockSocket.connected = true;

      // Try to connect again
      const ioCallCount = (io as jest.Mock).mock.calls.length;
      webSocketService.connect(userId);

      // Should not create a new socket
      expect(io).toHaveBeenCalledTimes(ioCallCount);
    });

    test('should reconnect existing socket if disconnected', () => {
      const userId = 'test-user-123';

      // First connection
      webSocketService.connect(userId);
      mockSocket.connected = false;

      // Try to connect again - should call reconnect
      webSocketService.connect(userId);

      // Should attempt to reconnect the existing socket
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    test('should prevent multiple socket instances during rapid connect calls', () => {
      const userId = 'test-user-123';

      // Simulate rapid connection attempts (like React Strict Mode)
      for (let index = 0; index < RAPID_CONNECT_ATTEMPTS; index++) {
        webSocketService.connect(userId);
      }

      // Should only create one socket
      expect(io).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Lifecycle', () => {
    test('should set up event listeners on first connect', () => {
      const userId = 'test-user-123';

      webSocketService.connect(userId);

      // Should set up all required event listeners
      expect(mockSocket.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'connect_error',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'message_sent',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith('heart', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(
        'heart_sent',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'heart_removed',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'typing',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'user_online',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should emit join event on connect', () => {
      const userId = 'test-user-123';

      webSocketService.connect(userId);

      // Get the connect callback
      const connectCall = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect',
      );

      expect(connectCall).toBeDefined();
      const connectCallback = connectCall![1];

      // Trigger connect event
      mockSocket.emit = jest.fn();
      connectCallback();

      // Should emit join event with userId
      expect(mockSocket.emit).toHaveBeenCalledWith('join', userId);
    });

    test('should clean up properly on disconnect', () => {
      const userId = 'test-user-123';

      webSocketService.connect(userId);
      webSocketService.disconnect();

      // Should remove all listeners and disconnect
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(webSocketService.getStatus()).toBe('disconnected');
    });
  });

  describe('Status Management', () => {
    test('should update status to connecting then connected', () => {
      const userId = 'test-user-123';
      const mockStatusListener = jest.fn();

      webSocketService.setListeners({
        onStatusChange: mockStatusListener,
      });

      webSocketService.connect(userId);
      expect(webSocketService.getStatus()).toBe('connecting');

      // Trigger connect event
      const connectCallback = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect',
      )[1];
      connectCallback();

      expect(webSocketService.getStatus()).toBe('connected');
      expect(mockStatusListener).toHaveBeenCalledWith('connected');
    });

    test('should update status to disconnected on disconnect', () => {
      const userId = 'test-user-123';

      webSocketService.connect(userId);

      // Trigger connect to set status to connected
      const connectCallback = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect',
      )[1];
      connectCallback();

      webSocketService.disconnect();
      expect(webSocketService.getStatus()).toBe('disconnected');
    });

    test('should update status to error on connection error', () => {
      const userId = 'test-user-123';
      const mockErrorListener = jest.fn();

      webSocketService.setListeners({
        onError: mockErrorListener,
      });

      webSocketService.connect(userId);

      // Trigger connect_error event
      const errorCallback = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'connect_error',
      )[1];
      const error = new Error('Connection failed');
      errorCallback(error);

      expect(webSocketService.getStatus()).toBe('error');
      expect(mockErrorListener).toHaveBeenCalledWith({
        message: error.message,
      });
    });
  });

  describe('Message Operations', () => {
    beforeEach(() => {
      const userId = 'test-user-123';
      webSocketService.connect(userId);
      mockSocket.connected = true;
    });

    test('should send message when connected', () => {
      webSocketService.sendMessage('sender-id', 'receiver-id', 'Hello');

      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        receiverId: 'receiver-id',
        senderId: 'sender-id',
        text: 'Hello',
      });
    });

    test('should not send message when disconnected', () => {
      mockSocket.connected = false;
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      webSocketService.sendMessage('sender-id', 'receiver-id', 'Hello');

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'message',
        expect.any(Object),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[WebSocket] Cannot send message: not connected',
      );

      consoleErrorSpy.mockRestore();
    });

    test('should send heart when connected', () => {
      webSocketService.sendHeart('sender-id', 'receiver-id', 'message-id');

      expect(mockSocket.emit).toHaveBeenCalledWith('heart', {
        messageId: 'message-id',
        receiverId: 'receiver-id',
        senderId: 'sender-id',
      });
    });

    test('should remove heart when connected', () => {
      webSocketService.removeHeart(
        'heart-id',
        'sender-id',
        'receiver-id',
        'message-id',
      );

      expect(mockSocket.emit).toHaveBeenCalledWith('remove_heart', {
        heartId: 'heart-id',
        messageId: 'message-id',
        receiverId: 'receiver-id',
        senderId: 'sender-id',
      });
    });

    test('should send typing indicator when connected', () => {
      webSocketService.sendTyping('sender-id', 'receiver-id', true);

      expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
        isTyping: true,
        receiverId: 'receiver-id',
        senderId: 'sender-id',
      });
    });
  });

  describe('Event Listeners', () => {
    test('should trigger onMessage listener when message is received', () => {
      const userId = 'test-user-123';
      const mockMessageListener = jest.fn();

      webSocketService.setListeners({
        onMessage: mockMessageListener,
      });

      webSocketService.connect(userId);

      // Get the message callback
      const messageCallback = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'message',
      )[1];

      const testMessage = {
        id: 'msg-1',
        senderId: 'user-1',
        text: 'Hello',
        threadId: 'thread-1',
        timestamp: new Date().toISOString(),
      };

      messageCallback(testMessage);

      expect(mockMessageListener).toHaveBeenCalledWith(testMessage);
    });

    test('should trigger onHeart listener when heart is received', () => {
      const userId = 'test-user-123';
      const mockHeartListener = jest.fn();

      webSocketService.setListeners({
        onHeart: mockHeartListener,
      });

      webSocketService.connect(userId);

      // Get the heart callback
      const heartCallback = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'heart',
      )[1];

      const testHeart = {
        id: 'heart-1',
        messageId: 'msg-1',
        senderId: 'user-1',
        timestamp: new Date().toISOString(),
      };

      heartCallback(testHeart);

      expect(mockHeartListener).toHaveBeenCalledWith(testHeart);
    });

    test('should trigger onTyping listener when typing event is received', () => {
      const userId = 'test-user-123';
      const mockTypingListener = jest.fn();

      webSocketService.setListeners({
        onTyping: mockTypingListener,
      });

      webSocketService.connect(userId);

      // Get the typing callback
      const typingCallback = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'typing',
      )[1];

      const typingEvent = {
        isTyping: true,
        senderId: 'user-1',
      };

      typingCallback(typingEvent);

      expect(mockTypingListener).toHaveBeenCalledWith(typingEvent);
    });

    test('should trigger onUserOnline listener when user online status changes', () => {
      const userId = 'test-user-123';
      const mockUserOnlineListener = jest.fn();

      webSocketService.setListeners({
        onUserOnline: mockUserOnlineListener,
      });

      webSocketService.connect(userId);

      // Get the user_online callback
      const userOnlineCallback = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === 'user_online',
      )[1];

      const userOnlineEvent = {
        online: true,
        userId: 'user-1',
      };

      userOnlineCallback(userOnlineEvent);

      expect(mockUserOnlineListener).toHaveBeenCalledWith(userOnlineEvent);
    });
  });

  describe('isConnected Method', () => {
    test('should return true when socket is connected', () => {
      const userId = 'test-user-123';
      webSocketService.connect(userId);
      mockSocket.connected = true;

      expect(webSocketService.isConnected()).toBe(true);
    });

    test('should return false when socket is disconnected', () => {
      expect(webSocketService.isConnected()).toBe(false);
    });

    test('should return false when socket is null', () => {
      webSocketService.disconnect();
      expect(webSocketService.isConnected()).toBe(false);
    });
  });
});
