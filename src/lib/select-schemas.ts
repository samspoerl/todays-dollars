import { type MetadataDto, type ObservationDto } from '@/lib/types'

// These schemas are used in Prisma select statements.

// OBSERVATIONS

export const observationSelect = {
  id: true,
  inflationMeasure: true,
  year: true,
  month: true,
  value: true,
} satisfies Record<keyof ObservationDto, true>

// METADATA

export const metadataSelect = {
  id: true,
  inflationMeasure: true,
  lastObservationDate: true,
  totalObservations: true,
  createdAt: true,
  updatedAt: true,
} satisfies Record<keyof MetadataDto, true>
