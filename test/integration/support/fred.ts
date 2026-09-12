import { type ServerResponse } from '@/lib/types'

/**
 * Guard and helpers for the FRED half of the integration suite.
 *
 * The database guard (`./guard.ts`) protects rows. This one protects something
 * cheaper but easier to break: **the API key's rate limit.** FRED allows 120
 * requests per minute per key, and every call here fetches a full series
 * (~950 monthly observations), so the suite is nowhere near the ceiling — but
 * only as long as it stays deliberate about how many calls it makes.
 *
 * Nothing here costs money and nothing is destructive, which is why this file
 * is much shorter than the finance-demo equivalent it is modelled on. FRED is
 * a read-only public data API; the worst outcome of a mistake is a throttled
 * key and a confusing red build.
 *
 * ## Request budget
 *
 * Only two spec files call FRED, and between them the whole suite makes **4**
 * real requests per run:
 *
 * | Spec                          | Requests |
 * | ----------------------------- | -------- |
 * | `lib/fred/fred-api.test.ts`   | 2 (CPI, PCE) |
 * | `lib/inflation-data.test.ts`  | 2 (missing cache, stale cache) |
 *
 * `MAX_FRED_REQUESTS_PER_FILE` makes that ceiling fail loudly rather than
 * drift. Note it is enforced **per spec file**, not suite-wide: vitest gives
 * each file its own module graph, so the counter resets between files. That is
 * accurate enough to catch the mistake it is aimed at — a loop or a
 * `beforeEach` that turns one call into fifty — and `fileParallelism: false`
 * means the files never overlap in time anyway.
 *
 * Error-path coverage (429, 400, malformed bodies) deliberately lives in
 * `test/unit/lib/fred/fred-api.test.ts` with a stubbed `fetch`. Provoking a
 * real 429 would mean exceeding the very limit this file exists to respect.
 */

/** FRED's documented limit, for reference. The suite uses ~3% of it. */
export const FRED_RATE_LIMIT_PER_MINUTE = 120

/** Ceiling per spec file. See the note on scoping above. */
export const MAX_FRED_REQUESTS_PER_FILE = 3

let requestCount = 0

/**
 * Call before every real FRED request. Throws once the file's budget is spent,
 * so a spec that accidentally fetches in a loop fails on its own terms instead
 * of getting the key throttled.
 */
export function countFredRequest(): void {
  requestCount += 1

  if (requestCount > MAX_FRED_REQUESTS_PER_FILE) {
    throw new Error(
      `FRED request budget exceeded: this spec file made ${requestCount} ` +
        `requests, the cap is ${MAX_FRED_REQUESTS_PER_FILE}. FRED allows ` +
        `${FRED_RATE_LIMIT_PER_MINUTE}/minute and each call fetches a full ` +
        `series. If a new spec genuinely needs another request, raise the cap ` +
        `deliberately and update the budget table in support/fred.ts.`
    )
  }
}

/**
 * Whether a FRED key is available at all.
 *
 * Specs gate on this with `describe.skipIf(...)` so a fork or a Dependabot PR —
 * neither of which can read repository secrets — skips these rather than
 * failing. A missing credential is "not runnable here", not "broken".
 */
export function hasFredCredentials(): boolean {
  return Boolean(process.env.FRED_API_KEY)
}

/**
 * Turn a throttled run into a clear message instead of a puzzling assertion
 * failure.
 *
 * A 429 here does not mean the code is wrong — it means this key was busy,
 * most likely because a local run and a CI run overlapped. `callFred` reports
 * that case distinctly (see `src/lib/fred/fred-api.ts`), and this recognises
 * the message it produces so the spec fails saying "rate limited" rather than
 * "expected ok: true".
 */
export function assertNotRateLimited<T>(result: ServerResponse<T>): void {
  if (!result.ok && /rate limit|too many requests/i.test(result.message)) {
    throw new Error(
      `FRED rate-limited this run: "${result.message}". This is an ` +
        `environment problem, not a test failure — the key is shared between ` +
        `local runs and CI. Re-run in a minute, or use a separate ` +
        `FRED_TEST_API_KEY.`
    )
  }
}
