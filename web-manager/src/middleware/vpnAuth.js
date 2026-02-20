const crypto = require('crypto');
const fs = require('fs').promises;

/**
 * Simple token-based authentication for VPN config downloads
 *
 * Authentication can be done via:
 * 1. Query parameter: ?token=xxx
 * 2. Authorization header: Bearer xxx
 * 3. Session token (from login)
 */

// In-memory session store (for simplicity)
const sessions = new Map();

// Session timeout (1 hour)
const SESSION_TIMEOUT = 60 * 60 * 1000;

/**
 * Get VPN access password from environment or .env file
 */
async function getVpnPassword() {
  // First check environment variable
  if (process.env.VPN_ACCESS_PASSWORD) {
    return process.env.VPN_ACCESS_PASSWORD;
  }

  // Try to read from .env file
  try {
    const envContent = await fs.readFile('/app/.env', 'utf8');
    const match = envContent.match(/VPN_ACCESS_PASSWORD=(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // File not found or read error
  }

  // Default password (should be changed in production)
  return 'nguard-vpn-access';
}

/**
 * Generate a session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Clean up expired sessions
 */
function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      sessions.delete(token);
    }
  }
}

// Run cleanup every 15 minutes
setInterval(cleanupSessions, 15 * 60 * 1000);

/**
 * Login endpoint handler
 * POST /api/vpn/auth/login
 */
async function login(req, res, next) {
  try {
    const { password } = req.body || {};

    if (!password) {
      return res.status(400).json({
        error: 'Password is required'
      });
    }

    const correctPassword = await getVpnPassword();

    if (password !== correctPassword) {
      return res.status(401).json({
        error: 'Invalid password'
      });
    }

    // Generate session token
    const token = generateSessionToken();
    sessions.set(token, {
      createdAt: Date.now(),
      ip: req.ip
    });

    res.json({
      success: true,
      token,
      expires_in: SESSION_TIMEOUT / 1000,
      message: 'Authentication successful'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout endpoint handler
 * POST /api/vpn/auth/logout
 */
function logout(req, res) {
  const token = extractToken(req);

  if (token && sessions.has(token)) {
    sessions.delete(token);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}

/**
 * Check authentication status
 * GET /api/vpn/auth/status
 */
function checkAuthStatus(req, res) {
  const token = extractToken(req);
  const isAuthenticated = token && sessions.has(token);

  res.json({
    authenticated: isAuthenticated,
    timestamp: new Date().toISOString()
  });
}

/**
 * Extract token from request
 */
function extractToken(req) {
  // Check query parameter
  if (req.query.token) {
    return req.query.token;
  }

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  if (req.cookies && req.cookies.vpn_token) {
    return req.cookies.vpn_token;
  }

  return null;
}

/**
 * Middleware to require VPN authentication
 */
function requireVpnAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid token via query parameter, Authorization header, or login first'
    });
  }

  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      message: 'Please login again'
    });
  }

  // Check if session has expired
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    sessions.delete(token);
    return res.status(401).json({
      error: 'Session expired',
      message: 'Please login again'
    });
  }

  // Attach session info to request
  req.vpnSession = session;
  next();
}

/**
 * Optional auth - allows both authenticated and unauthenticated access
 * Sets req.isVpnAuthenticated based on token validity
 */
function optionalVpnAuth(req, res, next) {
  const token = extractToken(req);

  if (token && sessions.has(token)) {
    const session = sessions.get(token);
    if (Date.now() - session.createdAt <= SESSION_TIMEOUT) {
      req.isVpnAuthenticated = true;
      req.vpnSession = session;
    } else {
      sessions.delete(token);
      req.isVpnAuthenticated = false;
    }
  } else {
    req.isVpnAuthenticated = false;
  }

  next();
}

module.exports = {
  login,
  logout,
  checkAuthStatus,
  requireVpnAuth,
  optionalVpnAuth,
  getVpnPassword
};
