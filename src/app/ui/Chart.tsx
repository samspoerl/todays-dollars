'use client'

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Observation } from '@/lib/types'

// const chartData: Observation[] = [
//   { date: 'January', value: 100 },
//   { date: 'February', value: 101 },
//   { date: 'March', value: 101.5 },
//   { date: 'April', value: 103 },
//   { date: 'May', value: 105 },
//   { date: 'June', value: 108 },
// ]

const chartConfig = {
  value: {
    label: 'Inflation Adjusted Amount',
    color: '#2563eb',
  },
} satisfies ChartConfig

interface ChartProps {
  chartData: Observation[]
}

export function Chart({ chartData }: ChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <AreaChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area dataKey="value" fill="var(--color-value)" radius={4} />
      </AreaChart>
    </ChartContainer>
  )
}
