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
import { Outputs } from '@/lib/types'
import { PlayIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { getInflationAdjustedAmounts } from '../lib/actions'

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

interface InputFormProps {
  handleSubmitInParent: (outputs: Outputs) => void
}

export function InputForm({ handleSubmitInParent }: InputFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 100,
      inflationMeasure: 'cpi',
      year: 1975,
    },
  })

  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    // Call server action
    const res = await getInflationAdjustedAmounts(values.amount, values.year)

    if (res.ok) {
      handleSubmitInParent({
        startingAmount: values.amount,
        year: values.year,
        observations: res.data,
      })
    } else {
      toast.error(res.message)
    }

    setIsLoading(false)
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
                    <RadioGroupItem value="pce" id="pce" disabled={true} />
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
                <FormControl>
                  <Input
                    {...field}
                    className="inline-block w-20 text-center"
                    placeholder="100"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Body className="inline"> dollars in </Body>
          <FormField
            control={form.control}
            name="year"
            render={({ field, fieldState }) => (
              <FormItem className="mx-1 inline-block">
                <FormControl>
                  <Input
                    {...field}
                    className="inline-block w-20 text-center"
                    placeholder="1975"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Body className="inline"> be worth in today&apos;s dollars?</Body>
        </div>

        <Button type="submit" className="self-end" disabled={isLoading}>
          <PlayIcon />
          Run
        </Button>
      </form>
    </Form>
  )
}
