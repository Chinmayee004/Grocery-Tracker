import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import itemsRouter from './routes/items.js';
import { authenticateSocket } from './middleware/auth.js';
import { registerGroceryHandlers } from './sockets/groceryHandlers.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// 1. Dynamic Environment Variables Configuration
// Parse defensively: PORT must be a positive integer. A bare `|| 5000` would
// happily accept PORT="0" (truthy string, binds a random ephemeral port) and
// quietly break health checks on hosts that export unusual PORT values.
const parsedPort = Number.parseInt(process.env.PORT, 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 2. Production CORS Setup
// Parse comma-separated client URLs if provided, and allow common local & Netlify preview environments
const configuredOrigins = CLIENT_URL.split(',').map((origin) => origin.trim());

const allowedOriginChecker = (origin, callback) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server health checks)
  if (!origin) return callback(null, true);

  // Check explicit match in configured origins
  if (configuredOrigins.includes(origin) || configuredOrigins.includes('*')) {
    return callback(null, true);
  }

  // Allow localhost during development or testing
  if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }

  // Allow Netlify production and deploy preview domains
  if (/^https:\/\/[a-zA-Z0-9_-]+\.netlify\.app$/.test(origin)) {
    return callback(null, true);
  }

  console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
  return callback(new Error(`Origin ${origin} not permitted by CORS policy`), false);
};

const corsOptions = {
  origin: allowedOriginChecker,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Health Check Endpoint (Essential for Railway deployment monitoring)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'shared-grocery-list-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 4. REST API Routes
app.use('/api/items', itemsRouter);

// 5. 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// 6. Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack || err.message);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error.',
  });
});

// 7. Socket.io Real-time WebSocket Initialization
const io = new Server(httpServer, {
  cors: {
    origin: allowedOriginChecker,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket Authentication Middleware
io.use(authenticateSocket);

// Socket Event Handlers Registration
io.on('connection', (socket) => {
  registerGroceryHandlers(io, socket);
});

// 8. Start HTTP Server
httpServer.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Shared Grocery List Backend Service Live`);
  console.log(`📡 Listening on Port: ${PORT}`);
  console.log(`🌐 Allowed Client Origins: ${configuredOrigins.join(', ')}`);
  console.log(`🩺 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('\n[SERVER] Received termination signal. Closing server gracefully...');
  httpServer.close(() => {
    console.log('[SERVER] Closed remaining connections. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { app, httpServer, io };
