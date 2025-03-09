'use server'

import { getInflationData } from '@/lib/inflation-data'
import { Observation, ServerResponse } from '@/lib/types'

export async function getInflationAdjustedAmounts(
  startingAmount: number,
  startYear: number
): Promise<ServerResponse<Observation[]>> {
  const res = await getInflationData()
  if (!res.ok) {
    return res
  }

  const observations = res.data

  // Find the first observation for the specified year
  const startIndex = observations.findIndex((obs) =>
    obs.date.startsWith(startYear.toString())
  )

  // If the year wasn't found, return an error
  if (startIndex === -1) {
    return {
      ok: false,
      message: `No data available for the year ${startYear}. Data is available from ${observations[0].date.slice(0, 4)} to ${observations.at(-1)?.date.slice(0, 4)}.`,
    }
  }

  // Get observations from the start year to the end
  const relevantObservations = observations.slice(startIndex)

  // If there are no relevant observations, return an error
  if (relevantObservations.length === 0) {
    return {
      ok: false,
      message: 'No observations found for the specified criteria.',
    }
  }

  let runningValue: number = startingAmount
  const inflationAdjAmounts: Observation[] = []

  for (let i = 0; i < relevantObservations.length; i++) {
    const pctChange = relevantObservations[i].value
    const pctChangeDecimal = pctChange / 100
    runningValue = runningValue * (1 + pctChangeDecimal)
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
