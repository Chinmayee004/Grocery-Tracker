import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@grocerytracker.local',
  user_metadata: { name: 'Demo Shopper' },
};

/**
 * Express HTTP Middleware: Validates Supabase JWT from the Authorization header,
 * or allows demo authentication if Supabase is unconfigured / demo token provided.
 * Attaches verified user object to `req.user`.
 */
export async function authenticateHttp(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or malformed Authorization header. Expected Bearer <token>.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token is empty.',
      });
    }

    // Support demo mode tokens or local mode when Supabase is unconfigured
    if (token === 'demo-token' || token.startsWith('demo-') || !isSupabaseConfigured) {
      req.user = DEMO_USER;
      return next();
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired token.',
        details: error?.message,
      });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error('[AUTH] HTTP Auth Middleware error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error validating credentials.',
    });
  }
}

/**
 * Socket.io Connection Middleware: Authenticates WebSocket connection via JWT in handshake,
 * or allows demo authentication if Supabase is unconfigured / demo token provided.
 * Attaches verified user object to `socket.user`.
 */
export async function authenticateSocket(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : socket.handshake.headers?.authorization);

    if (!token) {
      console.warn(`[SOCKET] Rejected connection from ${socket.id}: Missing auth token`);
      return next(new Error('Authentication required: Missing token in handshake'));
    }

    // Support demo mode tokens or local mode when Supabase is unconfigured
    if (token === 'demo-token' || token.startsWith('demo-') || !isSupabaseConfigured) {
      socket.user = DEMO_USER;
      return next();
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.warn(`[SOCKET] Rejected connection from ${socket.id}: Token verification failed (${error?.message})`);
      return next(new Error('Authentication failed: Invalid or expired token'));
    }

    socket.user = data.user;
    next();
  } catch (err) {
    console.error(`[SOCKET] Socket Auth error:`, err.message);
    next(new Error('Internal server error during socket authentication'));
  }
}
