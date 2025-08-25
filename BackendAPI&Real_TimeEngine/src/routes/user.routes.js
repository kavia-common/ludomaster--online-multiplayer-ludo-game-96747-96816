import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import User from '../models/User.js';

const router = Router();

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns your profile
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    res.json({ id: user._id, email: user.email, username: user.username, avatarUrl: user.avatarUrl, stats: user.stats });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               avatarUrl: { type: string }
 *     responses:
 *       200:
 *         description: Updated profile
 */
router.patch(
  '/me',
  authenticate,
  validate('body', Joi.object({
    username: Joi.string().alphanum().min(3).max(20).optional(),
    avatarUrl: Joi.string().uri().optional()
  })),
  async (req, res, next) => {
    try {
      const update = {};
      if (req.body.username) update.username = req.body.username;
      if (req.body.avatarUrl) update.avatarUrl = req.body.avatarUrl;
      const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).lean();
      res.json({ id: user._id, email: user.email, username: user.username, avatarUrl: user.avatarUrl, stats: user.stats });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
