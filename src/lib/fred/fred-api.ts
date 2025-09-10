// This module calls the FRED API.
'use server'

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
    const data = await fredRes.json()

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
