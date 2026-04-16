# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the Luna IQ femtech wellness app and a shared API server.

## Artifacts

### Luna IQ (`artifacts/luna-iq`)
A mobile-first femtech wellness companion app built with React + Vite + Tailwind CSS.

**Features:**
- Home Dashboard with time-of-day greeting and quick status overview
- AI Chat Space with full-screen iframe for Coze/AI chatbot integration
- Mood Tracker with 5 emoji-based mood options, optional notes, mood history
- Cycle Tracker with phase calculation (Menstrual/Follicular/Ovulation/Luteal)
- Wellness Dashboard with insights based on cycle phase and mood streaks
- Sticky bottom navigation bar with 5 tabs

**Tech:**
- React + Vite
- Tailwind CSS v4
- wouter for routing
- framer-motion for page transitions
- localStorage for all persistence (no backend)
- Soft pastel color palette: #FFF7FB background, #E9E4FF lavender, #F7D6E0 blush

**localStorage keys:**
- `luna_moods` — array of { date, mood, note }
- `luna_cycle` — { lastPeriodStart, cycleLength }

### API Server (`artifacts/api-server`)
Shared Express 5 backend (currently minimal — Luna IQ uses localStorage only).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (not used by Luna IQ)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/luna-iq run dev` — run Luna IQ frontend

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
