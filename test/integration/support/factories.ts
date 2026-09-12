import prisma from '@/lib/prisma'
import { type InflationMeasure } from '@/lib/types'

/**
 * Row builders for the integration suite.
 *
 * Each takes only what the test cares about and fills the rest with something
 * valid but obviously synthetic, so a spec reads as the scenario it is testing
 * rather than a wall of required columns. The database is truncated with
 * `RESTART IDENTITY` between tests, so ids restart at 1 every time — but specs
 * should still use the returned id rather than assuming a number.
 */

/** The FRED date string format the `fredDate` column stores. */
function fredDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export async function createObservation({
  inflationMeasure = 'CPI',
  year,
  month,
  value,
}: {
  inflationMeasure?: InflationMeasure
  year: number
  month: number
  value: number
}) {
  return prisma.observation.create({
    data: {
      inflationMeasure,
      year,
      month,
      fredDate: fredDate(year, month),
      value,
    },
  })
}

/**
 * A contiguous run of monthly observations, oldest first, all with the same
 * percentage change.
 *
 * A constant rate is the point rather than a shortcut: it makes the expected
 * compounded result a closed form the spec can assert exactly
 * (`amount * (1 + value / 100) ** months`), instead of a magic number copied
 * out of a previous run.
 */
export async function createMonthlySeries({
  inflationMeasure = 'CPI',
  startYear,
  startMonth = 1,
  months,
  value,
}: {
  inflationMeasure?: InflationMeasure
  startYear: number
  startMonth?: number
  months: number
  value: number
}) {
  const rows = Array.from({ length: months }, (_, index) => {
    const absoluteMonth = startMonth - 1 + index
    const year = startYear + Math.floor(absoluteMonth / 12)
    const month = (absoluteMonth % 12) + 1

    return {
      inflationMeasure,
      year,
      month,
      fredDate: fredDate(year, month),
      value,
    }
  })

  await prisma.observation.createMany({ data: rows })
  return rows
}

/**
 * Metadata for a measure.
 *
 * `updatedAt` is what decides the cache-freshness branch in
 * `getInflationData`, and Prisma allows an explicit value for an `@updatedAt`
 * field on create — which is the only reason the stale path is reachable from
 * a test without waiting seven days. `daysSinceUpdate` is computed with
 * `Math.floor`, so callers should pass a clearly-past or clearly-recent date
 * rather than something within a day of the boundary.
 */
export async function createMetadata({
  inflationMeasure = 'CPI',
  lastObservationDate = '2026-01-01',
  totalObservations = 1,
  updatedAt,
}: {
  inflationMeasure?: InflationMeasure
  lastObservationDate?: string
  totalObservations?: number
  updatedAt?: Date
} = {}) {
  return prisma.metadata.create({
    data: {
      inflationMeasure,
      lastObservationDate,
      totalObservations,
      ...(updatedAt ? { updatedAt } : {}),
    },
  })
}

/** A date `days` in the past, for driving the cache-staleness branch. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}
