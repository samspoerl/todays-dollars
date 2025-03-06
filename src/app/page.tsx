'use client'

import PageWrapper from '@/components/PageWrapper'
import { Body, H1, H2 } from '@/components/typography'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatUSD } from '@/lib/utils'
import { useState } from 'react'
import { InputForm } from './ui/InputForm'

export default function HomePage() {
  const [inputDollars, setInputDollars] = useState(100)
  const [inputYear, setInputYear] = useState(1975)
  const [outputDollars, setOutputDollars] = useState(547)

  return (
    <PageWrapper>
      <H1>How much is that in today&apos;s dollars?</H1>
      <H2>Inputs</H2>
      <InputForm />
      <H2>Outputs</H2>
      <Tooltip>
        <TooltipTrigger className="mr-auto">
          <div className="rounded-lg border px-6 py-4 shadow-xs">
            <Body className="text-xl font-semibold">
              {formatUSD(outputDollars)}
            </Body>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <Body>
            <span className="underline underline-offset-2">
              {formatUSD(inputDollars)}
            </span>{' '}
            in <span className="underline underline-offset-2">{inputYear}</span>{' '}
            would be worth{' '}
            <span className="underline underline-offset-2">
              {formatUSD(outputDollars)}
            </span>{' '}
            in today&apos;s dollars.
          </Body>
        </TooltipContent>
      </Tooltip>
      <div className="flex size-40 items-center justify-center rounded-lg border shadow-xs">
        <Body>Chart</Body>
      </div>
    </PageWrapper>
  )
}
