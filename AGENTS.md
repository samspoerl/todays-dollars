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
type ServerResponse<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }
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

## Component Standards

### Placement hierarchy

1. **`src/components/ui/`** — shadcn primitives only
2. **`src/components/`** — shared components used across multiple pages
3. **`src/app/ui/`** — components used only by the home page (this project's only route)

### Structure

- Props interface at the top of the file
- Named exports (not default for components)
- Order within a component:
  1. Hooks (state, refs, custom hooks, effects)
  2. Utils (computed values, helpers)
  3. Event handlers (user interactions)
  4. Render (return)
- Use inline comments to delineate sections:
  ```tsx
  // HOOKS
  // UTILS
  // EVENT HANDLERS
  ```

### Function declarations

Prefer function declarations over arrow functions for named handlers:

```tsx
// ✅
async function handleSubmit(values: FormValues) { ... }

// ❌
const handleSubmit = async (values: FormValues) => { ... }
```

Keep arrow functions for inline callbacks and anonymous functions.

### Icons

Always use Lucide icons (`lucide-react`). Always suffix the import name with `Icon`:

```tsx
import { PlayIcon, PencilIcon } from 'lucide-react'
```

## TypeScript Conventions

### DTO types

Types live in `src/lib/types.ts`. Build them from generated Prisma types:

```ts
type AuditFields = 'createdAt' | 'updatedAt'

export type ObservationDto = Omit<Observation, AuditFields | 'fredDate'>
export type ObservationCreateDto = Omit<Observation, AuditFields | 'id'>
```

- Suffix resource types with `Dto`
- Define a shared `AuditFields` type alias and omit it from all Dtos
- Omit `id` from create types

### Prisma select schemas

Define select objects in `src/lib/select-schemas.ts` and reuse them in Prisma queries:

```ts
export const observationSelect = {
  id: true,
  inflationMeasure: true,
  year: true,
  month: true,
  value: true,
}
```

## Code Style

- **Prettier:** `semi: false`, `singleQuote: true`, `printWidth: 80`, `trailingComma: 'es5'`
- **Imports:** Non-relative path aliases (`@/lib/...`, `@/components/...`)
- **Radix UI:** Do not import from `radix-ui` directly; use wrappers in `src/components/ui/`

## Scripts

All scripts are run via `npm run <script>`.

**Dev server**

| Script | Description |
|--------|-------------|
| `dev` | Start the Next.js dev server |
| `dev-https` | Start with experimental HTTPS (useful for OAuth testing) |
| `build` | Production build |
| `start` | Start the production server |

**Code quality**

| Script | Description |
|--------|-------------|
| `lint` | Run ESLint |
| `typecheck` | Type-check without emitting (`tsc --noEmit`) |
| `format` | Auto-format with Prettier |
| `format:check` | Check formatting without writing |

**Database & setup**

| Script | Description |
|--------|-------------|
| `agent:setup` | One-shot setup: copy env, start DB, run migrations, generate client |
| `db:up` | Start the Postgres container via Docker Compose |
| `db:down` | Stop and remove the Postgres container (destructive — drops volumes) |
| `db:reset` | `db:down` + `db:up` + `prisma:bootstrap` — full wipe and restart |
| `copy-env` | Safely copy `.env.docker` → `.env` without overwriting an existing file |
| `prisma:deploy` | Apply pending migrations |
| `prisma:generate` | Regenerate the Prisma client |
| `prisma:bootstrap` | `deploy` + `generate` in sequence |

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
