<p align="center">
  <img src="client/public/favicon.svg" alt="TeamFlow" width="80" height="80" />
</p>

<h1 align="center">TeamFlow</h1>

<p align="center">
  <strong>Multi-tenant SaaS platform for team & project management</strong>
</p>

<p align="center">
  <a href="https://teamflow-saas.onrender.com">Live Demo</a> &nbsp;&bull;&nbsp;
  <a href="#getting-started">Getting Started</a> &nbsp;&bull;&nbsp;
  <a href="#deployment">Deploy</a> &nbsp;&bull;&nbsp;
  <a href="#api-reference">API</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Render-Deploy-000000?logo=render&logoColor=white" alt="Render" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## Overview

TeamFlow is a production-ready, multi-tenant SaaS application where organizations can manage teams, projects, and tasks — all from a single platform. Each organization's data is fully isolated at the query level, with role-based access control (Owner / Admin / Member) and real-time updates via WebSockets.

### Key Features

- **Multi-Tenancy** — Organization-scoped data isolation (shared database, row-level filtering)
- **Authentication** — JWT access + refresh tokens with httpOnly cookies and automatic token rotation
- **Role-Based Access** — Owner, Admin, Member roles with permission-gated operations
- **Project Management** — Create projects, assign team members, track progress
- **Task Tracking** — Kanban board with drag-and-drop, priority levels, status tracking
- **Team Management** — Invite members, manage roles, soft-delete users
- **Real-Time Updates** — Socket.io with organization-scoped rooms
- **Dark Mode** — Full light/dark theme support
- **Production Hardened** — Rate limiting, security headers, CORS, compression, structured logging

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, Radix UI |
| **Routing** | Wouter (client), Express 5 (server) |
| **State** | TanStack React Query |
| **Backend** | Node.js 20+, Express 5, TypeScript |
| **Database** | PostgreSQL 16, Drizzle ORM |
| **Auth** | JWT (access + refresh tokens), scrypt password hashing |
| **Real-Time** | Socket.io |
| **Validation** | Zod (shared schemas between client & server) |
| **Testing** | Vitest (48 tests — server + client) |
| **Deployment** | Render (API), Vercel (SPA), Supabase (Postgres) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                       │
│  Auth ─ Dashboard ─ Projects ─ Tasks (Kanban) ─ Team ─ Settings  │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + WebSocket
┌────────────────────────┴────────────────────────────────────┐
│                     Server (Express 5)                      │
│  Middleware: Auth │ Rate Limit │ CORS │ Helmet │ Compression │
│  Routes: /api/auth │ /api/user │ /api/projects │ /api/tasks │
│  Socket.io: org-scoped real-time events                     │
└────────────────────────┬────────────────────────────────────┘
                         │ Drizzle ORM
┌────────────────────────┴────────────────────────────────────┐
│                    PostgreSQL 16                            │
│  organizations │ users │ projects │ tasks │ refresh_tokens  │
└─────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+ (local install or Supabase)

### 1. Clone & Install

```bash
git clone https://github.com/S37F/TeamFlow.git
cd TeamFlow
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/teamflow
JWT_ACCESS_SECRET=    # generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_REFRESH_SECRET=   # generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Push Database Schema

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

Open **http://localhost:5000** — register an account to get started.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build client (Vite) + server (esbuild) |
| `npm start` | Run production server |
| `npm test` | Run all tests (server + client) |
| `npm run test:server` | Run server tests only |
| `npm run test:client` | Run client tests only |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Run pending migrations |

---

## API Reference

All endpoints are under `/api`. Authentication uses JWT Bearer tokens via httpOnly cookies.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register user + organization |
| `POST` | `/api/auth/login` | Login, returns access token + sets refresh cookie |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Revoke tokens and clear cookies |
| `GET` | `/api/user` | Get current authenticated user |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List projects (org-scoped) |
| `POST` | `/api/projects` | Create project |
| `PATCH` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Soft-delete project |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List tasks (org-scoped, filterable by project) |
| `POST` | `/api/tasks` | Create task |
| `PATCH` | `/api/tasks/:id` | Update task (status, assignee, etc.) |
| `DELETE` | `/api/tasks/:id` | Soft-delete task |

### Team

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/team` | List team members |
| `POST` | `/api/team/invite` | Invite member (admin/owner only) |
| `PATCH` | `/api/team/:id/role` | Change member role |
| `DELETE` | `/api/team/:id` | Remove member |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Basic health check |
| `GET` | `/ready` | Readiness check (includes DB connectivity) |

---

## Project Structure

```
TeamFlow/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components (shadcn/ui + custom)
│   │   ├── hooks/          # Custom hooks (auth, tasks, projects, socket)
│   │   ├── lib/            # API client, query config, utilities
│   │   └── pages/          # Route pages
│   └── index.html
├── server/                 # Express backend
│   ├── middleware/          # Auth, security, rate limiting, health checks
│   ├── db.ts               # Database connection
│   ├── routes.ts           # All API routes
│   ├── storage.ts          # Data access layer (IStorage interface)
│   ├── socket.ts           # WebSocket server
│   └── index.ts            # Server entry point
├── shared/                 # Shared between client & server
│   ├── schema.ts           # Drizzle table definitions + Zod schemas
│   └── routes.ts           # Typed API route contracts
├── tests/                  # Test setup files
├── render.yaml             # Render.com web service blueprint
├── vercel.json             # Vercel static SPA build
├── script/build.ts         # Production client + server bundle
└── .env.example            # Environment template
```

---

## Deployment

### Render (API) + Vercel (frontend) + Supabase (Postgres)

1. **Supabase** — Create a project → **Project Settings → Database** → copy the **URI** connection string (direct `5432` or pooler is fine for a always-on Render web service). Append `?sslmode=require` if not already present.
2. **Render** — In the [Render Dashboard](https://dashboard.render.com), create a **Blueprint** from this repo (or use [Render Deploy](https://render.com/deploy) with `render.yaml`). In the service **Environment** tab, set or confirm:
   - `DATABASE_URL` — your Supabase Postgres URI (blueprint marks this `sync: false`; you paste it in the UI)
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — the blueprint can generate these; you may replace them with your own 32+ character secrets
   - `ALLOWED_ORIGINS` — your Vercel URL(s), e.g. `https://your-app.vercel.app` (comma-separated)
   - `SERVE_STATIC` — `false` (SPA is on Vercel; included in blueprint)
   - `REFRESH_COOKIE_SAME_SITE` — `none` (included in blueprint; required for cross-site cookies over HTTPS)
   - `APP_URL` — optional; often your Render service URL, e.g. `https://teamflow-api.onrender.com`
3. After the first deploy, apply the schema from your machine:  
   `DATABASE_URL="postgresql://…?sslmode=require" npx drizzle-kit push`
4. **Vercel** — Import the same repo. Vercel uses `vercel.json` (`build:client`, output `dist/public`). Set **Environment Variables**:
   - `VITE_API_URL` — your Render service URL with **no** trailing slash, e.g. `https://teamflow-api.onrender.com`
5. Redeploy Vercel after changing `VITE_API_URL`, and ensure Render’s `ALLOWED_ORIGINS` includes your exact Vercel origin.

**Notes:** Render sets `PORT` for you. Use **HTTPS** URLs for both services so `SameSite=None` cookies work. Socket.io uses the same `ALLOWED_ORIGINS` and `VITE_API_URL` as the REST API. Free web services may spin down after inactivity (cold starts).

---

## Security

- **JWT tokens** — Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- **Password hashing** — scrypt with random salt
- **Rate limiting** — Per-IP rate limits on auth endpoints
- **Security headers** — Helmet.js (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** — Configurable allowed origins, restricted in production
- **httpOnly cookies** — Refresh tokens stored in secure, httpOnly cookies
- **Soft deletes** — Data is never permanently removed
- **Input validation** — Zod schemas validate all inputs on both client and server

---

## License

MIT
