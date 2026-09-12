import logTelemetry from '@/lib/logs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../support/db'

/**
 * `logTelemetry` is called through `after()` from the calculate action, so it
 * runs *after* the response has gone to the client. That shapes its whole
 * contract: it must write the row, and it must never throw, because by the time
 * it fails there is no longer a response to turn into an error.
 *
 * Both halves need a real database. A mocked Prisma would happily record the
 * call and prove neither.
 */
describe('logTelemetry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('writes a telemetry row', async () => {
    const timestamp = new Date('2026-03-01T12:00:00.000Z')

    await logTelemetry({ timestamp, duration: 42.5, inflationMeasure: 'CPI' })

    const rows = await prisma.telemetry.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0].timestamp.toISOString()).toBe('2026-03-01T12:00:00.000Z')
    expect(rows[0].duration).toBe(42.5)
    expect(rows[0].inflationMeasure).toBe('CPI')
  })

  it('records each measure', async () => {
    const timestamp = new Date()

    await logTelemetry({ timestamp, duration: 1, inflationMeasure: 'CPI' })
    await logTelemetry({ timestamp, duration: 2, inflationMeasure: 'PCE' })

    const rows = await prisma.telemetry.findMany({
      orderBy: { duration: 'asc' },
    })
    expect(rows.map((r) => r.inflationMeasure)).toEqual(['CPI', 'PCE'])
  })

  it('appends rather than replacing, so history accumulates', async () => {
    const timestamp = new Date()

    await logTelemetry({ timestamp, duration: 1, inflationMeasure: 'CPI' })
    await logTelemetry({ timestamp, duration: 2, inflationMeasure: 'CPI' })
    await logTelemetry({ timestamp, duration: 3, inflationMeasure: 'CPI' })

    expect(await prisma.telemetry.count()).toBe(3)
  })

  it('preserves sub-millisecond durations', async () => {
    // The column is a Float and the caller computes `Date.now() - start`, so
    // whole numbers are the norm — but the type permits fractions and rounding
    // them away silently would be a quiet loss of resolution.
    await logTelemetry({
      timestamp: new Date(),
      duration: 0.125,
      inflationMeasure: 'PCE',
    })

    const [row] = await prisma.telemetry.findMany()
    expect(row.duration).toBe(0.125)
  })

  /**
   * The important one. `logTelemetry` swallows its own failures by design —
   * losing a metric must never surface to a user who already has their answer.
   *
   * An invalid enum value is the cheapest way to make Prisma reject the write
   * for real, rather than trusting a mock to have been asked to reject.
   */
  it('swallows a write failure instead of throwing', async () => {
    const bad = {
      timestamp: new Date(),
      duration: 1,
      // Deliberately not an InflationMeasure; Prisma rejects it at validation.
      inflationMeasure: 'NOT_A_MEASURE' as never,
    }

    await expect(logTelemetry(bad)).resolves.toBeUndefined()
    expect(await prisma.telemetry.count()).toBe(0)
  })

  it('swallows an invalid timestamp instead of throwing', async () => {
    await expect(
      logTelemetry({
        timestamp: new Date('not a date'),
        duration: 1,
        inflationMeasure: 'CPI',
      })
    ).resolves.toBeUndefined()

    expect(await prisma.telemetry.count()).toBe(0)
  })
})
