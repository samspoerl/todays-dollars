import prisma from '@/lib/prisma'
import { assertLocalDatabase, EXPECTED_DATABASE } from './guard'

/**
 * Every table, by its `@@map` name.
 *
 * These three models have no relations between them, so nothing cascades and
 * each has to be listed to be cleared at all. `RESTART IDENTITY` resets the
 * autoincrement sequences so ids stay predictable from one test to the next.
 * Nothing here is seeded by a migration, so there is no reference data to
 * preserve.
 */
const TABLES = ['observations', 'metadata', 'telemetry'] as const

let connectionVerified = false

/**
 * The third guard, and the only one that inspects the connection Prisma
 * actually opened rather than the string we believe opened it.
 *
 * `assertLocalDatabase` reads `process.env`; this asks the server who it is. The
 * two fail independently — a mis-set adapter, a pooler that rewrites the target,
 * or an edit to `vitest.integration.config.mts` that slips past a string match
 * would all still have to get past this.
 *
 * `neon.tenant_id` is the anti-target check: it is unset on a plain Postgres and
 * present on Neon, so it names the one host this suite must never reach instead
 * of trying to enumerate the hosts it may. `current_setting(..., true)` returns
 * null for an unknown setting rather than throwing.
 *
 * Runs once per process, not once per reset — it is a round trip, and the
 * connection cannot change identity underneath us mid-run.
 */
async function assertConnectedDatabaseIsLocal(): Promise<void> {
  if (connectionVerified) {
    return
  }

  const [row] = await prisma.$queryRaw<
    { database: string; neon_tenant: string | null }[]
  >`SELECT current_database() AS database, current_setting('neon.tenant_id', true) AS neon_tenant`

  if (row.database !== EXPECTED_DATABASE) {
    throw new Error(
      `Refusing to run integration tests: connected to database ` +
        `"${row.database}", expected "${EXPECTED_DATABASE}".`
    )
  }

  if (row.neon_tenant !== null) {
    throw new Error(
      'Refusing to run integration tests: the connected server is Neon, not ' +
        'the local Docker Postgres.'
    )
  }

  connectionVerified = true
}

/** Truncate every table so each test starts from an empty database. */
export async function resetDb(): Promise<void> {
  // Defense in depth: re-check the target on every reset, not just at startup.
  assertLocalDatabase()
  await assertConnectedDatabaseIsLocal()

  const tables = TABLES.map((table) => `"${table}"`).join(', ')
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`
  )
}

export { prisma }
