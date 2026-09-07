# 🎬 OMFLIX

**Your Private Home Cinema**

A premium, self-hosted streaming platform for your personal media library. Built with modern web technologies, hardware-accelerated transcoding, and a cinematic user experience.

## Quick Start

```bash
# Development
./omflix dev

# Production
./omflix up

# Status
./omflix status
```

## Architecture

| Component | Technology | Port |
|-----------|-----------|------|
| Public API | NestJS + Fastify | 8096 (0.0.0.0) |
| Admin API | NestJS + Fastify | 8097 (127.0.0.1 only) |
| Frontend | React + Vite | 5173 (dev) |
| Database | PostgreSQL 16 | 5432 |
| Cache | Redis 7 | 6379 |
| Transcoding | FFmpeg + NVENC | — |

## Project Structure

```
omflix/
├── apps/
│   ├── server/          # NestJS backend (public + admin APIs)
│   └── web/             # React frontend (Vite + TanStack)
├── packages/
│   ├── shared/          # Types, constants, utilities
│   ├── config/          # Environment validation (Zod)
│   └── database/        # Drizzle ORM schemas
├── docs/                # Documentation
├── infra/               # Docker, systemd, deployment
├── scripts/             # Setup and management scripts
├── docker-compose.yml   # PostgreSQL + Redis
├── omflix               # CLI management tool
└── .env.example         # Environment template
```

## Requirements

- Arch Linux (or similar)
- Node.js >= 20
- pnpm
- Docker + Docker Compose
- FFmpeg with NVENC support
- NVIDIA GPU with driver (optional, falls back to CPU)

## CLI Commands

| Command | Description |
|---------|-------------|
| `./omflix up` | Start production services |
| `./omflix down` | Stop all services |
| `./omflix restart` | Restart everything |
| `./omflix dev` | Development mode with hot reload |
| `./omflix build` | Build all packages |
| `./omflix status` | Check service health |
| `./omflix logs` | View Docker logs |
| `./omflix update` | Pull, rebuild, restart |
| `./omflix scan` | Trigger library scan |

## Network Access

| Interface | Address |
|-----------|---------|
| LAN | `http://192.168.x.x:8096` |
| Tailscale | `http://omflix-machine.tailnet.ts.net:8096` |
| Admin | `http://127.0.0.1:8097` (server machine only) |

## License

Private — Personal use only.
