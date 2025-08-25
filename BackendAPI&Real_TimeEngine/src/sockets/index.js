import { Server } from 'socket.io';
import Room from '../models/Room.js';
import User from '../models/User.js';
import GameHistory from '../models/GameHistory.js';
import { createInitialState, fairDiceRoll, getValidMoves, applyMove, advanceTurn, chooseAiMove, checkWin } from '../services/gameEngine.js';

/**
 * In-memory game states keyed by roomId.
 * In production, consider Redis or a state service for horizontal scaling.
 */
const gameStates = new Map();

function ensureState (room) {
  let st = gameStates.get(room._id.toString());
  if (!st) {
    st = createInitialState(room.players);
    gameStates.set(room._id.toString(), st);
  }
  return st;
}

/**
 * Update user stats after a game.
 */
async function finalizeGameAndUpdateStats (roomId, winnersOrder) {
  const room = await Room.findById(roomId).lean();
  if (!room) return;
  const participants = [];
  for (let i = 0; i < winnersOrder.length; i++) {
    const idx = winnersOrder[i];
    const p = room.players[idx];
    if (!p?.userId) continue;
    const user = await User.findById(p.userId);
    if (!user) continue;
    user.stats.gamesPlayed += 1;
    if (i === 0) {
      user.stats.gamesWon += 1;
      user.stats.rating += 10;
    } else {
      user.stats.gamesLost += 1;
      user.stats.rating = Math.max(800, user.stats.rating - 5);
    }
    user.stats.winRate = user.stats.gamesPlayed ? Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100) : 0;
    await user.save();
    participants.push({ userId: user._id, username: user.username, placement: i + 1, score: (i === 0 ? 100 : 50 - i * 10) });
  }
  await GameHistory.create({
    roomId,
    startedAt: new Date(),
    endedAt: new Date(),
    participants,
    mode: 'multiplayer'
  });
}

/**
 * Create and configure the Socket.IO server.
 * @param {import('http').Server} httpServer
 * @param {{path?: string}} options
 */
export function createSocketServer (httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true
    },
    path: options.path || '/realtime'
  });

  const gameNs = io.of('/game');
  const chatNs = io.of('/chat');

  // Game namespace: gameplay events
  gameNs.on('connection', (socket) => {
    /**
     * @openapi
     * tags:
     *   - name: Realtime
     *     description: WebSocket events for game
     */
    socket.on('joinRoom', async ({ roomId, userId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }
        socket.join(roomId);
        const state = ensureState(room);
        socket.emit('state', { state, room });
        socket.to(roomId).emit('system', { message: 'A user joined the room' });
      } catch (e) {
        socket.emit('error', { message: e.message });
      }
    });

    socket.on('rollDice', async ({ roomId, userId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });
        const state = ensureState(room);
        const playerIndex = state.players.findIndex(p => p.userId === userId);
        if (playerIndex !== state.turnIndex) {
          return socket.emit('error', { message: 'Not your turn' });
        }
        const roll = fairDiceRoll();
        state.lastRoll = roll;
        const moves = getValidMoves(state.players[playerIndex].tokens, roll);
        gameNs.to(roomId).emit('diceRolled', { by: userId, roll, moves });

        // If no moves, advance turn
        if (moves.length === 0) {
          advanceTurn(state, roll === 6);
          gameNs.to(roomId).emit('turnChanged', { turnIndex: state.turnIndex });
          // If next is AI, make AI move
          await maybeMakeAiMove(roomId, room, state);
        }
      } catch (e) {
        socket.emit('error', { message: e.message });
      }
    });

    socket.on('makeMove', async ({ roomId, userId, tokenIndex }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });
        const state = ensureState(room);
        const playerIndex = state.players.findIndex(p => p.userId === userId);
        if (playerIndex !== state.turnIndex) {
          return socket.emit('error', { message: 'Not your turn' });
        }
        const roll = state.lastRoll;
        if (!roll) return socket.emit('error', { message: 'Roll first' });
        const moves = getValidMoves(state.players[playerIndex].tokens, roll);
        const selected = moves.find(m => m.token === tokenIndex);
        if (!selected) return socket.emit('error', { message: 'Invalid move' });

        const { capture } = applyMove(state, playerIndex, selected);
        gameNs.to(roomId).emit('moveApplied', { by: userId, move: selected, capture });

        if (checkWin(state, playerIndex)) {
          gameNs.to(roomId).emit('gameOver', { winnerUserId: userId, winnerIndex: playerIndex });
          await finalizeGameAndUpdateStats(roomId, [playerIndex, ...[0, 1, 2, 3].filter(i => i !== playerIndex)]);
          return;
        }

        const extraTurn = state.lastRoll === 6;
        state.lastRoll = null;
        advanceTurn(state, extraTurn);
        gameNs.to(roomId).emit('turnChanged', { turnIndex: state.turnIndex });

        await maybeMakeAiMove(roomId, room, state);
      } catch (e) {
        socket.emit('error', { message: e.message });
      }
    });

    socket.on('disconnect', () => {
      // No-op for now; could handle reconnection with userId mapping.
    });
  });

  async function maybeMakeAiMove (roomId, room, state) {
    // If current turn belongs to AI (no userId), auto-play
    const current = state.players[state.turnIndex];
    if (current.userId) return;
    const roll = fairDiceRoll();
    state.lastRoll = roll;
    const move = chooseAiMove(state, state.turnIndex, roll);
    if (move) {
      applyMove(state, state.turnIndex, move);
      io.of('/game').to(roomId).emit('diceRolled', { by: null, roll, moves: [move] });
      io.of('/game').to(roomId).emit('moveApplied', { by: null, move, capture: null });
      if (checkWin(state, state.turnIndex)) {
        io.of('/game').to(roomId).emit('gameOver', { winnerUserId: null, winnerIndex: state.turnIndex });
        await finalizeGameAndUpdateStats(roomId, [state.turnIndex, ...[0, 1, 2, 3].filter(i => i !== state.turnIndex)]);
        return;
      }
    } else {
      io.of('/game').to(roomId).emit('diceRolled', { by: null, roll, moves: [] });
    }
    const extra = state.lastRoll === 6 && move;
    state.lastRoll = null;
    advanceTurn(state, extra);
    io.of('/game').to(roomId).emit('turnChanged', { turnIndex: state.turnIndex });
  }

  // Chat namespace: simple room-based chat
  chatNs.on('connection', (socket) => {
    socket.on('joinRoom', async ({ roomId, username }) => {
      socket.join(roomId);
      socket.to(roomId).emit('system', { message: `${username || 'Someone'} joined the chat` });
    });

    socket.on('message', ({ roomId, username, text }) => {
      const cleanText = String(text || '').slice(0, 500);
      chatNs.to(roomId).emit('message', { username: username || 'Anon', text: cleanText, ts: Date.now() });
    });

    socket.on('disconnect', () => {});
  });

  return io;
}
