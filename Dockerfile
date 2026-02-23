# Build stage
FROM node:18-alpine AS builder

WORKDIR /opt/render/project/src

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /opt/render/project/src

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /opt/render/project/src/.next ./.next
COPY --from=builder /opt/render/project/src/public ./public
COPY --from=builder /opt/render/project/src/next.config.js ./

# Verify the build output
RUN ls -la .next/ && echo "Build verification complete"

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
