'use client'

import PageWrapper from '@/components/PageWrapper'
import { Body, H1 } from '@/components/typography'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatUSD } from '@/lib/utils'
import { useState } from 'react'

export default function HomePage() {
  const [inputDollars, setInputDollars] = useState(100)
  const [inputYear, setInputYear] = useState(1975)
  const [outputDollars, setOutputDollars] = useState(547)

  return (
    <PageWrapper>
      <H1>How much is that in today&apos;s dollars?</H1>
      <div className="flex flex-col gap-2">
        <Body className="font-semibold">Inflation Measure</Body>
        <RadioGroup defaultValue="cpi" className="flex flex-row">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cpi" id="cpi" />
            <Label htmlFor="cpi">CPI</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pce" id="pce" />
            <Label htmlFor="pce">PCE</Label>
          </div>
        </RadioGroup>
      </div>
      <Body>
        How much would{' '}
        <Input
          className="inline w-14"
          placeholder="100"
          value={inputDollars}
          onChange={() => setInputDollars}
        />{' '}
        dollars in{' '}
        <Input
          className="inline w-14"
          placeholder="1975"
          value={inputYear}
          onChange={() => setInputYear}
        />{' '}
        be worth in today&apos;s dollars?
      </Body>
      <Tooltip>
        <TooltipTrigger className="mr-auto">
          <div className="rounded-lg border px-4 py-2 shadow-xs">
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
