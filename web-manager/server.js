const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const apiRoutes = require('./src/routes/api');
const pageRoutes = require('./src/routes/pages');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/middleware/logger');

const app = express();
const HTTP_PORT = process.env.PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;
const HTTPS_ENABLED = process.env.HTTPS_ENABLED !== 'false';
const CERT_DIR = process.env.CERT_DIR || '/app/certs';

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "blob:"]
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

// Generate certificates if they don't exist
function ensureCertificates() {
  const certPath = path.join(CERT_DIR, 'server.crt');
  const keyPath = path.join(CERT_DIR, 'server.key');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return true;
  }

  console.log(`[${new Date().toISOString()}] Generating self-signed SSL certificates...`);

  try {
    // Create certs directory if needed
    if (!fs.existsSync(CERT_DIR)) {
      fs.mkdirSync(CERT_DIR, { recursive: true });
    }

    // Generate self-signed certificate
    const hostname = process.env.CERT_HOSTNAME || 'nguardvpn.local';
    execSync(`openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "${keyPath}" \
      -out "${certPath}" \
      -subj "/C=US/ST=State/L=City/O=N-Guard/CN=${hostname}" \
      -addext "subjectAltName=DNS:${hostname},DNS:localhost,IP:127.0.0.1,IP:10.13.13.5"`, {
      stdio: 'inherit'
    });

    console.log(`[${new Date().toISOString()}] SSL certificates generated successfully`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to generate certificates:`, error.message);
    return false;
  }
}

// Start HTTP server
const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] N-Guard Manager HTTP listening on port ${HTTP_PORT}`);
  console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'production'}`);
});

// Start HTTPS server if enabled
if (HTTPS_ENABLED) {
  const certsAvailable = ensureCertificates();

  if (certsAvailable) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(path.join(CERT_DIR, 'server.key')),
        cert: fs.readFileSync(path.join(CERT_DIR, 'server.crt'))
      };

      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`[${new Date().toISOString()}] N-Guard Manager HTTPS listening on port ${HTTPS_PORT}`);
        console.log(`[${new Date().toISOString()}] Note: Self-signed certificate - browser will show security warning`);
      });
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] HTTPS not available:`, error.message);
    }
  } else {
    console.warn(`[${new Date().toISOString()}] HTTPS disabled - certificates not available`);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM signal received: closing servers`);
  httpServer.close(() => {
    console.log(`[${new Date().toISOString()}] HTTP server closed`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] SIGINT signal received: closing servers`);
  httpServer.close(() => {
    console.log(`[${new Date().toISOString()}] HTTP server closed`);
    process.exit(0);
  });
});
