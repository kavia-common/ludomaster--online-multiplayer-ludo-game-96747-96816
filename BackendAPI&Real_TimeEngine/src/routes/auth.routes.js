import { Router } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import { signToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new user with unique email and username, returning a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password]
 *             properties:
 *               email: { type: string }
 *               username: { type: string }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error or already exists
 */
router.post(
  '/register',
  validate('body', Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(20).required(),
    password: Joi.string().min(6).max(128).required()
  })),
  async (req, res, next) => {
    try {
      const { email, username, password } = req.body;
      const exists = await User.findOne({ $or: [{ email }, { username }] });
      if (exists) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Email or username already in use' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({ email, username, passwordHash });
      const token = signToken(user._id.toString());
      res.status(StatusCodes.CREATED).json({
        token,
        user: { id: user._id, email: user.email, username: user.username, avatarUrl: user.avatarUrl, stats: user.stats }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     description: Authenticates user by email/username and password and returns JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailOrUsername: { type: string }
 *               password: { type: string }
 *             required: [emailOrUsername, password]
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  validate('body', Joi.object({
    emailOrUsername: Joi.string().required(),
    password: Joi.string().required()
  })),
  async (req, res, next) => {
    try {
      const { emailOrUsername, password } = req.body;
      const user = await User.findOne({
        $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
      });
      if (!user) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });
      const token = signToken(user._id.toString());
      res.json({
        token,
        user: { id: user._id, email: user.email, username: user.username, avatarUrl: user.avatarUrl, stats: user.stats }
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
