<p align="center">
  <img src="client/public/favicon.svg" alt="TeamFlow" width="80" height="80" />
</p>

<h1 align="center">TeamFlow</h1>

<p align="center">
  <strong>Multi-tenant SaaS for team and project management</strong>
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> &nbsp;&bull;&nbsp;
  <a href="#api-reference">API</a> &nbsp;&bull;&nbsp;
  <a href="DEPLOY_CHECKLIST.md">Deploy Checklist</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## Overview

TeamFlow is a multi-tenant app: organizations manage teams, projects, and tasks with row-scoped isolation, roles (Owner / Admin / Member), JWT auth with refresh cookies, and Socket.io updates.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js 20+, Express 5, TypeScript |
| **Database** | PostgreSQL 16, Drizzle ORM |
| **Real-time** | Socket.io |
| **Testing** | Vitest |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React + Vite)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ REST + WebSocket (same origin in prod)
┌────────────────────────┴────────────────────────────────────┐
│                     Express 5 + Socket.io                      │
└────────────────────────┬────────────────────────────────────┘
                         │ Drizzle
┌────────────────────────┴────────────────────────────────────┐
│                       PostgreSQL                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Getting Started

**Prerequisites:** Node.js 20+ and PostgreSQL 16 (Docker recommended via `docker-compose.yml`).

```bash
git clone https://github.com/S37F/TeamFlow.git
cd TeamFlow
npm install
cp .env.example .env
```

**One command** (Postgres via Docker, schema push, dev server):

```bash
npm run local
```

Open **http://localhost:5000**. If `docker compose up --wait` is not available, run:

```bash
npm run db:up
npm run db:push
npm run dev
```

**Without Docker:** install Postgres, set `DATABASE_URL` in `.env`, then `npm run db:push` and `npm run dev`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run local` | Docker Postgres → `db:push` → dev server |
| `npm run db:up` / `npm run db:down` | Start/stop Postgres container |
| `npm run dev` | Dev server with Vite HMR |
| `npm run build` | Production build (client + server) |
| `npm start` | Run production server (`dist/`) |
| `npm test` | All tests |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Drizzle Studio |

---

## API Reference

Auth uses Bearer access tokens and an httpOnly refresh cookie.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register user + organization |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/user` | Current user |

### Projects & tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` / `POST` | `/api/projects` | List / create projects |
| `PATCH` / `DELETE` | `/api/projects/:id` | Update / delete project |
| `GET` / `POST` | `/api/projects/:projectId/tasks` | List / create tasks |
| `PATCH` / `DELETE` | `/api/tasks/:id` | Update / delete task |

### Organization & team

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/organization` | Organization |
| `GET` | `/api/organization/members` | Members |
| `POST` | `/api/organization/invite` | Invite member |
| `PATCH` / `DELETE` | `/api/organization/members/:id` | Role / remove |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Readiness (includes DB) |

---

## Project structure

```
TeamFlow/
├── client/           # React app
├── config/           # Build/test/db config files
├── server/           # Express + Socket.io
├── shared/           # Drizzle schema + Zod + route types
├── tests/            # Vitest setup
├── script/build.ts   # Production bundle script
├── docker-compose.yml
└── .env.example
```

---

## Production build

Set `NODE_ENV=production`, `DATABASE_URL`, and strong `JWT_*` secrets. Build and run:

```bash
npm run build
npm start
```

The server serves the Vite-built client from `dist/public` and the API on `PORT` (default 5000). Set `ALLOWED_ORIGINS` to your public origin(s) if it differs from the defaults.

---

## Free deployment (Neon + Render)

This project is already structured for this stack (single Node service + PostgreSQL).

1. Create a free Neon project and copy the pooled `DATABASE_URL`.
2. Push this repository to GitHub.
3. In Render, create a **Web Service** from the repo.
4. Render should auto-detect `render.yaml`; otherwise set:
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
5. Add environment variables in Render:
   - `NODE_ENV=production`
   - `DATABASE_URL=<your_neon_database_url>`
   - `JWT_ACCESS_SECRET=<32+ chars>`
   - `JWT_REFRESH_SECRET=<32+ chars>`
   - `ALLOWED_ORIGINS=https://<your-service>.onrender.com`
6. Deploy.
7. Run schema sync once against Neon from your machine:
   - `npm run db:push`

After deployment:
- `https://<your-service>.onrender.com/health`
- `https://<your-service>.onrender.com/ready`

Notes:
- Keep frontend and backend on the same Render service for this codebase.
- Free tier services may sleep and have cold starts.

---

## Security

JWT access + refresh tokens, scrypt passwords, rate limits on auth routes, Helmet, CORS, compression, structured logging, Zod validation, soft deletes.

---

## License

MIT
