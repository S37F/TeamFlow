# TeamFlow — Comprehensive Project Documentation

Project documentation grounded in this repository (`teamflow-saas` v1.0.0). **Note:** The README references `docker-compose.yml`, but that file was not present in the workspace at documentation time; deployment config **is** in `render.yaml`.

---

## 1. Tech stack

### Runtime and monorepo layout

| Area | Technology | Version (source) |
|------|------------|------------------|
| Language | TypeScript | `5.6.3` (`package.json` devDependencies) |
| Module system | ESM (`"type": "module"`) | `package.json` |
| Node (deploy) | Node 20 | `render.yaml` → `NODE_VERSION: 20` |

### Frontend (`client/`)

| Library | Version |
|---------|---------|
| React | `^18.3.1` |
| React DOM | `^18.3.1` |
| Vite | `^7.3.0` |
| `@vitejs/plugin-react` | `^4.7.0` |
| Tailwind CSS | `^3.4.17` |
| PostCSS / Autoprefixer | `^8.4.47` / `^10.4.20` |
| wouter (routing) | `^3.3.5` |
| TanStack React Query | `^5.60.5` |
| React Hook Form | `^7.55.0` |
| `@hookform/resolvers` | `^3.10.0` |
| Zod | `^3.24.2` |
| `zod-validation-error` | `^3.4.0` |
| Radix UI primitives (`@radix-ui/react-*`) | various `^1.x–^2.x` |
| `@dnd-kit/*` (drag-and-drop) | `^6.3.1`, `^10.0.0`, `^3.2.2` |
| Framer Motion | `^11.13.1` |
| `class-variance-authority`, `clsx`, `tailwind-merge` | `^0.7.1`, `^2.1.1`, `^2.6.0` |
| `tailwindcss-animate`, `tw-animate-css` | `^1.0.7`, `^1.2.5` |
| lucide-react | `^0.453.0` |
| date-fns | `^3.6.0` |
| Socket.io client | `^4.8.3` |

### Backend (`server/`)

| Library | Version |
|---------|---------|
| Express | `^5.0.1` |
| dotenv | `^17.2.4` |
| cookie-parser | `^1.4.7` |
| cors | `^2.8.6` |
| helmet | `^8.1.0` |
| compression | `^1.8.1` |
| express-rate-limit | `^8.2.1` |
| jsonwebtoken | `^9.0.3` |
| Socket.io | `^4.8.3` |
| Drizzle ORM | `^0.39.3` |
| drizzle-zod | `^0.7.0` |
| `pg` (node-postgres) | `^8.16.3` |
| Zod | `^3.24.2` |
| Winston | `^3.19.0` |

### Shared (`shared/`)

- Drizzle table definitions + Zod-derived insert schemas (`drizzle-zod`).
- Typed API contracts (`shared/routes.ts`).

### Database and tooling

| Tool | Version / role |
|------|------------------|
| PostgreSQL | README targets **16** (not pinned in-repo without `docker-compose.yml`) |
| drizzle-kit | `^0.31.8` — `db:generate`, `db:migrate`, `db:push`, `db:studio` |
| Schema config | `config/drizzle.config.ts` — dialect `postgresql`, output `./migrations` |

### Build and dev

| Tool | Version |
|------|---------|
| tsx | `^4.20.5` |
| esbuild | `^0.25.0` (server bundle in `script/build.ts`) |
| cross-env | `^7.0.3` |

### Testing

| Tool | Version |
|------|---------|
| Vitest | `^4.0.18` |
| @testing-library/react | `^16.3.2` |
| @testing-library/jest-dom | `^6.9.1` |
| @testing-library/user-event | `^14.6.1` |
| jsdom | `^28.0.0` |
| msw | `^2.12.9` |
| supertest | `^7.2.2` |
| Config | `config/vitest.server.config.ts`, `config/vitest.client.config.ts` |

### DevOps / deployment

- **`render.yaml`**: Render Web Service, `npm ci && npm run build`, `npm start`.
- **`script/build.ts`**: Vite client build + esbundle `server/index.ts` → `dist/index.cjs`.
- **`.env.example`**: required secrets and optional URLs.

---

## 2. Backend concepts and key methods

Each item maps to real code in this repo.

### JWT (access tokens)

- **What it is**: Signed, short-lived token carrying user identity claims.
- **Why here**: Stateless API auth and Socket.io handshake without server sessions.
- **How it works**: `generateAccessToken` signs `userId`, `organizationId`, `role`, `username` with `JWT_ACCESS_SECRET`, expiry `15m`. `authenticateToken` reads `Authorization: Bearer …`, verifies with `jwt.verify`, attaches `(req as AuthenticatedRequest).user`.
- **Where**: `server/middleware/auth.ts` — `generateAccessToken`, `authenticateToken`; `server/socket.ts` — `jwt.verify` on `socket.handshake.auth.token`.

### Opaque refresh tokens + httpOnly cookies

- **What it is**: Random server-issued token stored client-side only in an httpOnly cookie; server stores a **hash** in the DB.
- **Why here**: Long-lived sessions without putting long-lived JWTs in `localStorage`; supports rotation.
- **How it works**: `generateRefreshTokenValue` → hex; `storeRefreshToken` SHA-256 hashes and inserts into `refresh_tokens`. `validateRefreshToken` looks up hash, checks `expiresAt`, **deletes** row (rotation). Cookie set via `setRefreshCookie` on path `/api/auth`, `sameSite: "strict"`, `secure` in production.
- **Where**: `server/middleware/auth.ts` — `generateRefreshTokenValue`, `hashToken`, `storeRefreshToken`, `validateRefreshToken`, `setRefreshCookie`, `clearRefreshCookie`, `REFRESH_COOKIE_NAME`; routes in `server/routes.ts` — `POST /api/auth/refresh`, login/register.

### Password hashing (scrypt)

- **What it is**: Key derivation with per-user salt.
- **Why here**: Protect stored passwords if the DB is compromised.
- **How it works**: `hashPassword` uses `crypto.scrypt` + `randomBytes` salt; `comparePasswords` re-derives and `timingSafeEqual`.
- **Where**: `server/routes.ts` — `hashPassword`, `comparePasswords`.

### Multi-tenancy (organization isolation)

- **What it is**: Data scoped by `organizationId` so one deployment serves many orgs.
- **Why here**: SaaS model; every user belongs to one org; API checks org on reads/writes.
- **How it works**: JWT carries `organizationId`. Handlers compare `project.organizationId` / `task.organizationId` to `authReq.user.organizationId` before returning or mutating data.
- **Where**: Most handlers in `server/routes.ts` (e.g. `storage.getProjects(organizationId)`).

### RBAC (role-based access control)

- **What it is**: Permissions depend on `owner` / `admin` / `member`.
- **Why here**: Owners/admins manage org and destructive actions; members have narrower rights.
- **How it works**: `requireRole("owner", "admin")` wraps routes; extra checks (e.g. only owner removes admins, cannot remove owner).
- **Where**: `server/middleware/auth.ts` — `requireRole`; `server/routes.ts` — project delete, invites, member removal, org rename, `/api/metrics`.

### Repository / storage layer (no separate “service” tier)

- **What it is**: Data access abstraction over Drizzle (`DatabaseStorage`).
- **Why here**: Centralizes queries, soft-delete filters, transactions.
- **How it works**: Route handlers call `storage.*`; complex signup uses `db.transaction` in `createOrganizationOwnerWithSession`.
- **Where**: `server/storage.ts` — `DatabaseStorage`, `storage` singleton; `server/db.ts` — `pool`, `db`.

### Soft deletes

- **What it is**: Rows kept with `deletedAt` instead of hard delete for users/projects/tasks.
- **Why here**: Safer revocation and audit-friendly behavior.
- **How it works**: Queries use `isNull(users.deletedAt)` (etc.); `softDeleteProject` also soft-deletes child tasks.
- **Where**: `server/storage.ts` — `softDeleteUser`, `softDeleteProject`, `softDeleteTask`, getters with `isNull`.

### Socket.io real-time broadcasts

- **What it is**: WebSocket-style events scoped per organization room.
- **Why here**: Live UI updates (tasks/projects/members) without polling.
- **How it works**: On connect, socket joins `org-${organizationId}`. Mutations call `emitTaskCreated`, etc., which use `emitToOrg`.
- **Where**: `server/socket.ts` — `setupSocketIO`, `emitToOrg`, emitters; `server/routes.ts` after CUD operations; client `client/src/hooks/use-socket.ts`.

### Rate limiting

- **What it is**: Per-IP request caps over a sliding window.
- **Why here**: Reduce abuse and credential stuffing on auth paths.
- **How it works**: `express-rate-limit` on `/api/` (500/15min), stricter on `/api/auth/login` and `/api/auth/register` (5/15min, `skipSuccessfulRequests: true`), refresh (30/15min).
- **Where**: `server/middleware/security.ts`.

### Helmet + CSP

- **What it is**: Security-related HTTP headers, including Content-Security-Policy.
- **Why here**: Mitigate XSS and related browser risks; dev CSP allows Vite HMR (`unsafe-eval`, `ws:`).
- **Where**: `server/middleware/security.ts` — `helmet({ contentSecurityPolicy: … })`.

### CORS

- **What it is**: Cross-origin rules for browsers.
- **Why here**: API + SPA; credentials for cookies.
- **How it works**: `parseAllowedOrigins()` from `ALLOWED_ORIGINS` or dev defaults `localhost:5000` / `3000`; `credentials: true`.
- **Where**: `server/middleware/security.ts`; Socket.io `cors.origin` in `server/socket.ts`.

### Compression

- **What it is**: gzip/brotli-style response compression.
- **Why here**: Smaller payloads over the wire.
- **Where**: `server/middleware/performance.ts` — `setupCompression`.

### Request metrics (in-process)

- **What it is**: Counters and slow-request log for ops insight.
- **Why here**: Lightweight observability without external APM in code.
- **How it works**: `metricsMiddleware` increments totals and logs slow requests; `getMetrics()` exposed at `GET /api/metrics` (owner only).
- **Where**: `server/middleware/performance.ts`; route in `server/routes.ts`.

### Health / readiness / liveness

- **What it is**: Standard endpoints for orchestrators and load balancers.
- **Why here**: Deployments and probes need DB-aware readiness.
- **How it works**: `/health` JSON; `/ready` runs `pool.query("SELECT 1")`; `/live` returns `OK`.
- **Where**: `server/middleware/health.ts` — `setupHealthChecks`.

### Structured logging

- **What it is**: JSON logs with levels and context.
- **Why here**: Production debugging and aggregation (e.g. Docker stdout).
- **Where**: `server/logger.ts` (Winston); request middleware in `server/index.ts`; auth events in `server/routes.ts`.

### Environment validation

- **What it is**: Fail-fast config checks at startup.
- **Why here**: Avoid running with weak/missing secrets.
- **Where**: `server/env.ts` — `validateEnv()` (Zod); called from `server/index.ts`.

### Trust proxy

- **What it is**: Express honors `X-Forwarded-*` when behind a reverse proxy.
- **Why here**: Correct client IP for rate limits and logs in production.
- **Where**: `server/index.ts` — `app.set("trust proxy", 1)` when `NODE_ENV === "production"`.

### Global error handler

- **What it is**: Last-resort Express error middleware.
- **Why here**: Consistent 500 handling and logging.
- **Where**: `server/index.ts` — 4-arg `(err, req, res, _next)`.

### Input validation (Zod + drizzle-zod)

- **What it is**: Runtime schema validation for bodies and params.
- **Why here**: Reject bad input before DB; share types with client.
- **Where**: `shared/schema.ts` — `insertProjectSchema`, `insertTaskSchema`, `signupSchema`, `loginSchema`; `shared/routes.ts` — `api.*.input`; `server/routes.ts` — `z.coerce.number()` for IDs, ad-hoc `z.object` for profile/org/member.

### SQL injection resistance (ORM)

- **What it is**: Parameterized queries via Drizzle query builder.
- **Why here**: Safe composition of SQL.
- **Where**: All `db.*` usage in `server/storage.ts`.

### Development seed (optional)

- **What it is**: Creates demo org/user/project/task when enabled.
- **Why here**: Faster local onboarding.
- **How it works**: If `NODE_ENV !== "production"` and `ENABLE_DEV_SEED === "true"`, `seedDatabase()` runs (checks `admin` user).
- **Where**: `server/routes.ts` — `seedDatabase`, `enableDevSeed`.

### Not implemented in this codebase

- OAuth / social login, API keys for third parties, message queues, Redis caching, webhooks, email/SMS/payment providers, separate API gateway service.

---

## 3. API inventory

Grouped by area. **Auth** for `/api/*` means `Authorization: Bearer <accessToken>` unless noted. Bodies are JSON unless stated.

### Health (no auth)

| Method | Route | Description | Auth | Request body | Response |
|--------|-------|-------------|------|--------------|----------|
| GET | `/health` | Liveness-style JSON | No | — | `{ status, timestamp, uptime, environment }` |
| GET | `/ready` | Readiness + DB ping | No | — | 200 healthy / 503 unhealthy JSON |
| GET | `/live` | Plain liveness | No | — | `200` body `OK` |

### Auth

| Method | Route | Description | Auth | Request body | Response |
|--------|-------|-------------|------|--------------|----------|
| POST | `/api/auth/register` | Register user + org (owner) | No | `signupSchema`: `username`, `password`, `organizationName` | `201` `{ user, accessToken }`; sets refresh cookie |
| POST | `/api/auth/login` | Login | No | `loginSchema`: `username`, `password` | `200` `{ user, accessToken }`; refresh cookie |
| POST | `/api/auth/refresh` | Rotate refresh token; new access | Cookie `teamflow_refresh` | — | `200` `{ user, accessToken }` |
| POST | `/api/auth/logout` | Clear cookie; revoke refresh if Bearer decodes | Optional Bearer | — | `200` empty |
| GET | `/api/user` | Current user (no password) | Yes | — | User JSON |

### Projects

| Method | Route | Description | Auth | Request body | Response |
|--------|-------|-------------|------|--------------|----------|
| GET | `/api/projects` | List org projects | Yes | — | `Project[]` |
| POST | `/api/projects` | Create project | Yes | `insertProjectSchema` (`name`, `description?`) | `201` project |
| GET | `/api/projects/:id` | Get project if in org | Yes | — | project or `404` |
| PATCH | `/api/projects/:id` | Partial update | Yes | `insertProjectSchema.partial()` | project |
| DELETE | `/api/projects/:id` | Soft-delete (owner/admin) | Yes + role | — | `204` |

### Tasks

| Method | Route | Description | Auth | Request body | Response |
|--------|-------|-------------|------|--------------|----------|
| GET | `/api/projects/:projectId/tasks` | Tasks for project | Yes | — | `Task[]` |
| POST | `/api/projects/:projectId/tasks` | Create task | Yes | `api.tasks.create.input` (task fields minus `projectId`) | `201` task |
| PATCH | `/api/tasks/:id` | Update task | Yes | `insertTaskSchema.partial()` | task |
| DELETE | `/api/tasks/:id` | Soft-delete task | Yes | — | `204` |

### User profile

| Method | Route | Description | Auth | Request body | Response |
|--------|-------|-------------|------|--------------|----------|
| PATCH | `/api/user/profile` | Username and/or password change | Yes | optional `username`; `currentPassword` + `newPassword` when changing password | safe user JSON |

### Organization & team

| Method | Route | Description | Auth | Request body | Response |
|--------|-------|-------------|------|--------------|----------|
| GET | `/api/organization` | Org record | Yes | — | organization |
| PATCH | `/api/organization` | Rename org | Yes + owner | `{ name }` | organization |
| GET | `/api/organization/members` | Members (no passwords) | Yes | — | user array |
| GET | `/api/organization/tasks` | All tasks in org | Yes | — | tasks |
| POST | `/api/organization/invite` | Create member (owner/admin; admin invite rules) | Yes + owner/admin | `username`, `password`, `role?` (`member`/`admin`) | `201` safe member |
| DELETE | `/api/organization/members/:id` | Soft-remove member | Yes + owner/admin | — | `204` |
| PATCH | `/api/organization/members/:id/role` | Set role to member/admin | Yes + owner | `{ role }` | safe member |

### Operations

| Method | Route | Description | Auth | Request body | Response |
|--------|-------|-------------|------|--------------|----------|
| GET | `/api/metrics` | In-memory request metrics | Yes + owner | — | `{ totalRequests, averageResponseTime, slowRequests }` |

### Typical error payloads (handlers)

Many routes return `{ error: string, code: string }` (e.g. `USERNAME_TAKEN`, `TOKEN_EXPIRED`). The global handler uses `{ error, code: "INTERNAL_ERROR", stack? }` in development for 500s.

---

## 4. Architecture diagram (text)

```
[Browser SPA (React+Vite)]
    |
    |  HTTPS same origin (prod) or localhost:5000 (dev)
    v
+------------------ Express App (server/index.ts) ------------------+
| setupHealthChecks  -> /health /ready /live                        |
| setupCompression                                                      |
| setupSecurityMiddleware -> CORS, Helmet, rate limits              |
| metricsMiddleware                                                     |
| express.json/urlencoded (1mb limit) + cookieParser()               |
| setupSocketIO (Socket.io @ /socket.io)                            |
| request logging -> winston                                           |
| registerRoutes(app) -> all /api/*                                  |
| global error handler (4-arg)                                        |
| production: serveStatic(dist/public) | dev: setupVite            |
+------------------+--------------------+----------------------------+
                                   |
                    +--------------v--------------+
                    |   PostgreSQL (node-pg Pool) |
                    |   Drizzle ORM (shared/schema)|
                    +-----------------------------+

REST flow (example: PATCH task):

[Client authFetch]
    -> Authorization: Bearer <accessToken> + Cookie on refresh
    -> POST /api/auth/refresh (credentials) when token expired/missing logic in client

[express /api/tasks/:id]
    -> authenticateToken (JWT verify, attach JwtPayload)
    -> handler: storage.getTask -> org check -> storage.updateTask
    -> emitTaskUpdated(orgId, task) -> Socket.io room org-{id}

Socket flow:

[Client useSocket]
    -> io(origin, { auth: { token: accessJwt }, path: "/socket.io" })

[server/socket.ts]
    -> io.use: jwt.verify handshake.auth.token
    -> socket.join(`org-${organizationId}`)
    -> broadcast member:online / member:offline
    <- emit task:created | task:updated | task:deleted | project:* | member:*

Auth flow (conceptual):

Register/Login -> generateAccessToken + generateRefreshTokenValue
             -> storeRefreshToken (SHA-256 in DB)
             -> setRefreshCookie (httpOnly)

API request -> Bearer access JWT -> authenticateToken

Access expired -> authFetch detects 401 + code -> POST /withCredentials refresh
               -> validateRefreshToken (rotate: delete old row, new cookie)

Logout -> optional revoke all refresh tokens for user id from JWT decode
       -> clearRefreshCookie
```

---

## 5. Problem statement

- **Real-world problem**: Small teams need a shared place to organize work (orgs, projects, kanban-style tasks, roles) with isolation between customers and live updates across browsers.
- **Target user**: Teams or companies using a multi-tenant SaaS for internal project/task management (owners, admins, members).
- **Without this software**: They would use spreadsheets, ad-hoc chat, or generic tools without the same org-scoped API, role model, and real-time task signals wired to this stack.
- **Core value proposition**: TeamFlow combines **multi-tenant org isolation**, **JWT + rotating httpOnly refresh sessions**, **role-based team management**, and **Socket.io-driven live updates** in a single TypeScript codebase with PostgreSQL persistence.

---

## 6. Authentication and authorization

- **Strategy**: **JWT access tokens** (short-lived, `Bearer` header) + **opaque refresh tokens** in **`httpOnly`** cookie `teamflow_refresh` (hashed at rest). **No OAuth** in code. Username/password credentials (no email magic-link in codebase).
- **Generation**: Access: `jwt.sign` in `generateAccessToken`. Refresh: `randomBytes(40).toString("hex")`; stored hashed via `hashToken`.
- **Storage**: Access token in **memory** on client (`client/src/lib/api.ts` — `accessToken` module variable). Refresh in cookie; DB table `refresh_tokens` holds `tokenHash`, `expiresAt`, `userId`.
- **Validation**: REST: `jwt.verify` in `authenticateToken`. Socket: same secret check in `server/socket.ts`. Refresh: `validateRefreshToken` matches hash and deletes row on use (rotation).

**Roles** (from `shared/schema.ts` — `userRoles`): `owner`, `admin`, `member`.

Examples of authorization:

- **`requireRole("owner", "admin")`**: delete project; invite member; delete member (with extra rules in handler).
- **`requireRole("owner")`**: patch organization name; change member roles; `/api/metrics`.
- **`member`**: can use most CRUD where not wrapped by `requireRole`, subject to org scoping checks.

### Middleware signatures (names + params only)

- **`authenticateToken(req: Request, res: Response, next: NextFunction): void`**
- **`requireRole(...roles: Array<"owner" | "admin" | "member">): (req: Request, res: Response, next: NextFunction) => void`**

---

## 7. Database design

### Engine

- **PostgreSQL** via `pg` `Pool` and Drizzle (`server/db.ts`).

### Tables / models (`shared/schema.ts`)

| Table | Key fields |
|-------|-------------|
| **organizations** | `id` (serial PK), `name`, `createdAt`, `updatedAt` |
| **users** | `id`, `username` (unique), `password`, `role` (`owner`/`admin`/`member`), `organizationId` (FK cascade), `deletedAt`, timestamps |
| **projects** | `id`, `name`, `description?`, `organizationId` (FK), `deletedAt`, timestamps |
| **tasks** | `id`, `title`, `description?`, `status` (`todo`/`in_progress`/`done`), `priority` (`low`/`medium`/`high`), `projectId` (FK), `organizationId` (FK), `assigneeId?` (FK → users, **onDelete set null**), `deletedAt`, timestamps |
| **refresh_tokens** | `id`, `userId` (FK cascade), `tokenHash`, `expiresAt`, `createdAt` |

### Relationships (conceptual)

- **Organization → users**: one-to-many (`users.organizationId`).
- **Organization → projects / tasks**: one-to-many (`organizationId` on both).
- **Project → tasks**: one-to-many (`tasks.projectId`).
- **User → assigned tasks**: one-to-many optional (`tasks.assigneeId`).

### Indexing (`shared/schema.ts`)

- **`users`**: `idx_users_organization_id`, `idx_users_username`
- **`projects`**: `idx_projects_organization_id`
- **`tasks`**: `idx_tasks_project_id`, `idx_tasks_organization_id`, `idx_tasks_assignee_id`, `idx_tasks_status`
- **`refresh_tokens`**: `idx_refresh_tokens_user_id`, `idx_refresh_tokens_hash`

### Migrations / seeding

- **Migrations folder**: `drizzle.config.ts` sets `out: "./migrations"`; **no migration files** may be present in the repo; typical workflow here is **`npm run db:push`** (schema push).
- **Seeding**: Optional dev seed when `ENABLE_DEV_SEED=true` (`server/routes.ts` — `seedDatabase`).

---

## 8. Error handling and logging

- **Global error handler**: Yes — `server/index.ts`, Express 4-argument middleware after routes. Uses `err.status || err.statusCode || 500`, logs with `logger.error`, returns JSON; **hides** 500 message detail in production.
- **Client error shape (global)**: `{ error: string, code: "INTERNAL_ERROR", stack?: string }` (stack only when not production).
- **Route-level errors**: Often `{ error, code }` without a shared class hierarchy; Zod failures → `400` with first error message and `VALIDATION_ERROR`.
- **Logging library**: **Winston** (`server/logger.ts`) — JSON + console; file transports `logs/error.log`, `logs/combined.log` (silent in `NODE_ENV=test`).
- **What is logged**: Startup validation, API requests (path, status, duration, IP, UA), warnings on `status >= 400`, errors with stack, auth events (register, login success/failure), slow requests, Socket connect debug, readiness failures, shutdown.
- **Custom error classes**: **No** dedicated HTTP error classes; React **`ErrorBoundary`** exists in `client/src/components/error-boundary.tsx` for UI errors only.

---

## 9. Security measures

| Measure | Implementation |
|---------|------------------|
| **Password hashing** | scrypt + salt; `timingSafeEqual` compare (`server/routes.ts`) |
| **JWT secrets** | Min 32 chars enforced in `validateEnv` and `getAccessSecret` |
| **Refresh token storage** | SHA-256 hash only in DB; rotation on use; periodic `cleanupExpiredTokens` |
| **Cookie flags** | `httpOnly`, `sameSite: "strict"`, `secure` in production, path `/api/auth` |
| **CORS** | Allowlist via `ALLOWED_ORIGINS` or dev defaults; `credentials: true` |
| **Rate limiting** | Global `/api/`, strict auth routes, refresh limit (`server/middleware/security.ts`) |
| **Helmet / headers** | CSP and related directives; `crossOriginEmbedderPolicy: false` |
| **Body size limits** | `express.json` / `urlencoded` **1mb** (`server/index.ts`) |
| **Input validation** | Zod + `drizzle-zod` schemas; coerced numeric params |
| **SQL injection** | Drizzle parameterized queries |
| **Multi-tenant enforcement** | Org checks on project/task/member operations |
| **RBAC** | `requireRole` + handler-level rules (owner vs admin) |
| **Soft delete** | Reduces accidental data exposure in “deleted” members/projects |
| **Trust proxy** | Enabled in production for correct IP behind proxies |
| **Client token handling** | Access token in **memory** (not `localStorage`) — `client/src/lib/api.ts` |

**Note**: `JWT_REFRESH_SECRET` is **required** by `server/env.ts`, and `getRefreshSecret()` exists in `server/middleware/auth.ts` but is **not called** by the current refresh-token flow (opaque tokens + DB hash only). You may treat it as reserved for future HMAC-style refresh tokens or remove/consolidate in a follow-up.

---

## 10. Project structure (tree ~2–3 levels)

```
TeamFlow/
├── client/                 # React SPA
│   ├── public/             # Static assets (e.g. favicon)
│   └── src/
│       ├── components/     # UI (layout-shell, shadcn ui/, error-boundary)
│       ├── hooks/          # use-auth, use-socket, use-* data hooks
│       ├── lib/            # api.ts (token, authFetch), utils, queryClient
│       ├── pages/          # dashboard, projects, tasks, team, settings, auth, not-found
│       ├── App.tsx         # Routes, protected layout, socket context
│       └── main.tsx
├── config/                 # vite.config, vitest configs, drizzle.config
├── server/                 # Express + Socket.io entry and logic
│   ├── index.ts            # App bootstrap, middleware order, error handler
│   ├── routes.ts           # HTTP route registration (no separate controllers)
│   ├── storage.ts          # Drizzle-backed IStorage implementation
│   ├── db.ts               # pg Pool + drizzle instance
│   ├── socket.ts           # Socket.io setup and org emit helpers
│   ├── logger.ts           # Winston
│   ├── env.ts              # Zod env validation
│   ├── static.ts           # Production static file serving
│   ├── vite.ts             # Dev Vite middleware
│   └── middleware/
│       ├── auth.ts         # JWT, refresh cookie, requireRole, cleanup interval
│       ├── security.ts     # cors, helmet, rate limits
│       ├── health.ts       # health/ready/live
│       └── performance.ts  # compression, metrics
├── shared/
│   ├── schema.ts           # Drizzle tables, relations, Zod insert schemas
│   └── routes.ts           # API path + Zod contracts for client/server alignment
├── script/
│   └── build.ts            # Production Vite + esbuild bundle
├── tests/
│   ├── setup.client.ts
│   └── setup.server.ts
├── package.json            # Scripts and dependency versions
├── render.yaml             # Render deployment blueprint
├── .env.example            # Environment template
├── tailwind.config.ts
├── postcss.config.js
└── README.md               # Human-oriented overview and API summary
```

**Purpose summary**

| Path | Purpose |
|------|---------|
| `client/` | User-facing SPA; consumes `/api/*` and Socket.io. |
| `server/` | Single Node process: API, websockets, static or Vite in dev. |
| `shared/` | Single source of truth for DB shape and typed API definitions. |
| `config/` | Tooling configs kept out of runtime source roots. |
| `script/` | Custom production build orchestration. |
| `tests/` | Shared Vitest setup for server vs client configs. |

---

Add or adjust `docker-compose.yml` locally if you use Postgres via Docker (as the README suggests); PostgreSQL versioning and container scripts belong in docs next to that file when it exists in the repo.
