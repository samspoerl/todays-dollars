// This module fetches the inflation data (observations) from cache or FRED (if stale).
'use server'

import { callFred } from '@/lib/fred/fred-api'
import {
  type InflationMeasure,
  type Observation,
  type ServerResponse,
} from '@/lib/types'
import { redis } from './redis'

const CACHE_EXPIRY = 60 * 60 * 24 * 7 // 7 days in seconds
const FORCE_REFRESH = false

async function fetchAndCacheInflationData(
  inflationMeasure: InflationMeasure
): Promise<ServerResponse<Observation[]>> {
  // Fetch latest inflation data from FRED API
  const fredRes = await callFred(inflationMeasure)
  if (!fredRes.ok) {
    return fredRes
  }

  const data = fredRes.data

  const transformed: Observation[] = data.observations.map((obs) => ({
    date: obs.date,
    value: obs.value === '.' ? 0 : parseFloat(obs.value),
  }))

  // Store in Redis with expiration
  await redis.set(inflationMeasure, JSON.stringify(transformed), {
    ex: CACHE_EXPIRY,
  })

  return {
    ok: true,
    data: transformed,
  }
}

function transformCachedData(cachedData: any[]): ServerResponse<Observation[]> {
  try {
    // Parse the string into an array of Observation objects
    const observations: Observation[] = cachedData.map((obs) => ({
      date: obs.date,
      value: parseFloat(obs.value),
    }))

    return {
      ok: true,
      data: observations,
    }
  } catch (error) {
    console.error('Error parsing cached inflation data:', error)
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

export async function getInflationData(
  inflationMeasure: InflationMeasure
): Promise<ServerResponse<Observation[]>> {
  // Try to get from cache first
  const cachedData = await redis.get(inflationMeasure)

  if (cachedData && !FORCE_REFRESH) {
    return transformCachedData(cachedData as any[])
  }

  // If not in cache, fetch and cache
  return fetchAndCacheInflationData(inflationMeasure)
}
