import crypto from 'crypto';

/**
 * Represents a simplified Ludo game engine supporting:
 * - 2-4 players
 * - Dice roll
 * - Token positions (0..57 path, -1 home, 58 completed)
 * - Valid move calculation
 * - Basic AI move choice
 *
 * Note: This engine is intentionally simplified for demonstration and can be enhanced.
 */

// Helper to create a deterministic random number (can be seeded per room tick if needed)
export function fairDiceRoll () {
  // Use crypto for stronger randomness
  return (crypto.randomInt(1, 7));
}

/**
 * Create initial game state for N players
 */
export function createInitialState (players) {
  const state = {
    turnIndex: 0,
    players: players.map(p => ({
      userId: p.userId?.toString() || null,
      username: p.username || 'AI',
      color: p.color,
      tokens: [-1, -1, -1, -1], // -1 means at home
      finished: 0
    })),
    lastRoll: null,
    logs: []
  };
  return state;
}

/**
 * Calculate valid moves given a player tokens and dice roll.
 */
export function getValidMoves (tokens, roll) {
  const moves = [];
  for (let i = 0; i < 4; i++) {
    const pos = tokens[i];
    if (pos === 58) continue; // already finished
    if (pos === -1) {
      if (roll === 6) moves.push({ token: i, from: -1, to: 0 });
    } else {
      const to = pos + roll;
      if (to <= 58) moves.push({ token: i, from: pos, to });
    }
  }
  return moves;
}

/**
 * Apply a move, handling capture and finish.
 */
export function applyMove (state, playerIndex, move) {
  const player = state.players[playerIndex];
  const tokens = player.tokens.slice();
  if (tokens[move.token] !== move.from) return { state, capture: null }; // invalid
  tokens[move.token] = move.to;
  let capture = null;

  // capture logic: if lands on same path position as other players' tokens (not safe positions), send them home
  const safePositions = new Set([0, 8, 13, 21, 26, 34, 39, 47]); // simplified safe squares
  if (move.to >= 0 && move.to < 57 && !safePositions.has(move.to)) {
    state.players.forEach((op, idx) => {
      if (idx === playerIndex) return;
      op.tokens = op.tokens.map(tp => {
        if (tp === move.to) {
          capture = { victim: idx, position: move.to };
          return -1; // send home
        }
        return tp;
      });
    });
  }

  if (move.to === 58) {
    player.finished += 1;
  }
  player.tokens = tokens;
  state.logs.push(`${player.username} moved token ${move.token} to ${move.to}`);
  return { state, capture };
}

/**
 * Advance to next player's turn, accounting for extra turn on rolling a six.
 */
export function advanceTurn (state, lastRollWasSix) {
  if (lastRollWasSix) return state.turnIndex; // same player again
  state.turnIndex = (state.turnIndex + 1) % state.players.length;
  return state.turnIndex;
}

/**
 * Basic AI: choose move that captures if possible, otherwise furthest progress.
 */
export function chooseAiMove (state, playerIndex, roll) {
  const { tokens } = state.players[playerIndex];
  const moves = getValidMoves(tokens, roll);
  if (moves.length === 0) return null;
  // prioritize capture
  for (const mv of moves) {
    const hypothetical = state.players.map(p => ({ ...p, tokens: p.tokens.slice() }));
    const temp = { ...state, players: hypothetical };
    const { capture } = applyMove(temp, playerIndex, mv);
    if (capture) return mv;
  }
  // otherwise maximize 'to' value
  moves.sort((a, b) => (b.to - a.to));
  return moves[0];
}

/**
 * Check if a player has won (all tokens finished)
 */
export function checkWin (state, playerIndex) {
  return state.players[playerIndex].finished === 4;
}
