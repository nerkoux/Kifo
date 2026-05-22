# ==========================================
# Kifo API - Dockerfile
# ==========================================

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS dependencies
WORKDIR /app

# Install dependencies (use install since no lockfile exists)
COPY package.json ./
RUN npm install --only=production

# Builder stage
FROM base AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Development stage
FROM base AS development
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=development

COPY package.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "start:dev"]

# Production stage
FROM base AS production
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 4000

CMD ["node", "dist/main"]
