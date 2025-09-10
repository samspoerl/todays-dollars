'use server'

import { getInflationData } from '@/lib/inflation-data'
import logMetrics from '@/lib/logs'
import {
  type CalculationInputs,
  type ObservationDto,
  type ServerResponse,
} from '@/lib/types'
import { after } from 'next/server'

export async function getInflationAdjustedAmounts({
  inflationMeasure,
  startAmount,
  startYear,
}: CalculationInputs): Promise<ServerResponse<ObservationDto[]>> {
  // Record start for duration metric
  const start = Date.now()

  // Get inflation data
  const res = await getInflationData({ inflationMeasure, startYear })
  if (!res.ok) {
    return res
  }
  const observations = res.data

  // If no observations were found, return an error
  if (observations.length === 0) {
    return {
      ok: false,
      message:
        'No inflation data exists for the specified measure and date range.',
    }
  }

  let runningValue: number = startAmount
  const inflationAdjAmounts: ObservationDto[] = []

  for (let i = 0; i < observations.length; i++) {
    const pctChange = observations[i].value
    const pctChangeDecimal = pctChange / 100
    runningValue = runningValue * (1 + pctChangeDecimal)
    inflationAdjAmounts.push({
      id: observations[i].id,
      inflationMeasure,
      year: observations[i].year,
      month: observations[i].month,
      value: runningValue,
    })
  }

  // Log metrics
  // Use 'after' to log metrics after returning response to client
  const timestamp = new Date()
  const duration = Date.now() - start
  after(logMetrics({ timestamp, duration, inflationMeasure }))

  return {
    ok: true,
    data: inflationAdjAmounts,
  }
}
