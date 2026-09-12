import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assertLocalDatabase,
  EXPECTED_DATABASE,
} from '../../integration/support/guard'

/**
 * The integration suite's guard, tested here rather than there.
 *
 * It cannot be tested from inside the integration suite: that suite only ever
 * runs with valid values on `process.env`, so the only case it exercises is the
 * one that passes. Its whole purpose is the cases that must *not* pass, and the
 * one thing standing between a stray `DATABASE_URL` and a TRUNCATE of the
 * shared development Neon database deserves a test that actually tries them.
 *
 * The guard rejects *any* non-local target rather than enumerating known ones,
 * so `REMOTE_NEON` below stands in for whatever happens to be in `.env` — it
 * is not a real credential.
 *
 * These specs mutate `process.env` directly and restore it afterwards. Nothing
 * here opens a connection.
 */

const LOCAL = `postgresql://postgres:postgres@localhost:5433/${EXPECTED_DATABASE}?schema=public`
const REMOTE_NEON =
  'postgresql://neondb_owner:hunter2@ep-round-glitter-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require'

let original: NodeJS.ProcessEnv

beforeEach(() => {
  original = { ...process.env }
  process.env.DATABASE_URL = LOCAL
  process.env.DIRECT_URL = LOCAL
  process.env.DATABASE_ADAPTER = 'pg'
})

afterEach(() => {
  process.env = original
})

describe('assertLocalDatabase', () => {
  it('accepts the local throwaway container', () => {
    expect(() => assertLocalDatabase()).not.toThrow()
  })

  it('accepts 127.0.0.1 as well as localhost', () => {
    const loopback = LOCAL.replace('localhost', '127.0.0.1')
    process.env.DATABASE_URL = loopback
    process.env.DIRECT_URL = loopback

    expect(() => assertLocalDatabase()).not.toThrow()
  })

  describe('rejects a non-local target', () => {
    it('throws when DATABASE_URL points at Neon', () => {
      process.env.DATABASE_URL = REMOTE_NEON

      expect(() => assertLocalDatabase()).toThrow(/DATABASE_URL/)
    })

    /**
     * Checked separately because `migrate deploy` connects with this one.
     * `global-setup.ts` shells out to Prisma before any spec runs, so a
     * `DIRECT_URL` pointing somewhere real would apply migrations to it even
     * if every query in the suite went to the container.
     */
    it('throws when DIRECT_URL points at Neon', () => {
      process.env.DIRECT_URL = REMOTE_NEON

      expect(() => assertLocalDatabase()).toThrow(/DIRECT_URL/)
    })

    it('throws when a URL is unset', () => {
      delete process.env.DATABASE_URL

      expect(() => assertLocalDatabase()).toThrow(/DATABASE_URL/)
    })

    /**
     * The case the host check alone would miss. docker-compose.yml defines a
     * *development* database on localhost too, and the developer's own
     * Postgres may be on 5432 — so "localhost" is not sufficient evidence that
     * a TRUNCATE is safe. The `_test` database name is.
     */
    it('throws for a different database on localhost', () => {
      const devDb =
        'postgresql://postgres:postgres@localhost:5432/todays_dollars?schema=public'
      process.env.DATABASE_URL = devDb
      process.env.DIRECT_URL = devDb

      expect(() => assertLocalDatabase()).toThrow(/todays_dollars_test/)
    })
  })

  describe('adapter', () => {
    /**
     * `src/lib/prisma.ts` selects `PrismaNeon` unless this is exactly `'pg'`,
     * and the Neon driver speaks HTTP to Neon's endpoint rather than the
     * Postgres wire protocol to a host — so a wrong value here is how the URL
     * checks above could all pass while the client still reached for Neon.
     */
    it('throws when DATABASE_ADAPTER is unset', () => {
      delete process.env.DATABASE_ADAPTER

      expect(() => assertLocalDatabase()).toThrow(/DATABASE_ADAPTER/)
    })

    it('throws when DATABASE_ADAPTER is anything but pg', () => {
      process.env.DATABASE_ADAPTER = 'neon'

      expect(() => assertLocalDatabase()).toThrow(/DATABASE_ADAPTER/)
    })
  })

  describe('error messages', () => {
    it('redacts the password from a rejected URL', () => {
      process.env.DATABASE_URL = REMOTE_NEON

      // The guard exists because the value may be a live credential, so the
      // rejection must not be the thing that leaks it into a CI log.
      expect(() => assertLocalDatabase()).toThrow(/neondb_owner:\*\*\*@/)
      expect(() => assertLocalDatabase()).not.toThrow(/hunter2/)
    })

    it('says how to start the container', () => {
      process.env.DATABASE_URL = REMOTE_NEON

      expect(() => assertLocalDatabase()).toThrow(/npm run db:test:up/)
    })

    it('reports "(unset)" rather than an empty string', () => {
      delete process.env.DATABASE_URL

      expect(() => assertLocalDatabase()).toThrow(/\(unset\)/)
    })
  })
})
