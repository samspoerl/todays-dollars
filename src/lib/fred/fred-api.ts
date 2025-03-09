// This module calls the FRED API.
'use server'

import { FredResponse } from '@/lib/fred/fred-types'
import { ServerResponse } from '@/lib/types'

// FRED API query params
const FRED_API_KEY = process.env.FRED_API_KEY
const FRED_URL = 'https://api.stlouisfed.org/fred/series/observations'
const SERIES_ID = 'CPIAUCSL'
const FILE_TYPE = 'json'
const UNITS = 'pch'
const LIMIT = null

/** Fetch latest inflation data from FRED.
 */
export async function callFred(): Promise<ServerResponse<FredResponse>> {
  const uri = `${FRED_URL}?series_id=${SERIES_ID}&api_key=${FRED_API_KEY}&file_type=${FILE_TYPE}&units=${UNITS}${LIMIT ? `&limit=${LIMIT}` : ''}`

  try {
    const fredRes = await fetch(uri)
    const data = await fredRes.json()

    return {
      ok: true,
      data: data,
    }
  } catch (error) {
    console.error('Error while fetching from FRED API:', error)
    if (error instanceof Error) {
      return {
        ok: false,
        message: error.message,
      }
    }
    return {
      ok: false,
      message: 'An unexpected error has occurred.',
    }
  }
}
