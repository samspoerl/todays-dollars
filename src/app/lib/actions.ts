'use server'

import { getInflationData } from '@/lib/inflation-data'
import logMetrics from '@/lib/logs'
import { type Inputs, type Observation, type ServerResponse } from '@/lib/types'
import { after } from 'next/server'

export async function getInflationAdjustedAmounts({
  inflationMeasure,
  startAmount,
  startYear,
}: Inputs): Promise<ServerResponse<Observation[]>> {
  const start = Date.now()

  const res = await getInflationData(inflationMeasure)
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
      message: `No data is available for the ${inflationMeasure.toUpperCase()} measure for the year ${startYear}. Data is available from ${observations[0].date.slice(0, 4)} to ${observations.at(-1)?.date.slice(0, 4)}.`,
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

  let runningValue: number = startAmount
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

  const duration = Date.now() - start

  if (process.env.VERCEL_ENV === 'production') {
    // Use 'after' to log metrics after returning response to client
    after(logMetrics(duration, inflationMeasure))
  }

  return {
    ok: true,
    data: inflationAdjAmounts,
  }
}
