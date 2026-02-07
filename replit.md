# TeamFlow - Multi-Tenant SaaS Platform

## Overview

TeamFlow is a multi-tenant SaaS platform for team and project management. Organizations can register, manage teams, create projects, and track tasks. The app follows a modular monolith architecture with a React frontend and Express backend, using PostgreSQL for data storage. It's designed to simulate a production-grade startup backend with multi-tenancy, subscription tiers, and role-based access.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Key pages**: Auth (login/signup), Dashboard, Projects, Tasks (with Kanban board view), Team management
- **Layout**: Sidebar navigation shell (`LayoutShell` component) wrapping authenticated pages

### Backend
- **Framework**: Express 5 on Node.js with TypeScript (run via `tsx`)
- **Authentication**: Session-based auth using Passport.js with Local Strategy, passwords hashed with scrypt
- **Session Store**: MemoryStore (development); connect-pg-simple available for production
- **API Design**: RESTful API under `/api/` prefix with typed route definitions in `shared/routes.ts`
- **Shared Contract**: Zod schemas in `shared/schema.ts` and `shared/routes.ts` provide a typed contract between frontend and backend — both sides validate using the same schemas
- **Build**: Custom build script using esbuild for server and Vite for client; production output goes to `dist/`

### Database
- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for automatic Zod schema generation from table definitions
- **Schema Push**: Use `npm run db:push` (drizzle-kit push) to sync schema to database — no migration files needed for development
- **Tables**:
  - `organizations` — multi-tenant root entity with subscription tiers (free/pro/enterprise) and optional Stripe customer ID
  - `users` — belong to an organization, have roles (owner/admin/member)
  - `projects` — belong to an organization
  - `tasks` — belong to a project and organization, optionally assigned to a user, with status (todo/in_progress/done)
- **Storage Layer**: `server/storage.ts` implements `IStorage` interface with `DatabaseStorage` class, abstracting all DB operations

### Multi-Tenancy
- Data isolation enforced at the application/query level — all organizations share the same database
- Organization ID is used to scope queries for projects, tasks, and team members
- Subscription tier stored on the organization controls feature access

### Authentication Flow
- Session-based with httpOnly cookies (`credentials: "include"` on fetch calls)
- Signup creates both a user and an organization
- Protected routes on the frontend redirect to `/auth/login` when not authenticated
- Backend validates sessions via Passport middleware

### Development vs Production
- **Dev**: `npm run dev` — runs tsx with Vite dev server middleware for HMR
- **Build**: `npm run build` — Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Production**: `npm start` — serves static files from `dist/public` with Express

## External Dependencies

- **PostgreSQL**: Required. Must be provisioned and `DATABASE_URL` set in environment
- **Stripe**: Schema includes `stripeCustomerId` on organizations; Stripe package is in the build allowlist but integration appears to be in early stages
- **Replit Plugins**: Vite plugins for runtime error overlay, cartographer, and dev banner (only active in Replit development environment)
- **No external auth providers**: Authentication is fully self-contained using Passport Local Strategy
- **Session Secret**: Set via `SESSION_SECRET` environment variable (falls back to `dev_secret_key` in development)