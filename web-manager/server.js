const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const apiRoutes = require('./src/routes/api');
const pageRoutes = require('./src/routes/pages');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/middleware/logger');

const app = express();
const PORT = process.env.PORT || 8080;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "cdn.tailwindcss.com"]
    }
  }
}));

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);
app.use('/', pageRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] N-Guard Manager listening on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'production'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[${new Date().toISOString()}] SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[${new Date().toISOString()}] SIGINT signal received: closing HTTP server');
  process.exit(0);
});
