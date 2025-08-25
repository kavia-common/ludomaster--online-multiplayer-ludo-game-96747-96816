import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import User from '../models/User.js';
import GameHistory from '../models/GameHistory.js';

const router = Router();

/**
 * @openapi
 * /api/stats/me:
 *   get:
 *     tags: [Stats]
 *     summary: Get my statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: My stats }
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    const recent = await GameHistory.find({ 'participants.userId': user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json({ stats: user.stats, recent });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/stats/global:
 *   get:
 *     tags: [Stats]
 *     summary: Get global statistics summary
 *     responses:
 *       200: { description: Global stats }
 */
router.get('/global', async (req, res, next) => {
  try {
    const totalUsers = await User.estimatedDocumentCount();
    const topWinners = await User.find({})
      .select('username stats.gamesWon')
      .sort({ 'stats.gamesWon': -1 })
      .limit(5)
      .lean();
    res.json({ totalUsers, topWinners });
  } catch (err) {
    next(err);
  }
});

export default router;
