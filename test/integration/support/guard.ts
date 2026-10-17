/**
 * Hard safety guard for the integration suite.
 *
 * These tests TRUNCATE every table between cases, and `.env` may hold any
 * connection string — there is no way to know which database it names. So
 * this rejects *any* target that isn't unmistakably the throwaway container,
 * rather than enumerating the ones to avoid.
 *
 * Both URLs are checked: queries use `DATABASE_URL`, but `prisma.config.ts`
 * runs `migrate deploy` against `DIRECT_URL`. The host check alone is not
 * enough — the `db` service in docker-compose.yml is also on localhost — so the
 * database name must match too. See `assertConnectedDatabaseIsLocal` in
 * `./db.ts` for the check against the live connection.
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
