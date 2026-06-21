---
paths:
  - "src/lib/types.ts"
  - "src/lib/select-schemas.ts"
  - "prisma/schema.prisma"
---

# TypeScript Conventions

## DTO types

Types live in `src/lib/types.ts`. Build them from generated Prisma types:

```ts
type AuditFields = 'createdAt' | 'updatedAt'

export type ObservationDto = Omit<Observation, AuditFields | 'fredDate'>
export type ObservationCreateDto = Omit<Observation, AuditFields | 'id'>
```

- Suffix resource types with `Dto`
- Define a shared `AuditFields` type alias and omit it from all Dtos
- Omit `id` from create types

## Prisma select schemas

Define select objects in `src/lib/select-schemas.ts` and reuse them in Prisma queries:

```ts
export const observationSelect = {
  id: true,
  inflationMeasure: true,
  year: true,
  month: true,
  value: true,
}
```
