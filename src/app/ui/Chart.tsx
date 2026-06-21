'use client'

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart'
import { ObservationDto } from '@/lib/types'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import { formatUSD } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface TooltipEntry {
  value?: number
  payload?: { year: number; month: number }
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) => {
  if (!active || !payload || !payload.length) return null

  const { year, month } = payload[0].payload!
  const dateLabel = `${MONTHS[month - 1]} ${year}`
  const value = payload[0].value ?? 0
  const formattedValue = formatUSD(value, 2)

  return (
    <div className="bg-background rounded-lg border p-2 shadow-md">
      <p className="text-xs font-medium">{dateLabel}</p>
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
  chartData: ObservationDto[]
}

export function Chart({ chartData }: ChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <AreaChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="year"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(year) => String(year)}
        />
        <ChartTooltip content={<CustomTooltip />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area dataKey="value" fill="var(--color-value)" radius={4} />
      </AreaChart>
    </ChartContainer>
  )
}
