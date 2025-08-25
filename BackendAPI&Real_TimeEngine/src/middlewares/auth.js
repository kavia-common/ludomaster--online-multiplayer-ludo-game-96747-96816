import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/error.js';
import User from '../models/User.js';

/**
 * Verify JWT from Authorization header "Bearer <token>".
 */
export async function authenticate (req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Missing token');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token');
    req.user = { id: user._id.toString(), email: user.email, username: user.username };
    next();
  } catch (err) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized', err.message));
  }
}

/**
 * Generate a signed JWT for a user id.
 * @param {string} userId
 * @returns {string} token
 */
export function signToken (userId) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ sub: userId }, secret, { expiresIn });
}
