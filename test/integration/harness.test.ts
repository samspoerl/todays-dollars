import { describe, expect, it } from 'vitest'
import { prisma } from './support/db'

/**
 * Proves the harness itself is pointed where it thinks it is, before any spec
 * relies on it. If this file fails, nothing else in the suite means anything.
 *
 * The stake is higher here than the name suggests: `.env` in this repository
 * holds the development Neon credentials, and every test in this suite starts
 * with a TRUNCATE.
 */
describe('integration harness', () => {
  it('is connected to the local throwaway database, not Neon', async () => {
    const [row] = await prisma.$queryRaw<
      { database: string; neon_tenant: string | null }[]
    >`SELECT current_database() AS database, current_setting('neon.tenant_id', true) AS neon_tenant`

    expect(row.database).toBe('todays_dollars_test')
    expect(row.neon_tenant).toBeNull()
  })

  it('uses the local Postgres driver, not the Neon serverless one', async () => {
    // `src/lib/prisma.ts` branches on this. A wrong value is how the string
    // guards could pass while the client still reached for Neon's endpoint.
    expect(process.env.DATABASE_ADAPTER).toBe('pg')
  })

  it('starts each test from an empty database', async () => {
    expect(await prisma.observation.count()).toBe(0)
    expect(await prisma.metadata.count()).toBe(0)
    expect(await prisma.telemetry.count()).toBe(0)
  })

  it('has the schema applied', async () => {
    // `global-setup.ts` runs `prisma migrate deploy`; this is the assertion
    // that it actually did something on a fresh Docker volume.
    const tables = await prisma.$queryRaw<
      { table_name: string }[]
    >`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`

    const names = tables.map((t) => t.table_name)
    expect(names).toContain('observations')
    expect(names).toContain('metadata')
    expect(names).toContain('telemetry')
  })
})
