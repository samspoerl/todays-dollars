// This module calls the FRED API.

import { FredResponse } from '@/lib/fred/fred-types'
import { type InflationMeasure, type ServerResponse } from '@/lib/types'

// FRED API query params
const FRED_API_KEY = process.env.FRED_API_KEY
const FRED_URL = 'https://api.stlouisfed.org/fred/series/observations'
const CPI_SERIES_ID = 'CPIAUCSL'
const PCE_SERIES_ID = 'PCEPI'
const FILE_TYPE = 'json'
const UNITS = 'pch'
const LIMIT = null

/**
 * FRED's documented rate limit is 120 requests per minute per key. Over it, the
 * API replies 429 — which is worth telling apart from every other failure,
 * because it is the one that succeeds on retry.
 */
const TOO_MANY_REQUESTS = 429

/**
 * FRED reports its own errors as a JSON body with these fields, and pairs them
 * with a non-2xx status (a bad key or an unknown series is a 400). The body
 * parses cleanly, so a caller that only checks for a thrown error sees a
 * successful response carrying no `observations` at all.
 */
interface FredErrorBody {
  error_code?: number
  error_message?: string
}

/** Fetch latest inflation data from FRED.
 */
export async function callFred(
  inflationMeasure: InflationMeasure
): Promise<ServerResponse<FredResponse>> {
  // Determine the series ID based on the inflation measure
  const seriesId = inflationMeasure === 'PCE' ? PCE_SERIES_ID : CPI_SERIES_ID

  // Build the URI for the FRED API request
  const uri = `${FRED_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=${FILE_TYPE}&units=${UNITS}${LIMIT ? `&limit=${LIMIT}` : ''}`

  try {
    const fredRes = await fetch(uri)

    // Check the status before trusting the body. `fetch` only rejects on a
    // network-level failure, so without this a 429 or a 400 would parse as JSON
    // and return `ok: true` wrapping `{ error_code, error_message }` — and the
    // caller in `inflation-data.ts` would then read `.observations` off an
    // object that has none.
    if (!fredRes.ok) {
      // Surfaced separately because it is transient and retryable, unlike a bad
      // key or an unknown series. `Retry-After` is echoed when FRED sends it so
      // a caller has something to act on.
      if (fredRes.status === TOO_MANY_REQUESTS) {
        const retryAfter = fredRes.headers.get('retry-after')
        console.error(
          `FRED API rate limit exceeded (429).`,
          retryAfter ? `Retry-After: ${retryAfter}s` : ''
        )
        return {
          ok: false,
          message: retryAfter
            ? `FRED rate limit reached. Try again in ${retryAfter} seconds.`
            : 'FRED rate limit reached. Please try again in a minute.',
        }
      }

      // Read FRED's own error message when it sent one, but never let a
      // malformed body turn a clean HTTP error into an unhandled parse throw.
      const body: FredErrorBody = await fredRes.json().catch(() => ({}))
      console.error(
        `FRED API returned ${fredRes.status}:`,
        body.error_message ?? '(no error_message in body)'
      )
      return {
        ok: false,
        message: 'An unexpected error has occurred.',
      }
    }

    const data = await fredRes.json()

    // A 200 with no observations array is not something FRED is expected to
    // send, but it is the one shape that would fail deep inside the caller's
    // `.map()` rather than here, so it is rejected at the boundary.
    if (!data || !Array.isArray(data.observations)) {
      console.error('FRED API returned no observations array.')
      return {
        ok: false,
        message: 'An unexpected error has occurred.',
      }
    }

    return {
      ok: true,
      data: data,
    }
  } catch (error) {
    console.error('Error while fetching from FRED API:', error)
    return {
      ok: false,
      message: 'An unexpected error has occurred.',
    }
  }
}
