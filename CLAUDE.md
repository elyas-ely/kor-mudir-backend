# Afghan Bazar — Backend

## Stack

- **Runtime**: Bun (native TypeScript, no build step)
- **Framework**: Hono
- **Database**: PostgreSQL via Drizzle ORM
- **Validation**: Zod + `drizzle-zod`
- **Auth**: better-auth (Google OAuth only — no email/password, no magic-link)
- **Linter**: Biome (`@biomejs/biome`)

## Architecture: Controller → Service → DB

```
src/routes/        → Hono router, mounts middleware and controllers
src/controllers/   → Parse request, validate with Zod, call service, return JSON
src/services/      → All business logic and Drizzle queries
src/db/schema/     → Drizzle table definitions
src/db/validation.ts → Zod schemas (built from drizzle-zod + custom)
src/lib/auth.ts    → better-auth config
src/middlewares/   → authMiddleware (required) + optionalAuth
```

Controllers must stay thin. No query logic in controllers — that belongs in services.

## Auth

better-auth with Google OAuth only. Three required tables: `users`, `session`, `account`.

- The `verification` table has been removed — do not add it back unless adding email-based flows.
- Authentication endpoint: `POST /api/v1/auth/google` (accepts `{ idToken: string }`)
- Sessions use bearer tokens. Protect routes with `authMiddleware`, use `optionalAuth` for public routes that change behavior when logged in.
- User and session are available in Hono context as `c.get('user')` and `c.get('session')` after middleware.

## Validation

- All POST/PUT/PATCH payloads must be validated with Zod in `src/db/validation.ts`.
- Use `drizzle-zod`'s `createInsertSchema` / `createSelectSchema` as base, then extend with `.pick()`, `.omit()`, or `.extend()` for endpoint-specific rules.
- Auth-specific schemas live in `src/db/validation.ts` (e.g. `googleAuthSchema`).


## Response Shape

Always return:
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "..." }
```

Use `ApiError` from `src/utils/ApiError.ts` for structured error throwing in services.

## Out of scope for Claude

Never run or generate database migrations (`drizzle-kit generate`, `drizzle-kit migrate`, `drizzle-kit push`, `drizzle-kit studio`, or the `db:generate`/`db:migrate`/`db:studio` package scripts). The user runs these manually against their own Postgres instance.
