import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assertNotRateLimited,
  hasFredCredentials,
  MAX_FRED_REQUESTS_PER_FILE,
} from '../../integration/support/fred'

/**
 * The FRED half of the integration harness, tested here for the same reason as
 * the database guard: the integration suite only runs the paths that pass.
 *
 * `countFredRequest` is deliberately not tested — it holds module-level state
 * that these specs would have to exhaust to observe, which would then be spent
 * for anything else importing the module in the same file.
 */

let original: NodeJS.ProcessEnv

beforeEach(() => {
  original = { ...process.env }
})

afterEach(() => {
  process.env = original
})

describe('hasFredCredentials', () => {
  it('is true when a key is present', () => {
    process.env.FRED_API_KEY = 'abcdef0123456789abcdef0123456789'

    expect(hasFredCredentials()).toBe(true)
  })

  it('is false when the key is unset', () => {
    delete process.env.FRED_API_KEY

    expect(hasFredCredentials()).toBe(false)
  })

  /**
   * The case that matters in CI. An unset repository secret expands to the
   * empty string rather than disappearing, so a fork or Dependabot PR sees
   * `FRED_API_KEY=''`. That has to read as "no credentials" and skip, not as
   * "credentials present" and fail against FRED with a blank key.
   */
  it('is false for an empty string, as an unset CI secret expands to', () => {
    process.env.FRED_API_KEY = ''

    expect(hasFredCredentials()).toBe(false)
  })
})

describe('assertNotRateLimited', () => {
  it('passes a successful result through', () => {
    expect(() =>
      assertNotRateLimited({ ok: true, data: 'anything' })
    ).not.toThrow()
  })

  it('passes an unrelated failure through, for the spec to assert on', () => {
    // Not its job to turn every failure into a harness error — only the one
    // that means "environment", not "bug".
    expect(() =>
      assertNotRateLimited({
        ok: false,
        message: 'An unexpected error has occurred.',
      })
    ).not.toThrow()
  })

  /**
   * These two strings are the actual output of `callFred`'s 429 branch. The
   * coupling is intentional and asserted from both ends: the unit spec for
   * `callFred` pins the messages it produces, and this pins that the harness
   * recognises them. Changing the wording in one place alone turns a throttled
   * CI run back into a confusing assertion failure.
   */
  it('throws a clear environment error on the Retry-After message', () => {
    expect(() =>
      assertNotRateLimited({
        ok: false,
        message: 'FRED rate limit reached. Try again in 30 seconds.',
      })
    ).toThrow(/rate-limited this run/)
  })

  it('throws a clear environment error on the generic 429 message', () => {
    expect(() =>
      assertNotRateLimited({
        ok: false,
        message: 'FRED rate limit reached. Please try again in a minute.',
      })
    ).toThrow(/rate-limited this run/)
  })

  it('suggests a separate test key, which is the actual fix', () => {
    expect(() =>
      assertNotRateLimited({
        ok: false,
        message: 'FRED rate limit reached. Please try again in a minute.',
      })
    ).toThrow(/FRED_TEST_API_KEY/)
  })
})

describe('request budget', () => {
  it('leaves headroom over what the suite actually spends', () => {
    // Each spec file that calls FRED makes two requests; the cap is the thing
    // that makes adding a third a deliberate act rather than a drift.
    expect(MAX_FRED_REQUESTS_PER_FILE).toBeGreaterThanOrEqual(2)
    // And stays far below FRED's 120/minute, since a run takes seconds.
    expect(MAX_FRED_REQUESTS_PER_FILE).toBeLessThan(20)
  })
})
