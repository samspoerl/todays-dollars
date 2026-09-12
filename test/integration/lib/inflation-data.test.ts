import { getInflationData } from '@/lib/inflation-data'
import { describe, expect, it } from 'vitest'
import { prisma } from '../support/db'
import {
  createMetadata,
  createMonthlySeries,
  createObservation,
  daysAgo,
} from '../support/factories'
import {
  assertNotRateLimited,
  countFredRequest,
  hasFredCredentials,
} from '../support/fred'

/**
 * `getInflationData` is the cache. Its whole job is deciding whether to answer
 * from Postgres or go back to FRED, and that decision is made from a row's
 * `updatedAt` — so it cannot be tested without a real database writing real
 * timestamps.
 *
 * The file is split by whether a case reaches the network. The cache-hit specs
 * are free and cover the branching; the two refresh specs make one real FRED
 * request each and are the only place the FRED→Postgres round trip is exercised
 * end to end. See `../support/fred.ts` for the request budget.
 */

describe('getInflationData — served from cache', () => {
  it('returns cached observations when metadata is fresh', async () => {
    await createMetadata({ inflationMeasure: 'CPI', updatedAt: new Date() })
    await createMonthlySeries({
      inflationMeasure: 'CPI',
      startYear: 2020,
      months: 3,
      value: 0.5,
    })

    const result = await getInflationData({
      inflationMeasure: 'CPI',
      startYear: 2020,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(3)
  })

  it('excludes years before startYear', async () => {
    await createMetadata({ inflationMeasure: 'CPI', updatedAt: new Date() })
    await createMonthlySeries({
      inflationMeasure: 'CPI',
      startYear: 2018,
      months: 36, // 2018-01 through 2020-12
      value: 0.1,
    })

    const result = await getInflationData({
      inflationMeasure: 'CPI',
      startYear: 2020,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Filtered on year, not on an exact date, so all 12 months of 2020 come
    // back and nothing from 2018 or 2019 does.
    expect(result.data).toHaveLength(12)
    expect(result.data.every((o) => o.year === 2020)).toBe(true)
  })

  it('orders by year then month ascending, which the compounding depends on', async () => {
    await createMetadata({ inflationMeasure: 'CPI', updatedAt: new Date() })
    // Inserted out of order on purpose: `calculate.ts` compounds the rows in
    // the order it receives them, so a wrong ORDER BY would not throw — it
    // would return a wrong dollar amount.
    await createObservation({ year: 2021, month: 2, value: 0.2 })
    await createObservation({ year: 2020, month: 12, value: 0.9 })
    await createObservation({ year: 2021, month: 1, value: 0.1 })
    await createObservation({ year: 2020, month: 1, value: 0.5 })

    const result = await getInflationData({
      inflationMeasure: 'CPI',
      startYear: 2020,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.map((o) => [o.year, o.month])).toEqual([
      [2020, 1],
      [2020, 12],
      [2021, 1],
      [2021, 2],
    ])
  })

  it('returns only the requested measure', async () => {
    await createMetadata({ inflationMeasure: 'CPI', updatedAt: new Date() })
    await createMetadata({ inflationMeasure: 'PCE', updatedAt: new Date() })
    await createMonthlySeries({
      inflationMeasure: 'CPI',
      startYear: 2020,
      months: 2,
      value: 0.5,
    })
    await createMonthlySeries({
      inflationMeasure: 'PCE',
      startYear: 2020,
      months: 5,
      value: 0.3,
    })

    const result = await getInflationData({
      inflationMeasure: 'PCE',
      startYear: 2020,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(5)
    expect(result.data.every((o) => o.inflationMeasure === 'PCE')).toBe(true)
  })

  it('returns exactly the ObservationDto shape', async () => {
    await createMetadata({ inflationMeasure: 'CPI', updatedAt: new Date() })
    await createObservation({ year: 2020, month: 1, value: 0.5 })

    const result = await getInflationData({
      inflationMeasure: 'CPI',
      startYear: 2020,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // `observationSelect` is what keeps `fredDate` and the audit columns out of
    // a payload that crosses to the client. A `select` widened by accident
    // would not fail any other assertion here.
    expect(Object.keys(result.data[0]).sort()).toEqual([
      'id',
      'inflationMeasure',
      'month',
      'value',
      'year',
    ])
  })

  it('reads a cache that is six days old', async () => {
    // Just inside the 7-day expiry. The boundary is asserted from both sides so
    // a change from `>=` to `>` cannot pass unnoticed.
    await createMetadata({ inflationMeasure: 'CPI', updatedAt: daysAgo(6) })
    await createMonthlySeries({
      inflationMeasure: 'CPI',
      startYear: 2020,
      months: 2,
      value: 0.5,
    })

    const result = await getInflationData({
      inflationMeasure: 'CPI',
      startYear: 2020,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(2)
    // Untouched: no refresh happened, so the seeded values are still there.
    expect(result.data.every((o) => o.value === 0.5)).toBe(true)
  })
})

/**
 * The refresh path, against the real FRED API.
 *
 * Skipped without a key so a fork or a Dependabot PR — neither of which can
 * read repository secrets — skips these rather than failing. The cache specs
 * above still run.
 *
 * Two requests, one per spec. `countFredRequest()` makes that ceiling fail
 * loudly if a spec is ever added that fetches in a loop.
 */
describe.skipIf(!hasFredCredentials())(
  'getInflationData — refreshed from FRED',
  () => {
    it('fetches and caches when there is no metadata at all', async () => {
      countFredRequest()

      const result = await getInflationData({
        inflationMeasure: 'CPI',
        startYear: 1947,
      })

      assertNotRateLimited(result)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // CPI starts in January 1947 and is monthly, so by now there are well
      // over 900 observations. Asserted as a floor rather than an exact count,
      // which would break every month.
      expect(result.data.length).toBeGreaterThan(900)

      // The cache was actually written, not just read through.
      const metadata = await prisma.metadata.findUnique({
        where: { inflationMeasure: 'CPI' },
      })
      expect(metadata).not.toBeNull()
      expect(metadata!.totalObservations).toBe(result.data.length)
      expect(metadata!.lastObservationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      // The FRED→DTO transform, verified against real upstream data rather
      // than a fixture. FRED reports the first observation of a `pch` series
      // as "." — there is no prior month to compute a change against — and
      // `inflation-data.ts` maps that sentinel to 0. Any other handling
      // (NaN, null, a parse failure) would poison the compounding from the
      // very first month.
      const first = result.data[0]
      expect([first.year, first.month]).toEqual([1947, 1])
      expect(first.value).toBe(0)

      // Every value must be a finite number, or the running product in
      // `calculate.ts` silently becomes NaN for every later month.
      expect(result.data.every((o) => Number.isFinite(o.value))).toBe(true)
    })

    it('refetches when the cached data is stale, replacing the old rows', async () => {
      countFredRequest()

      // Eight days old: past the 7-day expiry, and paired with an obviously
      // bogus observation so the assertion can tell a refresh from a read.
      await createMetadata({
        inflationMeasure: 'CPI',
        updatedAt: daysAgo(8),
        totalObservations: 1,
        lastObservationDate: '1999-01-01',
      })
      await createObservation({ year: 2020, month: 1, value: 999 })

      const result = await getInflationData({
        inflationMeasure: 'CPI',
        startYear: 2020,
      })

      assertNotRateLimited(result)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // The stale row is gone — `fetchAndCacheInflationData` deletes the
      // measure's observations before recreating them.
      expect(result.data.some((o) => o.value === 999)).toBe(false)
      expect(result.data.length).toBeGreaterThan(12)

      // Metadata was upserted, not duplicated: the unique constraint on
      // `inflationMeasure` means a `create` where an `update` belonged would
      // throw rather than quietly add a row, so this pins the upsert.
      expect(await prisma.metadata.count()).toBe(1)
      const metadata = await prisma.metadata.findUnique({
        where: { inflationMeasure: 'CPI' },
      })
      expect(metadata!.lastObservationDate).not.toBe('1999-01-01')
      expect(metadata!.totalObservations).toBeGreaterThan(900)

      // And the whole series was stored, even though only 2020-onward was
      // asked for — the cache is the full series, the filter is on read.
      expect(await prisma.observation.count()).toBe(metadata!.totalObservations)
    })
  }
)
