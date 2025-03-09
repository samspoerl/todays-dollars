'use client'

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart'
import { Observation } from '@/lib/types'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import { formatUSD } from '@/lib/utils'

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null

  // The date comes from payload[0].payload.date (this is the x-axis value)
  const dateStr = payload[0].payload.date

  // The value comes from payload[0].value (this is the y-axis value)
  const value = payload[0].value
  const formattedValue = formatUSD(value, 2)

  return (
    <div className="bg-background rounded-lg border p-2 shadow-md">
      <p className="text-xs font-medium">{dateStr}</p>
      <p className="text-xs font-semibold">{formattedValue}</p>
    </div>
  )
}

const chartConfig = {
  value: {
    label: 'Inflation-Adjusted Amount',
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
          tickFormatter={(dateStr) => dateStr.slice(0, 4)}
        />
        <ChartTooltip content={<CustomTooltip />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area dataKey="value" fill="var(--color-value)" radius={4} />
      </AreaChart>
    </ChartContainer>
  )
}
