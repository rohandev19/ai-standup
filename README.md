<h1 align="center">
  🤖 AI Standup
</h1>

<p align="center">
  <strong>Async Team Standup Platform with AI-Powered Summaries & Real-Time Dashboard</strong>
</p>

<p align="center">
  A multi-tenant SaaS platform that replaces synchronous daily standups with async submissions,<br/>
  real-time presence tracking via WebSocket, and AI-generated team summaries using Claude API.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs" alt="NestJS 11" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma 6" />
  <img src="https://img.shields.io/badge/Claude_API-Haiku-D4A574" alt="Claude API" />
</p>

---

## 📋 Overview

Remote/hybrid teams (5–30 people) often skip daily standups due to timezone conflicts and meeting fatigue. Managers lose visibility into daily progress, and blockers surface too late.

**AI Standup** solves this by letting team members submit updates asynchronously within a configurable time window. An AI (Claude) automatically summarizes the entire team's updates into a single narrative report and flags blockers by severity — so managers get a complete picture without reading every individual entry.

### Key Differentiators

- **Multi-tenant architecture** — one deployment serves multiple isolated workspaces (companies/teams)
- **Real-time WebSocket dashboard** — see who has/hasn't submitted without refreshing
- **AI daily summaries** — Claude generates a single narrative from all team entries (batched, not per-entry)
- **Automated blocker detection** — AI classifies blocker severity (Low/Medium/High) with reasoning
- **Weekly digest** — AI-generated weekly trend reports for managers

---

## ✨ Features

### Core
| Feature | Description |
|---|---|
| **Async Standup Submission** | 3-field form (Yesterday / Today / Blockers) with configurable submission window per workspace |
| **Real-Time Presence Dashboard** | WebSocket-powered live view of who submitted, with animated status transitions |
| **AI Daily Summary** | One Claude API call per workspace/day — generates narrative summary with metadata |
| **AI Blocker Detection** | Batch analysis with severity classification (Low/Medium/High) using Claude tool use |
| **AI Weekly Digest** | End-of-week automated report with trends, participation rates, and recurring blocker patterns |

### Platform
| Feature | Description |
|---|---|
| **Multi-Tenant Isolation** | Every query scoped by `workspaceId`, WebSocket rooms isolated per workspace |
| **Role-Based Access Control** | Owner → Admin → Member hierarchy with granular endpoint guards |
| **Onboarding Wizard** | Guided 5-step setup: name → timezone → working days → invite team → dashboard |
| **Team Analytics** | Submission rate charts, blocker trends, member streaks, Team Health Score |
| **Notification Center** | In-app bell + email notifications with real-time badge count via WebSocket |
| **History & Search** | Full-text search across standup entries, date/member filtering, paginated results |
| **Data Export** | CSV export of entries and summaries (Owner only, rate-limited) |

### Security & Reliability
| Feature | Description |
|---|---|
| **Tenant Isolation Guards** | `WorkspaceMembershipGuard` on every workspace-scoped endpoint + WebSocket `join_workspace` |
| **Auth Hardening** | Account lockout, brute-force protection, rate limiting per IP & email, password reset with token invalidation |
| **Circuit Breaker** | AI API failures handled gracefully — 5 failures → 5 min cooldown, submissions never blocked |
| **Graceful Degradation** | AI down → submissions still accepted; Redis down → fallback to in-process events |
| **Audit Trail** | Immutable log of all admin actions (role changes, member removal, settings updates) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│   Next.js 16 (App Router)       │     │   NestJS 11 (Backend API)       │
│                                 │     │                                 │
│   Server Components (SSR)       │REST │   REST Controllers + Guards     │
│   Client Components (Socket.io) ├────►│   WebSocket Gateway (Socket.io) │
│   Onboarding Wizard             │WSS  │   Scheduled Cron Jobs           │
│   Recharts Analytics            │     │   BullMQ Job Processors         │
└─────────────────────────────────┘     └──────────┬──────────────────────┘
                                                   │
                                        ┌──────────┴──────────┐
                                        │   Application Layer  │
                                        │   Use Cases + Events │
                                        │   EventEmitter Bus   │
                                        └──┬──────┬────────┬───┘
                                           │      │        │
                                    ┌──────┘      │        └───────┐
                                    ▼             ▼                ▼
                             ┌───────────┐ ┌───────────┐   ┌────────────┐
                             │PostgreSQL │ │   Redis    │   │ Claude API │
                             │(Prisma)   │ │           │   │ (Haiku)    │
                             │           │ │• Socket.io│   │            │
                             │• Users    │ │  adapter  │   │• Summary   │
                             │• Workspaces│ │• BullMQ   │   │• Blockers  │
                             │• Standups │ │• Rate limit│   │• Digest    │
                             │• Summaries│ │• Circuit  │   └────────────┘
                             │• Audit    │ │  breaker  │
                             └───────────┘ └───────────┘
```

### Key Architecture Decisions

- **Separate NestJS process** (not Next.js API Routes) — WebSocket needs persistent connections and its own lifecycle; crash isolation between FE/BE
- **Server Components + Client Components boundary** — SSR for initial data fetch, `'use client'` only for WebSocket-connected components
- **Event-driven decoupling** — standup submission emits events → listeners handle WebSocket broadcast, audit logging, email sending independently
- **BullMQ job queues** — AI calls and email sending are async with retry, backoff, and dead-letter queue support
- **Single AI call per workspace/day** — all entries batched into one API call, not per-member (cost control)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Backend** | NestJS 11, TypeScript 5 |
| **Database** | PostgreSQL (via Prisma 6 ORM) |
| **Cache / Pub-Sub** | Redis (Socket.io adapter, BullMQ, rate limiting, circuit breaker) |
| **Real-Time** | Socket.io 4 (with Redis adapter for multi-instance) |
| **AI** | Claude API (Haiku) — tool use for structured blocker classification |
| **Job Queue** | BullMQ (email, AI summary, AI blocker, weekly digest queues) |
| **Email** | Nodemailer (configurable SMTP provider) |
| **Auth** | JWT (access + refresh token rotation), bcrypt, Passport.js |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Testing** | Jest, Supertest, Testing Library |
| **Linting** | ESLint 9, Prettier |

---

## 📁 Project Structure

```
ai-standup/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/             # Schema & migrations
│   │   └── src/
│   │       ├── ai/             # Claude API integration, circuit breaker
│   │       ├── analytics/      # Team health score, submission trends
│   │       ├── auth/           # JWT, guards, login/register/reset
│   │       ├── common/         # Shared guards, decorators, filters
│   │       ├── events/         # Event emitter listeners
│   │       ├── notifications/  # In-app + email notification system
│   │       ├── queues/         # BullMQ processors (email, AI jobs)
│   │       ├── scheduler/      # Cron jobs (window-close, reminders)
│   │       ├── standups/       # Core submission logic
│   │       ├── summaries/      # AI daily/weekly summary generation
│   │       ├── users/          # Profile, preferences
│   │       └── workspaces/     # Multi-tenant workspace management
│   │
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # App Router pages & layouts
│           ├── components/     # Reusable UI components
│           ├── contexts/       # React context (auth, socket)
│           ├── hooks/          # Custom hooks (useSocket, useAuth)
│           └── lib/            # API client, utilities
│
├── packages/
│   └── shared/                 # Shared types, enums, WebSocket events
│
├── design.md                   # Full architecture & schema design
├── requirements.md             # 22 requirements in EARS format
└── tasks.md                    # Implementation task checklist
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x
- **pnpm** 9.x
- **PostgreSQL** 16+
- **Redis** 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/rohandev19/ai-standup.git
cd ai-standup

# Install dependencies
pnpm install

# Setup environment variables
cp apps/api/.env.example apps/api/.env
# Edit .env with your database, Redis, and API credentials

# Run database migrations
pnpm --filter api exec prisma migrate dev

# Start development servers (API + Web concurrently)
pnpm dev
```

The web app runs on `http://localhost:3000` and the API on `http://localhost:3001`.

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `ANTHROPIC_API_KEY` | Claude API key for AI features |
| `JWT_SECRET` | Secret for JWT token signing |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email service configuration |
| `FRONTEND_URL` | Frontend URL for CORS and email links |

---

## 🔒 Security Model

This is a multi-tenant platform — tenant isolation is the #1 security priority:

1. **Every database query** on workspace-owned data includes `WHERE workspaceId = ?`
2. **Every REST endpoint** behind `WorkspaceMembershipGuard` verifies the user is an active member — a valid JWT alone is not sufficient
3. **Every WebSocket room join** verifies active workspace membership before allowing connection
4. **Member removal** immediately disconnects the user's WebSocket and revokes API access
5. **Violation attempts** are logged as security events with user ID and target workspace ID

---

## 📊 AI Pipeline Design

```
Standup Window Closes (Cron)
        │
        ├──► BullMQ: ai-summary job
        │         │
        │         └──► Claude API (1 call, all entries batched)
        │                  │
        │                  └──► AiSummary saved + WebSocket broadcast
        │
        └──► BullMQ: ai-blocker job
                  │
                  └──► Claude API (1 call, tool use for structured output)
                           │
                           └──► BlockerFlags saved + HIGH severity alert

Weekly (Last Working Day):
        └──► BullMQ: ai-weekly-digest job
                  │
                  └──► Claude API (aggregates daily summaries)
                           │
                           └──► WeeklyDigest saved + email to Owner/Admin
```

- **Max 3 AI calls per workspace per day** (1 summary + 1 blocker + 1 manual trigger)
- **Circuit breaker** prevents cost hemorrhage during API outages
- **Submissions never blocked** by AI failures — AI is fully decoupled from submission flow

---

## 📄 License

MIT

---

<p align="center">
  Built by <a href="https://github.com/rohandev19">Rohan</a> as a production-grade portfolio project<br/>
  demonstrating multi-tenant SaaS architecture, real-time WebSocket systems, and AI API integration.
</p>
