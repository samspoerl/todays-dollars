import PageWrapper from '@/components/PageWrapper'
import { H1 } from '@/components/typography'
import { INFLATION_MEASURE_COOKIE } from '@/lib/constants'
import { InflationMeasure } from '@/lib/types'
import { cookies } from 'next/headers'
import { CalculatorView } from './ui/CalculatorView'

const DEFAULT_MEASURE: InflationMeasure = 'CPI'

export default async function HomePage() {
  const cookieStore = await cookies()
  const stored = cookieStore.get(INFLATION_MEASURE_COOKIE)?.value
  const initialMeasure: InflationMeasure =
    stored === 'CPI' || stored === 'PCE' ? stored : DEFAULT_MEASURE

  return (
    <PageWrapper>
      <H1>How much is that in today&apos;s dollars?</H1>
      <CalculatorView initialMeasure={initialMeasure} />
    </PageWrapper>
  )
}
