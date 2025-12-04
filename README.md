# WwChat - 1:1 Chat Application

<div align="center" style="padding:42px">
  <img src="./src/theme/assets/images/dark/wardy.png" width="222" alt="WwChat" />
</div>

A lightweight React Native chat application with real-time messaging, heart reactions, and animations.

## Setup

### 1. Install Dependencies

```bash
# Frontend (WwChat)
cd WwChat
yarn install

# Backend (app-challenge-social)
cd ../app-challenge-social
yarn install
```

### 2. Environment Configuration

Create `.env` file in `WwChat/`:

```env
API_URL=http://localhost:3001
WS_URL=ws://localhost:3002
CURRENT_USER_ID=a1b2c3d4
```

### 3. Start Servers

```bash
# In app-challenge-social directory
yarn run dev
```

### 4. Run the App

```bash
# In WwChat directory
yarn ios    # iOS
yarn android # Android
```

## Features

### Core Requirements ✅

| Feature | Status |
|---------|--------|
| Real-time messaging (WebSocket) | ✅ |
| Chat bubble UI | ✅ |
| Sender avatar, message text, timestamp | ✅ |
| Sent/received message distinction | ✅ |
| Message input field | ✅ |
| Auto-scroll to latest message | ✅ |
| Heart toggle button (per message) | ✅ |
| Long-press heart animation (screen fill) | ✅ |
| Heart persistence in database | ✅ |

### Bonus Features ✅

| Feature | Status |
|---------|--------|
| Typing indicators | ✅ |
| Message read receipts | ✅ |
| Online/offline status | ✅ |

## Architecture

- **State Management**: TanStack Query for server state + WebSocket integration
- **Navigation**: React Navigation (Stack)
- **Real-time**: Socket.IO client
- **Validation**: Zod schemas
- **Styling**: Theme system with dark/light mode support

### Key Hooks

- `useUser()` - User queries, online status, current user
- `useChat()` - Messages, threads, hearts, WebSocket events

## Server Fix

The WebSocket server (`app-challenge-social/server.js`) had an issue where new threads weren't persisting correctly. The fix ensures:

1. `getOrCreateThread()` properly creates and saves new threads to `db.json`
2. Reading fresh DB to ensure we have the latest data including the newly created thread.

The actual fix: swap lines 193 and 194 in `app-challenge-social/server.js`

## Testing

```bash
yarn test
```

## Project Structure

```
src/
├── components/
│   ├── atoms/          # Basic UI elements
│   ├── molecules/      # MessageBubble, MessageWithHearts
│   ├── organisms/      # HeartsOverlay
│   └── templates/      # SafeScreen
├── hooks/
│   └── domain/
│       ├── chat/       # Chat queries & WebSocket handlers
│       └── user/       # User queries & online status
├── navigation/         # Stack navigator
├── screens/
│   ├── Chat/           # Chat screen
│   ├── Startup/        # Initial loading
│   └── UserList/       # User/Chat room selection (can also be refactor to ChatList)
├── services/
│   ├── instance.ts     # HTTP client (ky)
│   └── websocket.ts    # Socket.IO
└── theme/              # Styling system
```

