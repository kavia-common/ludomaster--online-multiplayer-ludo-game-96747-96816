import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import xss from 'xss-clean';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { StatusCodes } from 'http-status-codes';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

import { connectDB } from './utils/db.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import roomRoutes from './routes/room.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import statsRoutes from './routes/stats.routes.js';
import { createSocketServer } from './sockets/index.js';
import { errorHandler, notFoundHandler } from './utils/error.js';
import { openapiTags, swaggerDefinition } from './utils/swagger.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Security and common middleware
app.use(helmet());
app.use(xss());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Swagger/OpenAPI setup
const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/sockets/*.js',
    './src/models/*.js'
  ]
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health and info endpoints
// PUBLIC_INTERFACE
app.get('/api/health', (req, res) => {
  /** Health check endpoint. Returns basic status information. */
  res.json({ status: 'ok', uptime: process.uptime(), env: process.env.NODE_ENV || 'development' });
});

// WebSocket usage helper
// PUBLIC_INTERFACE
app.get('/api/ws-info', (req, res) => {
  /** WebSocket info endpoint to guide clients. */
  res.json({
    socketEndpoint: '/realtime',
    namespaces: ['/game', '/chat'],
    notes: 'Connect with Socket.IO client to the specified endpoint and join a room using the roomId you create/join via REST.'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/stats', statsRoutes);

// 404 and error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server and socket
const PORT = process.env.PORT || 4000;
await connectDB(process.env.MONGODB_URI);

const io = createSocketServer(server, { path: '/realtime' });

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`LudoMaster backend listening on port ${PORT}`);
});

export { app, server, io };
