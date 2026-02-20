FROM node:20-alpine

# Install required system packages
RUN apk add --no-cache docker-cli bash curl wget tar

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Use existing node user and ensure proper permissions
RUN chown -R node:node /app && \
    mkdir -p /app/logs && \
    chown -R node:node /app/logs

USER node

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8080/api/health || exit 1

CMD ["node", "server.js"]
