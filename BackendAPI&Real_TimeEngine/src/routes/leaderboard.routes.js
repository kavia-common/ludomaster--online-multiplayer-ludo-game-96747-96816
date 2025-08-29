import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

/**
 * @openapi
 * /api/leaderboard:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Global leaderboard
 *     description: Returns top players ordered by rating and win rate.
 *     responses:
 *       200: { description: Leaderboard }
 */
router.get('/', async (req, res, next) => {
  try {
    const top = await User.find({})
      .select('username avatarUrl stats.rating stats.winRate stats.gamesWon stats.gamesPlayed')
      .sort({ 'stats.rating': -1, 'stats.winRate': -1 })
      .limit(100)
      .lean();
    res.json(top);
  } catch (err) {
    next(err);
  }
});

export default router;
