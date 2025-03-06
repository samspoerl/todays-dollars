'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Body } from '@/components/typography'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatUSD } from '@/lib/utils'
import { PlayIcon } from 'lucide-react'
import { toast } from 'sonner'

const currentYear = new Date().getFullYear()

const formSchema = z.object({
  inflationMeasure: z.enum(['cpi', 'pce']),
  amount: z.coerce.number().positive('Amount must be positive'),
  year: z.coerce
    .number()
    .int()
    .min(1947, 'Year must be 1947 or later')
    .max(currentYear, `Year must be ${currentYear} or earlier`),
})

export function InputForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 100,
      inflationMeasure: 'cpi',
      year: 1975,
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast.success('Successful', {
      description: (
        <div className="mt-2 text-sm">
          <div>
            <strong>Amount:</strong> {formatUSD(values.amount)}
          </div>
          <div>
            <strong>Year:</strong> {values.year}
          </div>
          <div>
            <strong>Measure:</strong> {values.inflationMeasure.toUpperCase()}
          </div>
        </div>
      ),
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8"
      >
        <FormField
          control={form.control}
          name="inflationMeasure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inflation Measure</FormLabel>
              <FormControl>
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Body className="inline">How much would </Body>
          <FormField
            control={form.control}
            name="amount"
            render={({ field, fieldState }) => (
              <FormItem className="mx-1 inline-block">
                <Tooltip>
                  <TooltipTrigger>
                    <FormControl>
                      <Input
                        {...field}
                        className="inline-block w-14"
                        placeholder="100"
                      />
                    </FormControl>
                  </TooltipTrigger>
                  {fieldState.error && (
                    <TooltipContent>{fieldState.error.message}</TooltipContent>
                  )}
                </Tooltip>
              </FormItem>
            )}
          />
          <Body className="inline"> dollars in </Body>
          <FormField
            control={form.control}
            name="year"
            render={({ field, fieldState }) => (
              <FormItem className="mx-1 inline-block">
                <Tooltip>
                  <TooltipTrigger>
                    <FormControl>
                      <Input
                        {...field}
                        className="inline-block w-14"
                        placeholder="1975"
                      />
                    </FormControl>
                  </TooltipTrigger>
                  {fieldState.error && (
                    <TooltipContent>{fieldState.error.message}</TooltipContent>
                  )}
                </Tooltip>
              </FormItem>
            )}
          />
          <Body className="inline"> be worth in today&apos;s dollars?</Body>
        </div>

        <Button type="submit" className="self-end">
          <PlayIcon />
          Run
        </Button>
      </form>
    </Form>
  )
}
