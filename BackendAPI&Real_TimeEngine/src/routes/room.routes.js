import { Router } from 'express';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import Room from '../models/Room.js';
import { StatusCodes } from 'http-status-codes';

const router = Router();

/**
 * @openapi
 * /api/rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: List available rooms
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [waiting, in_progress, finished] }
 *     responses:
 *       200: { description: List of rooms }
 */
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const rooms = await Room.find(filter).sort({ updatedAt: -1 }).lean();
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/rooms:
 *   post:
 *     tags: [Rooms]
 *     summary: Create a new room
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               isPrivate: { type: boolean }
 *               password: { type: string }
 *               maxPlayers: { type: number, enum: [2,3,4] }
 *     responses:
 *       201: { description: Room created }
 */
router.post(
  '/',
  authenticate,
  validate('body', Joi.object({
    name: Joi.string().min(3).max(50).required(),
    isPrivate: Joi.boolean().default(false),
    password: Joi.string().allow('', null),
    maxPlayers: Joi.number().valid(2, 3, 4).default(4)
  })),
  async (req, res, next) => {
    try {
      const { name, isPrivate, password, maxPlayers } = req.body;
      const hashed = isPrivate && password ? await bcrypt.hash(password, 8) : undefined;
      const colors = ['red', 'green', 'yellow', 'blue'];
      const room = await Room.create({
        name,
        isPrivate,
        password: hashed,
        hostUserId: req.user.id,
        players: [{
          userId: req.user.id,
          username: req.user.username,
          seat: 0,
          color: colors[0]
        }],
        maxPlayers
      });
      res.status(StatusCodes.CREATED).json(room);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/rooms/{roomId}/join:
 *   post:
 *     tags: [Rooms]
 *     summary: Join a room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200: { description: Joined room }
 */
router.post(
  '/:roomId/join',
  authenticate,
  validate('params', Joi.object({ roomId: Joi.string().required() })),
  validate('body', Joi.object({ password: Joi.string().allow('', null) })),
  async (req, res, next) => {
    try {
      const room = await Room.findById(req.params.roomId);
      if (!room) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Room not found' });
      if (room.status !== 'waiting') return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Game already started' });
      const already = room.players.some(p => p.userId?.toString() === req.user.id);
      if (already) return res.json(room);
      if (room.players.length >= room.maxPlayers) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Room is full' });
      }
      if (room.isPrivate && room.password) {
        const ok = await bcrypt.compare(req.body.password || '', room.password);
        if (!ok) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid room password' });
      }
      const usedColors = new Set(room.players.map(p => p.color));
      const colors = ['red', 'green', 'yellow', 'blue'];
      const color = colors.find(c => !usedColors.has(c)) || colors[0];
      room.players.push({
        userId: req.user.id,
        username: req.user.username,
        seat: room.players.length,
        color
      });
      await room.save();
      res.json(room);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/rooms/{roomId}/leave:
 *   post:
 *     tags: [Rooms]
 *     summary: Leave a room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Left room }
 */
router.post(
  '/:roomId/leave',
  authenticate,
  validate('params', Joi.object({ roomId: Joi.string().required() })),
  async (req, res, next) => {
    try {
      const room = await Room.findById(req.params.roomId);
      if (!room) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Room not found' });
      room.players = room.players.filter(p => p.userId?.toString() !== req.user.id);
      if (room.players.length === 0) {
        await room.deleteOne();
        return res.json({ message: 'Room deleted' });
      }
      await room.save();
      res.json({ message: 'Left room', room });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
