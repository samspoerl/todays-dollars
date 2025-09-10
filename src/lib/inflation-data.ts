// This module fetches the inflation data (observations) from cache or FRED (if stale).
'use server'

import { callFred } from '@/lib/fred/fred-api'
import prisma from '@/lib/prisma'
import { metadataSelect, observationSelect } from '@/lib/select-schemas'
import {
  type InflationMeasure,
  type ObservationCreateDto,
  type ObservationDto,
  type ServerResponse,
} from '@/lib/types'

const CACHE_EXPIRY_DAYS = 7 // 7 days
const FORCE_REFRESH = true

// Helper: fetch and cache inflation data from FRED API
async function fetchAndCacheInflationData(
  inflationMeasure: InflationMeasure
): Promise<ServerResponse<ObservationDto[]>> {
  // Fetch latest inflation data from FRED API
  const fredRes = await callFred(inflationMeasure)
  if (!fredRes.ok) {
    return fredRes
  }
  const data = fredRes.data

  // Transform FRED data to create DTOs
  const transformed: ObservationCreateDto[] = data.observations.map((obs) => ({
    inflationMeasure,
    date: obs.date,
    value: obs.value === '.' ? 0 : parseFloat(obs.value),
  }))

  // Clear existing observations for this measure
  await prisma.observation.deleteMany({
    where: { inflationMeasure },
  })

  // Create new observations with the latest data from FRED
  await prisma.observation.createMany({
    data: transformed,
  })

  // Get the observations just created
  const observations = await prisma.observation.findMany({
    where: { inflationMeasure },
    select: observationSelect,
  })

  // Update metadata
  await prisma.metadata.upsert({
    where: { inflationMeasure },
    update: {
      lastObservationDate: observations[observations.length - 1]?.date || '',
      totalObservations: observations.length,
    },
    create: {
      inflationMeasure,
      lastObservationDate: observations[observations.length - 1]?.date || '',
      totalObservations: observations.length,
    },
  })

  return {
    ok: true,
    data: observations,
  }
}

// Helper: get cached observations from MongoDB
async function getCachedObservations(
  inflationMeasure: InflationMeasure
): Promise<ServerResponse<ObservationDto[]>> {
  try {
    // Get metadata to check if data is fresh
    const metadata = await prisma.metadata.findUnique({
      select: metadataSelect,
      where: { inflationMeasure },
    })

    if (!metadata) {
      return {
        ok: false,
        message: 'No cached data found',
      }
    }

    // Check if data is stale
    const daysSinceUpdate = Math.floor(
      (Date.now() - metadata.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceUpdate >= CACHE_EXPIRY_DAYS) {
      return {
        ok: false,
        message: 'Cached data is stale',
      }
    }

    // Data is fresh, get all observations for this measure
    const observations = await prisma.observation.findMany({
      select: observationSelect,
      where: { inflationMeasure },
      orderBy: { date: 'asc' },
    })

    return {
      ok: true,
      data: observations,
    }
  } catch (error) {
    console.error('Error getting cached observations:', error)
    return {
      ok: false,
      message: 'An unexpected error has occurred.',
    }
  }
}

// Main function to get inflation data
export async function getInflationData(
  inflationMeasure: InflationMeasure
): Promise<ServerResponse<ObservationDto[]>> {
  // Try to get from cache first
  if (!FORCE_REFRESH) {
    const cachedResult = await getCachedObservations(inflationMeasure)
    if (cachedResult.ok) {
      return cachedResult
    }
  }

  // If not in cache or stale, fetch and cache
  return fetchAndCacheInflationData(inflationMeasure)
}
