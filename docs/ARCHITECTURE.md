# Omflix Architecture

## Overview

Omflix is a self-hosted home streaming platform built as a TypeScript monorepo.

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Clients                           │
│  Desktop Browser │ Mobile Browser │ PWA │ Capacitor  │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP / WebSocket / HLS
┌──────────────────┴──────────────────────────────────┐
│              Omflix Public API (:8096)                │
│              NestJS + Fastify                        │
│  ┌─────────┬──────────┬──────────┬───────────────┐  │
│  │  Auth   │  Library │  Stream  │  Search        │  │
│  │  Module │  Module  │  Module  │  Module        │  │
│  └────┬────┴────┬─────┴────┬─────┴───────────────┘  │
│       │         │          │                         │
│  ┌────┴─────────┴──────────┴─────────────────────┐  │
│  │         PostgreSQL (Drizzle ORM)               │  │
│  │         Redis (Cache / Jobs / Sessions)        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Omflix Admin API (:8097)                 │
│              Bound to 127.0.0.1 ONLY                 │
│  System health, library management, user admin,      │
│  job queues, configuration, logs                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Media Pipeline                          │
│  FFmpeg + FFprobe                                    │
│  NVIDIA NVENC/NVDEC hardware acceleration            │
│  HLS segmented streaming                             │
│  Direct Play when client-compatible                  │
└─────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Dual-Port Architecture
The public API (port 8096) is accessible from LAN and Tailscale. The admin API (port 8097) binds exclusively to 127.0.0.1, making it unreachable from any other machine — even with correct credentials.

### Direct Play First
Before transcoding, Omflix checks if the client can natively play the source format. This avoids unnecessary CPU/GPU usage and preserves quality.

### Hardware Acceleration
NVIDIA NVENC for encoding, NVDEC for decoding. Falls back to CPU (libx264/libx265) when GPU is unavailable or unsupported.

### Anonymous + Authenticated
Anyone on the network can browse and watch. Accounts add personalization (history, favorites, lists).

## Tech Stack

- **Runtime**: Node.js 26
- **Language**: TypeScript 5.9
- **Backend**: NestJS 11 + Fastify 5
- **Frontend**: React 19 + Vite 6
- **Database**: PostgreSQL 16 (Drizzle ORM)
- **Cache**: Redis 7
- **Media**: FFmpeg 9 (NVENC/NVDEC)
- **Styling**: Tailwind CSS v4
- **Routing**: TanStack Router
- **State**: TanStack Query
- **Monorepo**: pnpm workspaces + Turborepo

## Security Model

1. Network isolation: Not exposed publicly
2. Admin isolation: Localhost-only binding
3. Argon2id password hashing
4. Secure HttpOnly session cookies
5. CSRF protection
6. Input validation (Zod)
7. Parameterized queries (Drizzle ORM)
8. Media path validation (no arbitrary file access)
