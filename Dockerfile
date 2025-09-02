FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source files
RUN npm prune --production && rm -rf src tsconfig.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S bot -u 1001 -G nodejs
RUN chown -R bot:nodejs /app
USER bot

EXPOSE 8080

CMD ["node", "dist/index.js"]