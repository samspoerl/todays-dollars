export type Theme = 'light' | 'dark'

export type ServerResponse<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      message: string
    }

export interface Observation {
  date: string
  value: number
}

export interface Outputs {
  startingAmount: number
  year: number
  observations: Observation[]
}
