<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Today's Dollars

A public inflation calculator that answers the question: "How much is that in today's dollars?" Users enter a dollar amount and year; the app adjusts it to present-day dollars using CPI or PCE data from the FRED API.

## Stack

- **Framework:** Next.js (App Router) with React 19
- **Language:** TypeScript (strict)
- **Database:** Neon Serverless Postgres via Prisma ORM
- **Authentication:** None — this is a fully public app
- **UI:** Radix UI primitives + shadcn/ui component patterns + Tailwind CSS v4
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts v3 (via shadcn chart component)
- **Deployment:** Vercel

## Project Structure

```
prisma/                  # Prisma schema and migrations
src/
  app/                   # Next.js App Router
    ui/                  # App-level UI components (AppHeader, AppFooter, AppContent,
    |                    #   Chart, InputForm, ThemeToggle, GitHubLink)
    about/               # About page
    page.tsx             # Home page (inflation calculator)
    layout.tsx           # Root layout
    globals.css          # Global styles
  components/
    ui/                  # shadcn/ui primitives
    PageWrapper.tsx      # Common page layout wrapper
    typography.tsx       # Typography components (H1, H2, Body, etc.)
  lib/
    actions/             # Server Actions
      calculate.ts       # getInflationAdjustedAmounts — main calculation action
    fred/                # FRED API integration
      fred-api.ts        # callFred — fetches inflation series from FRED
      fred-types.ts      # FRED response types
    inflation-data.ts    # Reads/writes inflation observations to the database
    logs.ts              # Telemetry logging (logTelemetry)
    prisma.ts            # Shared Prisma client (pooled)
    select-schemas.ts    # Prisma select schemas
    types.ts             # Shared types and Zod schemas
    utils.ts             # Utility functions (formatUSD, cn, etc.)
  generated/prisma/      # Generated Prisma client (do not edit)
test/
  unit/                  # Pure functions + the integration harness's own guards
  integration/           # Needs Postgres and the FRED API
    support/             # guard, db, factories, fred helpers
```

## Environment

- **OS:** Windows 11
- **Shell:** PowerShell v7

## Architecture

The app has a single main page. The home page (`page.tsx`) is a Client Component that holds all state. It renders `InputForm` (React Hook Form) and passes results to a `Chart` and an output display.

Mutations flow: Client Component → Server Action → Prisma / FRED API.

### Server Actions

Prefer Server Actions over API route handlers. Live in `src/lib/actions/[resource].ts`. They are plain `'use server'` functions that return `ServerResponse<T>`:

```ts
type ServerResponse<T> = { ok: true; data: T } | { ok: false; message: string }
```

Defined in `src/lib/types.ts`. There are no authenticated wrappers — all actions are public.

### Data Flow

1. `callFred` fetches raw monthly percentage-change observations from the FRED API
2. `inflation-data.ts` upserts those observations into Postgres and reads them back for a given start year
3. `calculate.ts` (`getInflationAdjustedAmounts`) calls the above, compounds the monthly changes, and returns inflation-adjusted values per month
4. Telemetry is logged via `next/server`'s `after()` so it doesn't block the response

### Database Models

- **`Observation`** — one row per (inflationMeasure, year, month); stores the raw FRED percentage-change value
- **`Metadata`** — tracks the last fetch date and total observation count per measure
- **`Telemetry`** — records per-request duration metrics

## Prisma

Schema in `prisma/schema.prisma`. Shared client at `src/lib/prisma.ts` (pooled connection; CLI commands use non-pooled).

## UI Primitives

Always prefer a shadcn primitive over a custom implementation — run `shadcn add [component]` and/or update `globals.css`. Do not modify shadcn primitives directly.

Currently installed: button, card, chart, form, input, label, navigation-menu, radio-group, sonner, tooltip

Custom components are acceptable only when a shadcn primitive is genuinely insufficient or doesn't exist.

## Testing

```bash
npm run ci               # generate + typecheck + test + lint + format:check
npm test                 # unit suite
npm run db:test:up       # local Postgres for the integration suite (port 5433)
npm run test:integration # integration suite (needs db:test:up)
```

Suites are split by **what they need to run**, not by what they cover. Unit
specs need nothing; integration specs need Postgres and a FRED key. The unit
config's `test/unit/**` glob can never pick up an integration spec. Spec paths
mirror the `src/` path of what they cover.

### Hard constraints

- **The integration suite TRUNCATEs.** `.env` holds the **development Neon**
  credentials — production is a separate database and its credentials are not in
  this repository — so the stake is not irreplaceable data; it is that wiping
  the shared development database mid-session is a confusing, silent failure.
  Three independent guards keep the suite on the local container, and they
  reject _any_ non-local target rather than enumerating known ones:
  `vitest.integration.config.mts` hardcodes the connection string,
  `support/guard.ts` re-checks the resolved values before `migrate deploy` and
  before every reset, and `support/db.ts` asks the connected server who it is
  (`current_database()`, and `neon.tenant_id` as the anti-target). The database
  name `todays_dollars_test` is load-bearing in `docker-compose.yml`,
  `support/guard.ts`, `vitest.integration.config.mts`, and `ci.yml`.
- **`DATABASE_ADAPTER` must be `pg` for the integration suite.**
  `src/lib/prisma.ts` picks `PrismaNeon` for any other value, and the Neon
  driver speaks HTTP to Neon's endpoint rather than Postgres to a host — so a
  wrong value here is how the URL checks could pass while the client still
  reached for Neon. Pinned in the config and asserted in the guard.
- **Never add a FRED request without raising the budget deliberately.** FRED
  allows 120 requests/minute per key and the suite spends 4 per run (2 in
  `fred-api.test.ts`, 2 in `inflation-data.test.ts`). `countFredRequest()` in
  `support/fred.ts` fails loudly past the cap, and the budget table in that
  file is the record of what is spent where.
- **FRED error branches belong in the unit suite, not the integration suite.**
  Provoking a real 429 means exceeding the limit the harness exists to
  respect, so `test/unit/lib/fred/fred-api.test.ts` stubs `fetch` and covers
  the branching at no request cost. The integration spec spends its two
  requests on the one thing a stub cannot establish: that FRED still returns
  the shape the code reads.
- **Missing credentials must skip, not fail.** Forks and Dependabot PRs cannot
  read repository secrets, and an unset secret expands to `''`. FRED specs gate
  on `describe.skipIf(!hasFredCredentials())`; the database specs still run.

### Known hazards

- **A `.` in a FRED series is not only the first observation.** `pch` units
  have no change to report for the first month, but FRED also uses `.` for
  genuine mid-series gaps — CPI currently carries three (1947-01, plus 2025-10
  and 2025-11). `inflation-data.ts` maps every `.` to `0`, so those months
  compound as **0% inflation** rather than being interpolated or skipped. That
  understates cumulative inflation across any range spanning them, and it does
  not error. The integration spec asserts the contract that actually matters —
  that `.` is the _only_ non-numeric token FRED sends — because any other
  (`''`, `NA`, `null`) would become `NaN` and poison every later month.
- **`fetchAndCacheInflationData` is not transactional.** It `deleteMany`s a
  measure's observations and then `createMany`s the replacements, with no
  try/catch. A failure between the two leaves the cache empty rather than
  stale. (`getCachedObservations` does have a try/catch; the write path does
  not.)
- **The compounding in `calculate.ts` has no test.** It is the most valuable
  logic in the app and is unreachable from either suite: it is inline in a
  `'use server'` action that calls `after()` from `next/server`, which throws
  outside a request scope. Same for the FRED→DTO transform and the staleness
  math inlined in `inflation-data.ts`. Extracting them is the next piece of
  work; until then the integration suite covers them only indirectly, through
  a real database and real FRED data.
- **`inputsSchema`'s upper bound is `new Date().getFullYear()`**, computed at
  module scope. Specs derive their expectations the same way rather than
  hardcoding a year, so they cannot catch a mistake in how the bound is
  _derived_ — only in how it is applied.

## Code Style

- **Prettier:** `semi: false`, `singleQuote: true`, `printWidth: 80`, `trailingComma: 'es5'`
- **Imports:** Non-relative path aliases (`@/lib/...`, `@/components/...`)
- **Radix UI:** Do not import from `radix-ui` directly; use wrappers in `src/components/ui/`

## Scripts

All scripts are run via `npm run <script>`.

**Dev server**

| Script      | Description                                              |
| ----------- | -------------------------------------------------------- |
| `dev`       | Start the Next.js dev server                             |
| `dev-https` | Start with experimental HTTPS (useful for OAuth testing) |
| `build`     | Production build                                         |
| `start`     | Start the production server                              |

**Code quality**

| Script             | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `ci`               | `generate` + `typecheck` + `test` + `lint` + `format:check` |
| `lint`             | Run ESLint                                                  |
| `typecheck`        | Type-check without emitting (`tsc --noEmit`)                |
| `format`           | Auto-format with Prettier                                   |
| `format:check`     | Check formatting without writing                            |
| `generate`         | `prisma generate` + `next typegen`                          |
| `test`             | Unit suite (`test/unit/**`)                                 |
| `test:watch`       | Unit suite in watch mode                                    |
| `test:integration` | Integration suite (needs `db:test:up`)                      |

`npm run ci` is what the `checks` job in CI runs. Run it before considering work
done. It deliberately excludes `test:integration`, which needs a container.

**Database & setup**

| Script             | Description                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| `agent:setup`      | One-shot setup: copy env, start DB, run migrations, generate client     |
| `db:up`            | Start the dev Postgres container via Docker Compose                     |
| `db:down`          | Stop and remove the Postgres containers (destructive — drops volumes)   |
| `db:reset`         | `db:down` + `db:up` + `prisma:bootstrap` — full wipe and restart        |
| `db:test:up`       | Start the **test** Postgres container (port 5433)                       |
| `db:test:down`     | Stop and remove the test Postgres container                             |
| `copy-env`         | Safely copy `.env.docker` → `.env` without overwriting an existing file |
| `prisma:deploy`    | Apply pending migrations                                                |
| `prisma:generate`  | Regenerate the Prisma client                                            |
| `prisma:bootstrap` | `deploy` + `generate` in sequence                                       |

## Git Conventions

Use **Conventional Commits** (<https://www.conventionalcommits.org>) for all commits, branch names, and PR titles.

**Commit messages** - `<type>(<scope>): <description>`

- Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`
- Scope is optional but recommended (e.g., `ui`, `chart`, `fred`, `db`)
- Examples: `feat(chart): add PCE toggle to chart`, `fix(fred): handle empty observation response`
- Use `BREAKING CHANGE:` footer and append `!` after the type/scope for breaking changes
- ALWAYS output commit messages in a code fence when asked for one

**Branch names** - `<type>/<issue-id>-<short-description>`

- Examples: `feat/123-add-pce-chart`, `fix/456-fred-error-handling`, `chore/update-dependencies`

**PR titles** - same format as a commit subject: `<type>(<scope>): <description>`
