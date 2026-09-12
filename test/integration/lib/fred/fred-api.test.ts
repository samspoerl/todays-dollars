import { callFred } from '@/lib/fred/fred-api'
import { type FredObservation } from '@/lib/fred/fred-types'
import { describe, expect, it } from 'vitest'
import {
  assertNotRateLimited,
  countFredRequest,
  hasFredCredentials,
} from '../../support/fred'

/**
 * `callFred` against the real API.
 *
 * `test/unit/lib/fred/fred-api.test.ts` covers the branching — 429, 400,
 * malformed bodies — with a stubbed `fetch`, so it proves the code handles the
 * shapes the test author believed FRED produces. This file answers the
 * different question: **does FRED still produce them?**
 *
 * That is the only thing worth spending a real request on, and it is not
 * hypothetical. This code reads `observations[].date` by fixed string offsets
 * and `observations[].value` as a decimal string with "." for missing. Both are
 * upstream conventions, not contracts, and nothing in the app would notice them
 * changing until the numbers came out wrong.
 *
 * Two requests, one per measure. See the budget in `../../support/fred.ts`.
 */

/** Count of calendar months from one FRED date string to another, inclusive. */
function monthsBetween(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split('-').map(Number)
  const [toYear, toMonth] = to.split('-').map(Number)
  return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1
}

/**
 * The assertions that must hold for either series.
 *
 * Derived from the data rather than hardcoded, so they do not need editing
 * every month as FRED appends an observation.
 */
function expectMonthlyPchSeries(
  observations: FredObservation[],
  expectedStart: string
) {
  const first = observations[0]
  const last = observations[observations.length - 1]

  // `inflation-data.ts` slices year and month out of this string by fixed
  // offsets, so the format is load-bearing.
  expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(first.date).toBe(expectedStart)

  // Contiguous and monthly, asserted by construction instead of with a magic
  // floor: one observation per calendar month between the first and the last,
  // with none missing and none duplicated. This is what makes compounding the
  // rows in order equivalent to compounding month over month — a gap would
  // silently shorten the series rather than raise anything.
  expect(observations).toHaveLength(monthsBetween(first.date, last.date))
  expect(observations.every((o) => o.date.endsWith('-01'))).toBe(true)

  // The sentinel. A `pch` series has no percentage change for its first
  // observation, and FRED reports that as "." rather than 0 or null.
  expect(first.value).toBe('.')

  /**
   * The assertion worth the most here.
   *
   * `inflation-data.ts` special-cases exactly one non-numeric token — `'.'` —
   * and maps it to 0. Anything else (`''`, `'NA'`, `null`) would survive
   * `parseFloat` as NaN, and the running product in `calculate.ts` would turn
   * every subsequent month into NaN. So the contract is not "values are
   * numeric"; it is "the only non-numeric value is `.`".
   *
   * Note this is deliberately *not* asserted as "only the first is `.`". As of
   * writing, CPI carries three: 1947-01 plus 2025-10 and 2025-11, which are
   * genuine mid-series gaps. Those currently compound as 0% — see the hazard
   * note in AGENTS.md.
   */
  const nonNumeric = observations.filter(
    (o) => !Number.isFinite(parseFloat(o.value))
  )
  expect(nonNumeric.map((o) => o.value)).toEqual(nonNumeric.map(() => '.'))
}

describe.skipIf(!hasFredCredentials())('callFred', () => {
  it('fetches the CPI series in the shape inflation-data.ts reads', async () => {
    countFredRequest()

    const result = await callFred('CPI')

    assertNotRateLimited(result)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const { data } = result

    // `units=pch` is the request this code makes and the reason `calculate.ts`
    // can compound the values directly. If FRED ever echoed something else
    // back, the app would compound index levels and be wrong without erroring.
    expect(data.units).toBe('pch')
    expect(Array.isArray(data.observations)).toBe(true)

    // CPIAUCSL begins in January 1947, which is where the form's lower bound
    // comes from.
    expectMonthlyPchSeries(data.observations, '1947-01-01')
    expect(data.observations.length).toBeGreaterThan(900)
  })

  it('fetches the PCE series, which starts later than CPI', async () => {
    countFredRequest()

    const result = await callFred('PCE')

    assertNotRateLimited(result)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const { data } = result

    expect(data.units).toBe('pch')

    // PCEPI begins in January 1959, *after* CPI's 1947 — so the form's 1947
    // floor is permissive for PCE, and a user asking for 1950 in PCE silently
    // gets a series starting in 1959 rather than an error. Pinned because it
    // is a real edge in the product, not just in the API.
    expectMonthlyPchSeries(data.observations, '1959-01-01')
    expect(data.observations.length).toBeGreaterThan(800)
  })
})
