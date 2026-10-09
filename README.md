# Clinic Management System

A single-clinic **Next.js** app: public website (appointments, contact) and an admin portal for reception, doctors, and clinic settings.

**Repository:** [github.com/sahildev12/clinic-management-system](https://github.com/sahildev12/clinic-management-system)

## Stack

- **Next.js 16** (App Router)
- **Prisma 7** + PostgreSQL
- **NextAuth** (credentials, JWT)
- **shadcn/ui** + Tailwind CSS 4

## Features

- Patient records, appointments (calendar day/week/month/list), payments, reminders
- Inventory (medicines) and prescriptions
- Doctor logins scoped to their schedule and patients; staff with module-based access
- Public booking and contact forms
- JSON admin APIs suitable for a future mobile client

## Documentation

| Doc | Contents |
|-----|----------|
| [DESIGN.md](./DESIGN.md) | Brand tokens, admin/public UI rules |
| [docs/architecture.md](./docs/architecture.md) | Roles, single-clinic model, data flow |
| [docs/operations.md](./docs/operations.md) | Migrations, backups, env vars, seeding |

## Prerequisites

- Node.js 20+
- PostgreSQL (local or hosted)

## Quick start

```bash
git clone https://github.com/sahildev12/clinic-management-system.git
cd clinic-management-system
npm install
```

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `AUTH_SECRET`.
2. Create the database: `npm run db:create`
3. Run migrations: `npm run db:migrate`
4. Create the first admin: `npm run db:create-admin`
5. Start dev server: `npm run dev`

Open [http://localhost:3000](http://localhost:3000). Admin login: `/login`.

**Default admin (local dev only):** `admin@clinic.local` / `Admin@12345`  
Set `ADMIN_PASSWORD` in `.env`. In production, `ADMIN_PASSWORD` is required. Re-running `db:create-admin` does not reset an existing password unless `FORCE_ADMIN_RESET=1`.

Optional demo data:

```bash
npm run db:seed:demo
npm run db:seed:appointments
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and run |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright (requires running app) |

## Routes

| Area | Path |
|------|------|
| Public site | `/`, `/about`, `/services`, `/appointment`, `/contact` |
| Admin | `/admin/*` |
| Admin login | `/login` |
| Doctor login | `/doctor/login` |
| Staff login | `/team/login` |

## Roles

| Role | Login | Access |
|------|-------|--------|
| Admin | `/login` | Full clinic + settings + team |
| Doctor | `/doctor/login` | Own appointments, patients, notes, records |
| Staff | `/team/login` | Modules assigned by admin (reception, etc.) |

Configure clinic name, branding, and hours under **Admin → Settings**.

## Environment variables

See `.env.example`. Never commit `.env`. Required for production:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL` (public URL of the app)
- `ADMIN_PASSWORD` (when seeding or resetting admin in production)

## CI

GitHub Actions runs lint, typecheck, unit tests, `prisma validate`, and build on push and pull requests (see `.github/workflows`).

## License

Private project — all rights reserved unless otherwise specified by the repository owner.
