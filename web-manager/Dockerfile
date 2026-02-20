FROM node:20-alpine

# Install required system packages including openssl for HTTPS
RUN apk add --no-cache docker-cli bash curl wget tar openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create directories and set permissions
RUN mkdir -p /app/logs /app/certs && \
    chown -R node:node /app

# Copy certificate generation script
COPY --chmod=755 scripts/generate-certs.sh /app/scripts/

USER node

EXPOSE 8080 8443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8080/api/health || exit 1

CMD ["node", "server.js"]
