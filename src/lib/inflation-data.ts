// This module fetches the inflation data (observations) from cache or FRED (if stale).
'use server'

import { callFred } from '@/lib/fred/fred-api'
import { Observation, ServerResponse } from '@/lib/types'
import { redis } from './redis'

const CACHE_KEY = 'cpi_data'
const CACHE_EXPIRY = 60 * 60 * 24 * 7 // 7 days in seconds
const FORCE_REFRESH = false

async function fetchAndCacheInflationData(): Promise<
  ServerResponse<Observation[]>
> {
  // Fetch latest inflation data from FRED API
  const fredRes = await callFred()
  if (!fredRes.ok) {
    return fredRes
  }

  const data = fredRes.data

  const transformed: Observation[] = data.observations.map((obs) => ({
    date: obs.date,
    value: obs.value === '.' ? 0 : parseFloat(obs.value),
  }))

  // Store in Redis with expiration
  await redis.set(CACHE_KEY, JSON.stringify(transformed), { ex: CACHE_EXPIRY })

  return {
    ok: true,
    data: transformed,
  }
}

export async function getInflationData(): Promise<
  ServerResponse<Observation[]>
> {
  // Try to get from cache first
  const cachedData = await redis.get(CACHE_KEY)

  if (cachedData && !FORCE_REFRESH) {
    try {
      // Parse the string into an array of Observation objects
      const observations: Observation[] = (cachedData as any[]).map((obs) => ({
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

  // If not in cache, fetch and cache
  return fetchAndCacheInflationData()
}
