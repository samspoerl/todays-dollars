/**
 * Hard safety guard for the integration suite.
 *
 * These tests TRUNCATE every table between cases, so pointing them at anything
 * but the local Docker Postgres is destructive — and `.env` in this repository
 * holds the **development Neon** `DATABASE_URL` and `DIRECT_URL`, sitting in
 * the ambient environment. Production is a separate database and its
 * credentials are not in this repository, so the stake here is not
 * irreplaceable data.
 *
 * The stake is that wiping the shared development database mid-session is a
 * confusing, silent failure: the app keeps running and simply has no data any
 * more. `observations` and `metadata` are a cache of FRED and would refill on
 * the next request; `telemetry` has no upstream to re-fetch from, so whatever
 * development history it held is gone.
 *
 * The guard is written to reject *any* non-local target rather than to
 * enumerate the ones it knows about, so it holds regardless of which Neon
 * database happens to be in `.env`.
 *
 * `vitest.integration.config.mts` already pins the connection strings, but the
 * config can be edited, so this refuses to run unless the resolved values are
 * unmistakably the throwaway container.
 *
 * Both URLs are checked, not just `DATABASE_URL`: the queries under test connect
 * with that one, but `prisma.config.ts` runs `migrate deploy` against
 * `DIRECT_URL`, which is just as capable of pointing somewhere real.
 *
 * The host check alone is not enough — the `db` service in docker-compose.yml
 * is also on localhost — so the database name must match too, and the compose
 * file names the test service's database `todays_dollars_test` for exactly that
 * reason. See `assertConnectedDatabaseIsLocal` in `./db.ts` for the third
 * check, which interrogates the live connection rather than the string that
 * opened it.
 */

const LOCAL_HOSTS = ['@localhost:', '@127.0.0.1:']
export const EXPECTED_DATABASE = 'todays_dollars_test'

function assertLocalUrl(name: string, url: string): void {
  const isLocalHost = LOCAL_HOSTS.some((host) => url.includes(host))
  const isTargetDb = url.includes(EXPECTED_DATABASE)

  if (!isLocalHost || !isTargetDb) {
    throw new Error(
      `Refusing to run integration tests: ${name} must point at the local ` +
        `Docker Postgres (localhost/${EXPECTED_DATABASE}). Run ` +
        `\`npm run db:test:up\` first. Got: ${redact(url)}`
    )
  }
}

/**
 * Strip the password before putting a rejected URL in an error message. The
 * whole point of this guard is that the value may be a real credential.
 */
function redact(url: string): string {
  if (!url) {
    return '(unset)'
  }
  return url.replace(/:\/\/([^:@/]*):[^@/]*@/, '://$1:***@')
}

/**
 * The adapter check, which the finance-demo equivalent of this file does not
 * need.
 *
 * `src/lib/prisma.ts` picks `PrismaNeon` unless `DATABASE_ADAPTER` is exactly
 * `'pg'`, and the Neon serverless driver speaks HTTP to Neon's endpoint rather
 * than the Postgres wire protocol to a host. So this is not only about the
 * suite working — a wrong value here means the *string* checks above can pass
 * while the client still tries to reach something that is not the container.
 */
function assertPgAdapter(): void {
  if (process.env.DATABASE_ADAPTER !== 'pg') {
    throw new Error(
      `Refusing to run integration tests: DATABASE_ADAPTER must be "pg" so ` +
        `src/lib/prisma.ts uses the local Postgres driver rather than the Neon ` +
        `serverless one. Got "${process.env.DATABASE_ADAPTER ?? '(unset)'}".`
    )
  }
}

export function assertLocalDatabase(): void {
  assertLocalUrl('DATABASE_URL', process.env.DATABASE_URL ?? '')
  assertLocalUrl('DIRECT_URL', process.env.DIRECT_URL ?? '')
  assertPgAdapter()
}
