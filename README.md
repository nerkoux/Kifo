# Kifo Platform - Phase 1 Architecture

An AI-native Discord automation platform with workflow orchestration, multi-tenant bot hosting, and real-time execution.

## Phase 1 Delivery Status

This repository now includes a production-grade Phase 1 MVP baseline with:
- Modular monolith architecture (`apps/api`, `apps/runtime-worker`, `apps/web`)
- Shared bot mode and BYOB mode foundations with AES-256-GCM token encryption
- Queue-first workflow execution using BullMQ and Redis
- Runtime worker pool model (`Map<botId, DiscordClient>`) without one-process-per-bot
- Realtime execution telemetry over Socket.IO (`execution:queued`, `execution:status`, `execution:log`)
- Execution history APIs and logs APIs for dashboard consumption
- Health/readiness endpoints and runtime worker summary APIs
- Docker Compose stack with Postgres, Redis, NGINX, MinIO, Prometheus, Grafana, Loki
- GitHub Actions CI and Compose deployment workflow

## Overview

Kifo is a production-grade SaaS platform for Discord automation that combines:
- **Shared Bot Mode**: Users invite the platform's verified Discord bot
- **BYOB Mode**: Users bring their own Discord bot tokens (encrypted)
- **Visual Workflow Builder**: Node-based automation with React Flow
- **AI Integration**: OpenAI/Anthropic for moderation, generation, and decision-making
- **Real-time Execution**: Queue-based workflow processing with BullMQ

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                              │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────▼─────────────┐
        │      NGINX (80/443)      │
        │   SSL, Reverse Proxy     │
        └────────────┬─────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌──────▼──────┐   ┌────▼─────┐
│ Web    │    │  API        │   │ Runtime  │
│Frontend│    │  (NestJS)   │   │ Worker   │
│:3000   │    │  :4000      │   │ :5000    │
└────────┘    └─────────────┘   └──────────┘
                   │                   │
                   │                   │
         ┌─────────▼──────────┐       │
         │   PostgreSQL       │       │
         │   (Primary DB)     │       │
         │   :5432            │       │
         └────────────────────┘       │
                                      │
         ┌────────────────────┐       │
         │   Redis            │◄──────┘
         │   (Queues/Cache)   │
         │   :6379            │
         └────────────────────┘
```

## Project Structure

```
Kifo/
├── apps/
│   ├── api/                    # NestJS Backend API
│   │   ├── src/
│   │   │   ├── auth/          # Discord OAuth2, JWT
│   │   │   ├── bots/          # Bot management, encryption
│   │   │   ├── workflows/     # Workflow CRUD, engine
│   │   │   ├── executions/    # Execution logs
│   │   │   ├── prisma/        # Database service
│   │   │   ├── redis/         # Redis clients
│   │   │   ├── queue/         # BullMQ integration
│   │   │   └── ...
│   │   ├── prisma/
│   │   │   └── schema.prisma  # Database schema
│   │   └── Dockerfile
│   │
│   ├── runtime-worker/        # Discord Bot Runtime
│   │   ├── src/
│   │   │   ├── runtime-manager.ts   # Discord.js clients manager
│   │   │   ├── health-server.ts     # Health/metrics endpoints
│   │   │   └── utils/
│   │   └── Dockerfile
│   │
│   └── web/                   # Next.js Frontend
│       ├── src/
│       ├── package.json
│       └── Dockerfile
│
├── infrastructure/
│   ├── nginx/
│   │   └── nginx.conf         # Reverse proxy config
│   └── observability/
│       ├── prometheus.yml
│       ├── loki-config.yml
│       ├── promtail-config.yml
│       └── grafana/
│
├── docker-compose.yml         # Complete stack
├── package.json              # Root workspace config
└── .env.example              # Environment template
```

## Quick Start

### Prerequisites
- Docker 24.0+
- Docker Compose 2.20+
- Node.js 20+ (for local development)

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values:
# - Discord OAuth2 credentials
# - Platform bot token
# - OpenAI/Anthropic API keys
```

### 2. Start Infrastructure

```bash
docker-compose up -d postgres redis minio
```

### 3. Database Migration

```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

### 4. Start All Services

```bash
# From root
docker-compose up -d

# Or individually:
docker-compose up -d api runtime-worker frontend
```

### 5. Access Services

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api
- **API Docs**: http://localhost:4000/api/docs
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## Key Features

### Dual Bot Modes

| Feature | Shared Mode | BYOB Mode |
|---------|------------|-----------|
| Setup | Invite platform bot | Add custom token |
| Identity | Platform branding | Your own bot name/avatar |
| Encryption | N/A | AES-256-GCM |
| Ideal For | Quick start, free tier | Pro users, custom branding |

### Workflow Engine

- **Triggers**: messageCreate, memberJoin, reactionAdd, scheduled, webhook
- **Conditions**: equals, contains, regex, role, channel
- **Actions**: sendMessage, addRole, timeout, createChannel
- **AI Nodes**: generateText, moderate, classify
- **Data Flow**: variable interpolation, context passing

### Security

- **Token Encryption**: AES-256-GCM for BYOB bot tokens
- **Authentication**: Discord OAuth2 + JWT (15min access, 7-day refresh)
- **Rate Limiting**: Configurable per-endpoint
- **Audit Logging**: All mutations tracked

### Observability

- **Metrics**: Prometheus (workflows executed, queue depth, bot health)
- **Logs**: Loki + Promtail (structured logging)
- **Dashboards**: Grafana pre-configured datasources

## Development

### Backend API

```bash
cd apps/api
npm install
npm run start:dev
```

### Runtime Worker

```bash
cd apps/runtime-worker
npm install
npm run start:dev
```

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

## Database Schema Highlights

- **Users**: Discord OAuth profiles
- **Bots**: Shared/CUSTOM types with encrypted tokens
- **Workflows**: Node/edge JSON graphs with versioning
- **Executions**: Trigger data, status, logs
- **RuntimeWorkers**: Heartbeat-based worker registry
- **AIMemory**: Context storage for AI features

## Environment Variables

See `.env.example` for complete list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_CLIENT_ID` | Yes | Discord app client ID |
| `DISCORD_CLIENT_SECRET` | Yes | Discord app secret |
| `DISCORD_BOT_TOKEN` | Yes | Platform bot token (Shared mode) |
| `ENCRYPTION_KEY` | Yes | 32-char key for token encryption |
| `OPENAI_API_KEY` | Optional | OpenAI integration |
| `ANTHROPIC_API_KEY` | Optional | Claude integration |

## Phase 1 Scope

✅ TypeScript/Node.js monolith
✅ Docker Compose deployment
✅ Discord OAuth2 authentication
✅ Shared + BYOB bot modes
✅ Visual workflow builder backend
✅ Queue-based execution
✅ Basic AI integration
✅ Observability stack

## Future Phases

**Phase 2**: Horizontal scaling, multiple runtime workers
**Phase 3**: Go services for hot paths, distributed gateway
**Phase 4**: Rust runtime, WASM sandboxing

## License

MIT License - See LICENSE file
