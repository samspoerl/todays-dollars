import { type FredObservation } from '@/lib/fred/fred-types'
import {
  CACHE_EXPIRY_DAYS,
  compoundObservations,
  isCacheStale,
  toObservationCreateDtos,
} from '@/lib/inflation'
import { type ObservationDto } from '@/lib/types'
import { describe, expect, it } from 'vitest'

function obs(year: number, month: number, value: number): ObservationDto {
  return { id: year * 100 + month, inflationMeasure: 'CPI', year, month, value }
}

function fred(date: string, value: string): FredObservation {
  return { realtime_start: date, realtime_end: date, date, value }
}

describe('compoundObservations', () => {
  it('applies a single month', () => {
    const [result] = compoundObservations(100, 'CPI', [obs(2020, 1, 1)])
    expect(result.value).toBeCloseTo(101, 10)
  })

  it('compounds month over month rather than summing', () => {
    const result = compoundObservations(100, 'CPI', [
      obs(2020, 1, 10),
      obs(2020, 2, 10),
    ])
    expect(result.map((r) => r.value)).toEqual([
      expect.closeTo(110, 10),
      expect.closeTo(121, 10),
    ])
  })

  it('carries the running value on every month, in input order', () => {
    const result = compoundObservations(200, 'CPI', [
      obs(2020, 1, 0.5),
      obs(2020, 2, 0.2),
      obs(2020, 3, 0.3),
    ])
    expect(result.map((r) => [r.year, r.month])).toEqual([
      [2020, 1],
      [2020, 2],
      [2020, 3],
    ])
    expect(result[2].value).toBeCloseTo(200 * 1.005 * 1.002 * 1.003, 10)
  })

  it('shrinks the value through a deflationary month', () => {
    const result = compoundObservations(100, 'CPI', [
      obs(2020, 1, 2),
      obs(2020, 2, -1),
    ])
    expect(result[1].value).toBeCloseTo(100 * 1.02 * 0.99, 10)
    expect(result[1].value).toBeLessThan(result[0].value)
  })

  it('leaves the value unchanged through a 0% month', () => {
    const result = compoundObservations(100, 'CPI', [
      obs(2020, 1, 1),
      obs(2020, 2, 0),
    ])
    expect(result[1].value).toBe(result[0].value)
  })

  it('stays within floating-point tolerance over a long range', () => {
    // 1947 to the present is roughly 950 months; this is that order of
    // magnitude, checked against the closed form.
    const months = Array.from({ length: 960 }, (_, i) =>
      obs(1947 + Math.floor(i / 12), (i % 12) + 1, 0.3)
    )
    const result = compoundObservations(100, 'CPI', months)
    const expected = 100 * Math.pow(1.003, 960)
    expect(Math.abs(result.at(-1)!.value - expected) / expected).toBeLessThan(
      1e-12
    )
  })

  it('returns an empty series for no observations', () => {
    expect(compoundObservations(100, 'CPI', [])).toEqual([])
  })

  it('stamps the requested measure and keeps id, year and month', () => {
    const [result] = compoundObservations(100, 'PCE', [obs(2020, 1, 1)])
    expect(result).toEqual({
      id: 202001,
      inflationMeasure: 'PCE',
      year: 2020,
      month: 1,
      value: expect.any(Number),
    })
  })
})

describe('toObservationCreateDtos', () => {
  it('parses a numeric value and splits the date', () => {
    expect(toObservationCreateDtos('CPI', [fred('2024-03-01', '0.4')])).toEqual(
      [
        {
          inflationMeasure: 'CPI',
          year: 2024,
          month: 3,
          fredDate: '2024-03-01',
          value: 0.4,
        },
      ]
    )
  })

  it('parses a negative value', () => {
    const [dto] = toObservationCreateDtos('CPI', [fred('2020-04-01', '-0.67')])
    expect(dto.value).toBe(-0.67)
  })

  it("maps FRED's '.' placeholder to 0", () => {
    // Pinned, not endorsed — see #251.
    const [dto] = toObservationCreateDtos('CPI', [fred('2025-10-01', '.')])
    expect(dto.value).toBe(0)
  })

  it('parses single-digit and December months', () => {
    const result = toObservationCreateDtos('PCE', [
      fred('1959-01-01', '0.1'),
      fred('1959-12-01', '0.2'),
    ])
    expect(result.map((r) => [r.year, r.month])).toEqual([
      [1959, 1],
      [1959, 12],
    ])
  })
})

describe('isCacheStale', () => {
  const updatedAt = new Date('2026-01-01T00:00:00Z')
  const day = 1000 * 60 * 60 * 24
  const expiry = updatedAt.getTime() + CACHE_EXPIRY_DAYS * day

  it('is fresh just after an update', () => {
    expect(isCacheStale(updatedAt, updatedAt.getTime())).toBe(false)
  })

  it('is fresh one millisecond before the expiry', () => {
    expect(isCacheStale(updatedAt, expiry - 1)).toBe(false)
  })

  it('is stale at exactly the expiry', () => {
    expect(isCacheStale(updatedAt, expiry)).toBe(true)
  })

  it('is stale after the expiry', () => {
    expect(isCacheStale(updatedAt, expiry + day)).toBe(true)
  })
})
