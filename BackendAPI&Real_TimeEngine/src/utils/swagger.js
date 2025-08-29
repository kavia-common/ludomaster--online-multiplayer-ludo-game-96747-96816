export const openapiTags = [
  { name: 'Auth', description: 'Authentication endpoints' },
  { name: 'Users', description: 'User profile endpoints' },
  { name: 'Rooms', description: 'Game room management' },
  { name: 'Stats', description: 'Statistics and history' },
  { name: 'Leaderboard', description: 'Leaderboard endpoints' },
  { name: 'Realtime', description: 'WebSocket endpoints and usage' }
];

// PUBLIC_INTERFACE
export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'LudoMaster Backend API',
    description: 'REST API and Real-Time Engine for LudoMaster. Use Socket.IO for live game and chat.',
    version: '1.0.0'
  },
  servers: [
    {
      url: process.env.SERVER_PUBLIC_URL || 'http://localhost:4000',
      description: 'Current server'
    }
  ],
  tags: openapiTags,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }]
};
