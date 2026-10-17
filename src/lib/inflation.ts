// Pure inflation logic: no Prisma, no FRED I/O, no request context, so the unit
// suite can reach it. The callers in `calculate.ts` and `inflation-data.ts`
// handle the I/O around it.

import { type FredObservation } from '@/lib/fred/fred-types'
import {
  type InflationMeasure,
  type ObservationCreateDto,
  type ObservationDto,
} from '@/lib/types'

export const CACHE_EXPIRY_DAYS = 7

const MS_PER_DAY = 1000 * 60 * 60 * 24

// Compounds `startAmount` through each month's percent change, in order. Each
// output observation carries the running value after that month, so the last
// one is the answer and the whole series is the chart.
export function compoundObservations(
  startAmount: number,
  inflationMeasure: InflationMeasure,
  observations: ObservationDto[]
): ObservationDto[] {
  let runningValue = startAmount
  return observations.map((obs) => {
    runningValue = runningValue * (1 + obs.value / 100)
    return {
      id: obs.id,
      inflationMeasure,
      year: obs.year,
      month: obs.month,
      value: runningValue,
    }
  })
}

// FRED sends `.` for a month with no value, which is stored as 0% — see #251
// for why that is a known hazard rather than settled behavior.
export function toObservationCreateDtos(
  inflationMeasure: InflationMeasure,
  observations: FredObservation[]
): ObservationCreateDto[] {
  return observations.map((obs) => ({
    inflationMeasure,
    year: parseInt(obs.date.slice(0, 4)),
    month: parseInt(obs.date.slice(5, 7)),
    fredDate: obs.date,
    value: obs.value === '.' ? 0 : parseFloat(obs.value),
  }))
}

// Whole days elapsed, floored, so the cache expires at exactly
// CACHE_EXPIRY_DAYS and not a moment before.
export function isCacheStale(updatedAt: Date, now: number): boolean {
  const daysSinceUpdate = Math.floor((now - updatedAt.getTime()) / MS_PER_DAY)
  return daysSinceUpdate >= CACHE_EXPIRY_DAYS
}
