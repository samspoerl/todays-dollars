'use server'

import { FredResponse } from '@/lib/fred-types'
import { Observation, ServerResponse } from '@/lib/types'

// FRED API query params
const FRED_API_KEY = process.env.FRED_API_KEY
const SERIES_ID = 'CPIAUCSL'
const FILE_TYPE = 'json'
const UNITS = 'pch'
const LIMIT = 10000

// In days, how often to refresh data from FRED
const UPDATE_INTERVAL = 7

let OBSERVATIONS: Observation[] = []
let LAST_UPDATED: Date | undefined

export async function getInflationAdjustedAmounts(
  startingAmount: number,
  startYear: number
): Promise<ServerResponse<Observation[]>> {
  if (OBSERVATIONS.length === 0 || requiresUpdate()) {
    OBSERVATIONS = []
    const fredRes = await callFred()
    if (fredRes.ok) {
      // Update observations
      const fredObservations = fredRes.data.observations
      for (const observation of fredObservations) {
        OBSERVATIONS.push({
          date: observation.date,
          value: parseFloat(observation.value),
        })
      }
    } else {
      return fredRes
    }
  }

  // Find the first observation for the specified year
  const startYearString = startYear.toString()
  const startIndex = OBSERVATIONS.findIndex((obs) =>
    obs.date.startsWith(startYearString)
  )

  // If the year wasn't found, return an error
  if (startIndex === -1) {
    return {
      ok: false,
      message: `No data available for the year ${startYear}. Available data starts from ${OBSERVATIONS[0].date.split('-')[0]}.`,
    }
  }

  // Get observations from the start year to the end
  const relevantObservations = OBSERVATIONS.slice(startIndex)

  // If there are no relevant observations, return an error
  if (relevantObservations.length === 0) {
    return {
      ok: false,
      message: 'No observations found for the specified criteria.',
    }
  }

  let runningValue: number = startingAmount
  const inflationAdjAmounts: Observation[] = [
    { date: relevantObservations[0].date, value: startingAmount },
  ]

  // Skip the first iteration since that is the starting amount
  for (let i = 1; i < relevantObservations.length; i++) {
    const pctChange = relevantObservations[i].value
    const pctChangeDec = pctChange / 100
    runningValue = runningValue * (1 + pctChangeDec)
    inflationAdjAmounts.push({
      date: relevantObservations[i].date,
      value: runningValue,
    })
  }

  return {
    ok: true,
    data: inflationAdjAmounts,
  }
}

// Check if it's time to update inflation data from FRED
function requiresUpdate() {
  if (!LAST_UPDATED) {
    return true
  }

  // Calculate the absolute difference in milliseconds
  const diffTime = Math.abs(new Date().getTime() - LAST_UPDATED.getTime())

  // Update interval in milliseconds (1000ms * 60s * 60min * 24hr * update interval in days)
  const updateIntervalMs = UPDATE_INTERVAL * 24 * 60 * 60 * 1000

  // Check if more than update interval
  return diffTime > updateIntervalMs
}

// Update the inflation data from FRED
async function callFred(): Promise<ServerResponse<FredResponse>> {
  const uri = `https://api.stlouisfed.org/fred/series/observations?series_id=${SERIES_ID}&api_key=${FRED_API_KEY}&file_type=${FILE_TYPE}&units=${UNITS}`

  try {
    const fredRes = await fetch(uri, {
      next: { revalidate: 60 * 10 }, // Revalidate every 10 minutes
    })
    const data = await fredRes.json()

    return {
      ok: true,
      data: data,
    }
  } catch (error) {
    console.error(error)
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
