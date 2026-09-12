import { callFred } from '@/lib/fred/fred-api'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `callFred` is not a pure function, so by the suite's own rule it does not
 * belong here — but its error branches cannot be reached from the integration
 * suite either. Provoking a real 429 would mean deliberately exceeding the
 * rate limit that `test/integration/support/fred.ts` exists to respect, and a
 * 400 would mean sending a knowingly-bad key on every run.
 *
 * So the split is by what the test can actually establish: this file stubs
 * `fetch` and covers the branching, at no request cost; the integration spec
 * makes two real calls and covers the contract — that FRED still returns the
 * shape this code reads.
 *
 * Real `Response` objects are used rather than hand-rolled fakes, so `.ok`,
 * `.status`, `.headers` and `.json()` behave the way they will in production.
 * That matters here: the whole bug this guards against was trusting a parsed
 * body without checking the status.
 */

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  // The error paths log deliberately; keep the suite output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** A minimal well-formed FRED payload. */
function fredPayload(observations: { date: string; value: string }[] = []) {
  return {
    realtime_start: '2026-01-01',
    realtime_end: '2026-01-01',
    observation_start: '1947-01-01',
    observation_end: '2026-01-01',
    units: 'pch',
    output_type: 1,
    file_type: 'json',
    order_by: 'observation_date',
    sort_order: 'asc',
    count: observations.length,
    offset: 0,
    limit: 100000,
    observations: observations.map((o) => ({
      realtime_start: '2026-01-01',
      realtime_end: '2026-01-01',
      ...o,
    })),
  }
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('callFred', () => {
  describe('request construction', () => {
    it('requests the CPI series for CPI', async () => {
      fetchMock.mockResolvedValue(jsonResponse(fredPayload()))

      await callFred('CPI')

      const uri = fetchMock.mock.calls[0][0] as string
      expect(uri).toContain('series_id=CPIAUCSL')
    })

    it('requests the PCE series for PCE', async () => {
      fetchMock.mockResolvedValue(jsonResponse(fredPayload()))

      await callFred('PCE')

      const uri = fetchMock.mock.calls[0][0] as string
      expect(uri).toContain('series_id=PCEPI')
    })

    it('asks for monthly percentage change, which the caller depends on', async () => {
      fetchMock.mockResolvedValue(jsonResponse(fredPayload()))

      await callFred('CPI')

      const uri = fetchMock.mock.calls[0][0] as string
      // `units=pch` is why `calculate.ts` can compound the values directly.
      // A change to `lin` would return index levels and silently produce
      // nonsense rather than an error.
      expect(uri).toContain('units=pch')
      expect(uri).toContain('file_type=json')
    })

    it('sends no limit, so the full series comes back', async () => {
      fetchMock.mockResolvedValue(jsonResponse(fredPayload()))

      await callFred('CPI')

      const uri = fetchMock.mock.calls[0][0] as string
      expect(uri).not.toContain('limit=')
    })
  })

  describe('success', () => {
    it('returns the parsed payload', async () => {
      const payload = fredPayload([
        { date: '1947-01-01', value: '.' },
        { date: '1947-02-01', value: '0.5' },
      ])
      fetchMock.mockResolvedValue(jsonResponse(payload))

      const result = await callFred('CPI')

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.data.observations).toHaveLength(2)
      expect(result.data.observations[0].value).toBe('.')
    })

    it('accepts an empty observations array', async () => {
      // Empty is well-formed, just uninteresting. `inflation-data.ts` is what
      // decides an empty series is a problem, not this boundary.
      fetchMock.mockResolvedValue(jsonResponse(fredPayload([])))

      const result = await callFred('CPI')

      expect(result.ok).toBe(true)
    })
  })

  describe('rate limiting', () => {
    /**
     * The branch this whole file was written for. FRED allows 120 requests per
     * minute per key; over it the answer is a 429, and it is the one failure
     * that succeeds on retry — so it must be distinguishable from a bad key.
     */
    it('reports a 429 distinctly, with the Retry-After delay', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { error_code: 429, error_message: 'Too Many Requests' },
          { status: 429, headers: { 'retry-after': '30' } }
        )
      )

      const result = await callFred('CPI')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.message).toBe(
        'FRED rate limit reached. Try again in 30 seconds.'
      )
    })

    it('still reports a 429 when no Retry-After header is sent', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ error_code: 429 }, { status: 429 })
      )

      const result = await callFred('CPI')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.message).toBe(
        'FRED rate limit reached. Please try again in a minute.'
      )
    })

    /**
     * The message is load-bearing, not decoration:
     * `test/integration/support/fred.ts` matches on it to turn a throttled CI
     * run into "rate limited" rather than a confusing assertion failure.
     */
    it('produces a message the integration harness recognises', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ error_code: 429 }, { status: 429 })
      )

      const result = await callFred('CPI')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.message).toMatch(/rate limit|too many requests/i)
    })
  })

  describe('HTTP errors', () => {
    /**
     * The original bug, pinned. FRED answers a bad key or an unknown series
     * with **400 and a JSON body** — which parses cleanly. Before the status
     * check, this returned `{ ok: true }` wrapping `{ error_code,
     * error_message }`, and `fetchAndCacheInflationData` then called `.map()`
     * on an `observations` property that did not exist, throwing a TypeError
     * out through the Server Action.
     */
    it('rejects a 400 rather than returning its error body as data', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            error_code: 400,
            error_message:
              'Bad Request.  The value for variable api_key is not registered.',
          },
          { status: 400 }
        )
      )

      const result = await callFred('CPI')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.message).toBe('An unexpected error has occurred.')
    })

    it('rejects a 500', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { error_message: 'Internal Server Error' },
          { status: 500 }
        )
      )

      expect((await callFred('CPI')).ok).toBe(false)
    })

    it('rejects a non-2xx whose body is not JSON at all', async () => {
      // An HTML error page from a proxy, say. The status check must not be
      // undone by the body parse throwing.
      fetchMock.mockResolvedValue(
        new Response('<html>502 Bad Gateway</html>', { status: 502 })
      )

      const result = await callFred('CPI')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.message).toBe('An unexpected error has occurred.')
    })
  })

  describe('malformed success bodies', () => {
    /**
     * A 200 carrying no observations array is not a shape FRED is expected to
     * send — but it is the one that would fail deep inside the caller's
     * `.map()` instead of at this boundary, so it is rejected here.
     */
    it('rejects a 200 with no observations array', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ count: 0 }))

      expect((await callFred('CPI')).ok).toBe(false)
    })

    it('rejects a 200 whose observations is not an array', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ observations: 'nope' }))

      expect((await callFred('CPI')).ok).toBe(false)
    })

    it('rejects a 200 with a null body', async () => {
      fetchMock.mockResolvedValue(jsonResponse(null))

      expect((await callFred('CPI')).ok).toBe(false)
    })

    it('rejects a 200 whose body is not JSON', async () => {
      fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))

      expect((await callFred('CPI')).ok).toBe(false)
    })
  })

  describe('network failure', () => {
    it('returns a failure when fetch rejects', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'))

      const result = await callFred('CPI')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.message).toBe('An unexpected error has occurred.')
    })

    it('never throws, so the Server Action always gets a ServerResponse', async () => {
      fetchMock.mockRejectedValue(new Error('boom'))

      await expect(callFred('CPI')).resolves.toBeDefined()
    })
  })
})
