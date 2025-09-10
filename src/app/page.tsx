'use client'

import PageWrapper from '@/components/PageWrapper'
import { Body, H1, H2 } from '@/components/typography'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ObservationDto, Outputs } from '@/lib/types'
import { formatUSD } from '@/lib/utils'
import { useState } from 'react'
import { Chart } from './ui/Chart'
import { InputForm } from './ui/InputForm'

export default function HomePage() {
  const [inputDollars, setInputDollars] = useState<number>()
  const [inputYear, setInputYear] = useState<number>()
  const [outputDollars, setOutputDollars] = useState<number | null>()
  const [observations, setObservations] = useState<ObservationDto[]>([])

  function handleSubmit(outputs: Outputs) {
    setInputDollars(outputs.startingAmount)
    setInputYear(outputs.year)
    setObservations(outputs.observations)
    setOutputDollars(
      outputs.observations[outputs.observations.length - 1].value
    )
  }

  return (
    <PageWrapper>
      <H1>How much is that in today&apos;s dollars?</H1>
      <H2>Inputs</H2>
      <InputForm handleSubmitInParent={handleSubmit} />
      <H2>Outputs</H2>
      <Tooltip>
        <TooltipTrigger className="mr-auto flex flex-row items-center gap-2">
          <div className="rounded-lg border px-6 py-4 shadow-xs">
            <Body className="text-xl font-semibold">
              {outputDollars ? formatUSD(outputDollars) : '$ -'}
            </Body>
          </div>
          <Body>{"in today's dollars"}</Body>
        </TooltipTrigger>
        {outputDollars && inputDollars && (
          <TooltipContent>
            <Body>
              <span className="underline underline-offset-2">
                {formatUSD(inputDollars)}
              </span>{' '}
              in{' '}
              <span className="underline underline-offset-2">{inputYear}</span>{' '}
              would be worth{' '}
              <span className="underline underline-offset-2">
                {formatUSD(outputDollars)}
              </span>{' '}
              in today&apos;s dollars.
            </Body>
          </TooltipContent>
        )}
      </Tooltip>
      <div className="flex items-center justify-center rounded-lg border shadow-xs">
        <Chart chartData={observations} />
      </div>
    </PageWrapper>
  )
}
