# ==========================================
# Kifo Runtime Worker - Dockerfile
# ==========================================

FROM node:20-alpine AS base

# Prisma needs libssl at runtime
RUN apk add --no-cache openssl

# Dependencies stage
FROM base AS dependencies
WORKDIR /app

COPY package.json ./
RUN npm install --only=production

# Development stage
FROM base AS development
WORKDIR /app

ENV NODE_ENV=development

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "start:dev"]

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./

COPY dist ./dist
COPY prisma ./prisma

EXPOSE 5000

CMD ["node", "dist/main.js"]
