# Operations

Production and ops notes for the Clinic Management System. SMS/email delivery (WhatsApp reminders, transactional mail, etc.) is **out of scope** for this app — reminders are stored in the database only.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth secret (long random string) |
| `AUTH_URL` | Recommended | Public app URL (e.g. `https://clinic.example.com`) |
| `ADMIN_EMAIL` | Optional | Admin seed email (default `admin@clinic.local`) |
| `ADMIN_PASSWORD` | **Required in production** | Admin password for `npm run db:create-admin` |
| `ADMIN_NAME` | Optional | Admin display name |
| `ADMIN_PHONE` | Optional | Admin phone |
| `FORCE_ADMIN_RESET` | Optional | Set to `1` to overwrite an existing admin on seed |
| `NODE_ENV` | Set by runtime | `production` enables stricter admin-seed rules |

Copy `.env.example` to `.env` for local development. Never commit real secrets.

## Database migrations (production)

Use deploy migrations — do **not** run `prisma migrate dev` in production:

```bash
npx prisma migrate deploy
```

`migrate deploy` applies pending migrations from `prisma/migrations` without resetting data or prompting for a new migration name.

Local development still uses:

```bash
npm run db:migrate   # prisma migrate dev
```

## Backup and restore (PostgreSQL)

### Backup

```bash
pg_dump -Fc -f clinic_backup.dump "$DATABASE_URL"
```

Or with discrete connection flags:

```bash
pg_dump -h HOST -U USER -d DBNAME -Fc -f clinic_backup.dump
```

### Restore

```bash
pg_restore --clean --if-exists -d "$DATABASE_URL" clinic_backup.dump
```

Prefer restoring into an empty or staging database first. After restore, confirm schema matches by running `npx prisma migrate status`.

## Seed safety (`db:create-admin`)

`npm run db:create-admin` creates or updates the admin user.

- **Production (`NODE_ENV=production`)**: `ADMIN_PASSWORD` **must** be set. The script refuses to use the local development fallback password.
- **Existing admin**: By default the script does **not** change password/role/name if the email already exists. Set `FORCE_ADMIN_RESET=1` to overwrite.
- **Local only**: If `ADMIN_PASSWORD` is unset outside production, a known insecure fallback is used and a warning is printed.

Demo seed (`npm run db:seed:demo`) is for development only — do not run against production data.

## CI and tests

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test` (Vitest unit tests — no DB)
5. `npx prisma validate`
6. `npm run build` (with dummy `DATABASE_URL` / `AUTH_SECRET`)

E2E smoke tests are optional and need a running server:

```bash
npm run build && npm run start
# other terminal:
npx playwright install chromium   # once
npm run test:e2e
```

Set `PLAYWRIGHT_BASE_URL` if the app is not on `http://127.0.0.1:3000`.
