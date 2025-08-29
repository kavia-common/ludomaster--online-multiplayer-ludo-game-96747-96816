# LudoMaster Backend API & Real-Time Engine

This service provides:
- REST APIs for authentication, profile management, rooms, stats, and leaderboard.
- WebSockets (Socket.IO) for real-time gameplay and chat.

## Quick Start

1. Copy environment variables
```
cp .env.example .env
```
2. Install dependencies
```
npm install
```
3. Run
```
npm run dev
```

- API docs available at `/docs` (Swagger UI).
- Health check at `/api/health`.
- WebSocket usage guide at `/api/ws-info`.

## Environment Variables

See `.env.example` for required variables:
- MONGODB_URI: MongoDB connection string
- JWT_SECRET: Secret to sign JWTs
- CORS_ORIGIN: Comma-separated list of allowed origins (e.g., http://localhost:3000)
- PORT: Server port (default 4000)
- SERVER_PUBLIC_URL: Public URL for swagger server block

## Database setup

If you need to initialize MongoDB collections and indexes locally, run the initializer from the database workspace:

```
node ../ludomaster--online-multiplayer-ludo-game-96747-96817/Database_MongoDB/scripts/initSchema.js
```

Ensure MONGODB_URI is set in your environment.

## WebSocket

- Endpoint path: `/realtime`
- Namespaces:
  - `/game` for gameplay sync
  - `/chat` for room chat

Join a room:
```js
const socket = io('http://localhost:4000/game', { path: '/realtime' });
socket.emit('joinRoom', { roomId, userId });
```

Gameplay:
- `rollDice` -> server emits `diceRolled`
- `makeMove` with `{ tokenIndex }` -> server emits `moveApplied` and `turnChanged`

Chat:
```js
const chat = io('http://localhost:4000/chat', { path: '/realtime' });
chat.emit('joinRoom', { roomId, username });
chat.emit('message', { roomId, username, text: 'Hi' });
```

## Notes
- For horizontal scaling, move `gameStates` to a shared store (e.g., Redis) and configure Socket.IO adapter.
- Passwords are hashed with bcrypt; JWT protects private routes.
- Rate limiting, Helmet, and XSS clean are enabled.
- This codebase is a solid foundation and can be extended with richer Ludo rules and moderation.
