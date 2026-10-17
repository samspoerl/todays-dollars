'use server'

import { compoundObservations } from '@/lib/inflation'
import { getInflationData } from '@/lib/inflation-data'
import logTelemetry from '@/lib/logs'
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

  const inflationAdjAmounts = compoundObservations(startAmount, observations)

  // Log metrics
  // Use 'after' to log metrics after returning response to client
  const timestamp = new Date()
  const duration = Date.now() - start
  after(logTelemetry({ timestamp, duration, inflationMeasure }))

  return {
    ok: true,
    data: inflationAdjAmounts,
  }
}
