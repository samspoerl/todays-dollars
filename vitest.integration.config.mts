import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// The FRED API key comes from the developer's `.env` (and from repository
// secrets in CI). Loaded explicitly and **before** the hardcoded values below,
// so that anything this file pins still wins.
//
// This matters more here than it looks: `.env` in this repository holds the
// **development Neon** `DATABASE_URL` and `DIRECT_URL` (production is a
// separate database, and its credentials are not in this repository), and this
// suite TRUNCATEs every table between tests. The protection is not the file
// boundary — it is
// that `Object.assign` below overwrites whatever dotenv set, that `testEnv`
// forwards only the FRED name to the workers, and that `support/guard.ts`
// refuses to run against anything but the local container. Three checks, none
// of which depend on which file the values came from.
loadEnv({ path: '.env', quiet: true })

// The local Docker Postgres started by `npm run db:test:up` (the `db-test`
// service in docker-compose.yml), and the single source of truth for how the
// integration suite connects. These are deliberately hardcoded rather than read
// from a `.env` file: they're the fixed, non-secret credentials of a throwaway
// container, and a suite that TRUNCATEs between tests must not be able to
// inherit a connection string from the ambient shell.
// `support/guard.ts` is the second check and `support/db.ts` the third.
const DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/todays_dollars_test?schema=public'

const env = {
  DATABASE_URL,
  // `prisma.config.ts` reads DIRECT_URL for `migrate deploy`.
  DIRECT_URL: DATABASE_URL,
  // Pinned, and load-bearing in a way the finance-demo equivalent is not:
  // `src/lib/prisma.ts` selects `PrismaNeon` unless this is exactly `'pg'`.
  // Without it the suite would try to reach a plain Docker Postgres over the
  // Neon serverless driver — which fails, but fails confusingly, and an
  // ambient value could just as easily point a working driver somewhere real.
  // `support/guard.ts` re-checks it.
  DATABASE_ADAPTER: 'pg',
}

// `test.env` below covers the worker processes that run the tests. The global
// setup runs in *this* process, where it shells out to `prisma migrate deploy`,
// so it needs the same values on process.env. Assigning wins over the shell for
// the same reason `override: true` would: no ambient DATABASE_URL may leak in.
// It also wins over `prisma.config.ts`'s `import 'dotenv/config'`, because
// dotenv leaves an already-set variable alone.
Object.assign(process.env, env)

// `src/lib/fred/fred-api.ts` reads `FRED_API_KEY` at module scope, so that is
// the name the workers must see. A dedicated test key is preferred and read
// from `FRED_TEST_API_KEY`, so a suite making real requests cannot spend the
// rate limit of the key the deployed app uses — the limit is per key — but a
// developer with only one key still gets a running suite. Forwarded by name and
// only when present: a missing key leaves the FRED
// specs to skip via `hasFredCredentials()` instead of failing, which is what a
// fork or Dependabot PR gets, since neither can read repository secrets.
//
// Note what is NOT forwarded: DATABASE_URL, DIRECT_URL and DATABASE_ADAPTER
// reach the workers only as the hardcoded values in `env` above. There is no
// path by which a worker sees the Neon URL that `loadEnv` just read.
const fredApiKey = process.env.FRED_TEST_API_KEY || process.env.FRED_API_KEY

const testEnv: Record<string, string> = { ...env }
if (fredApiKey) {
  testEnv.FRED_API_KEY = fredApiKey
}

export default defineConfig({
  resolve: {
    alias: {
      // tsconfig.json declares one path per top-level directory; this single
      // `@` → `src` alias is a deliberate superset, matching vitest.config.mts.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Suites are split by what they need to run, not by what they cover: these
    // require Postgres, so they sit under `test/integration/` and the unit
    // config's `test/unit/**` glob can never pick them up. Specs below this
    // mirror the `src/` path of what they cover, same as the unit suite.
    include: ['test/integration/**/*.test.ts'],
    setupFiles: ['./test/integration/support/setup.ts'],
    globalSetup: ['./test/integration/support/global-setup.ts'],
    // One shared database, truncated between tests, so files can't run in
    // parallel — they would race on the same rows. It also keeps the FRED
    // request rate predictable: see the budget in `support/fred.ts`.
    fileParallelism: false,
    // Generous next to the unit suite's default: the first test pays for the
    // connection, CI's Postgres is a cold container, and the FRED specs make
    // real round trips that return the full series (~950 observations).
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: testEnv,
  },
})
