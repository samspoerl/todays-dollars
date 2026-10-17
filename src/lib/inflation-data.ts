// This module fetches the inflation data (observations) from cache or FRED (if stale).

import { callFred } from '@/lib/fred/fred-api'
import { isCacheStale, toObservationCreateDtos } from '@/lib/inflation'
import prisma from '@/lib/prisma'
import { metadataSelect, observationSelect } from '@/lib/select-schemas'
import {
  type InflationMeasure,
  type ObservationDto,
  type ServerResponse,
} from '@/lib/types'

const FORCE_REFRESH = false

// Helper: fetch and cache inflation data from FRED API
async function fetchAndCacheInflationData({
  inflationMeasure,
  startYear,
}: {
  inflationMeasure: InflationMeasure
  startYear: number
}): Promise<ServerResponse<ObservationDto[]>> {
  // Fetch latest inflation data from FRED API
  const fredRes = await callFred(inflationMeasure)
  if (!fredRes.ok) {
    return fredRes
  }
  const data = fredRes.data

  // Transform FRED data to create DTOs
  const transformed = toObservationCreateDtos(
    inflationMeasure,
    data.observations
  )

  // Clear existing observations for this measure
  await prisma.observation.deleteMany({
    where: { inflationMeasure },
  })

  // Create new observations with the latest data from FRED
  await prisma.observation.createMany({
    data: transformed,
  })

  // Update metadata
  await prisma.metadata.upsert({
    where: { inflationMeasure },
    update: {
      lastObservationDate: transformed[transformed.length - 1]?.fredDate || '',
      totalObservations: transformed.length,
    },
    create: {
      inflationMeasure,
      lastObservationDate: transformed[transformed.length - 1]?.fredDate || '',
      totalObservations: transformed.length,
    },
  })

  // Get all observations for this measure greater than or equal to the start year
  const observations = await prisma.observation.findMany({
    select: observationSelect,
    where: {
      inflationMeasure,
      year: { gte: startYear },
    },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  })

  return {
    ok: true,
    data: observations,
  }
}

// Helper: get cached observations from the database
async function getCachedObservations({
  inflationMeasure,
  startYear,
}: {
  inflationMeasure: InflationMeasure
  startYear: number
}): Promise<ServerResponse<ObservationDto[]>> {
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
    if (isCacheStale(metadata.updatedAt, Date.now())) {
      return {
        ok: false,
        message: 'Cached data is stale',
      }
    }

    // Data is fresh, get all observations for this measure
    const observations = await prisma.observation.findMany({
      select: observationSelect,
      where: {
        inflationMeasure,
        year: { gte: startYear },
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
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
export async function getInflationData({
  inflationMeasure,
  startYear,
}: {
  inflationMeasure: InflationMeasure
  startYear: number
}): Promise<ServerResponse<ObservationDto[]>> {
  // Try to get from cache first
  if (!FORCE_REFRESH) {
    const cachedResult = await getCachedObservations({
      inflationMeasure,
      startYear,
    })
    if (cachedResult.ok && cachedResult.data.length > 0) {
      return cachedResult
    }
  }

  // If not in cache or stale, fetch and cache
  return fetchAndCacheInflationData({ inflationMeasure, startYear })
}
