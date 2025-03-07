/**
 * Represents a single observation/data point from the FRED API
 */
export interface FredObservation {
  /**
   * The date when this observation became available with the current value
   */
  realtime_start: string

  /**
   * The end date when this observation was available with the current value
   */
  realtime_end: string

  /**
   * The date of the observation (YYYY-MM-DD)
   */
  date: string

  /**
   * The value of the observation as a string (can be parsed to number if needed)
   */
  value: string
}

/**
 * Represents the full response from the FRED API
 */
export interface FredResponse {
  /**
   * The start date of the real-time period
   */
  realtime_start: string

  /**
   * The end date of the real-time period
   */
  realtime_end: string

  /**
   * The start date of the observation period
   */
  observation_start: string

  /**
   * The end date of the observation period
   */
  observation_end: string

  /**
   * The units of the data series (e.g., "lin" for linear)
   */
  units: string

  /**
   * The output type (1 for regular data)
   */
  output_type: number

  /**
   * The file type of the response (e.g., "json")
   */
  file_type: string

  /**
   * The field to order results by
   */
  order_by: string

  /**
   * The sort order of results (e.g., "asc" for ascending)
   */
  sort_order: string

  /**
   * The total number of observations in the data series
   */
  count: number

  /**
   * The offset into the total set of observations
   */
  offset: number

  /**
   * The maximum number of observations to return
   */
  limit: number

  /**
   * The array of observations/data points
   */
  observations: FredObservation[]
}
