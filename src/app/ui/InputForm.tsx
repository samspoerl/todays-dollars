'use client'

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getInflationAdjustedAmounts } from '@/lib/actions/calculate'
import { CalculationInputs, CalculationResult, inputsSchema } from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlayIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface InputFormProps {
  handleSubmitInParent: (outputs: CalculationResult) => void
}

export function InputForm({ handleSubmitInParent }: InputFormProps) {
  const form = useForm<CalculationInputs>({
    resolver: zodResolver(inputsSchema),
    defaultValues: {
      inflationMeasure: 'CPI',
      startAmount: 100,
      startYear: 1975,
    },
  })

  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(values: CalculationInputs) {
    setIsLoading(true)
    try {
      const res = await getInflationAdjustedAmounts(values)
      if (res.ok) {
        handleSubmitInParent({
          startingAmount: values.startAmount,
          year: values.startYear,
          observations: res.data,
        })
      } else {
        toast.error(res.message)
      }
    } catch {
      toast.error('An unexpected error has occurred.')
    } finally {
      setIsLoading(false)
    }
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
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-row"
                >
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <RadioGroupItem value="CPI" />
                    </FormControl>
                    <FormLabel className="font-normal">CPI</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <RadioGroupItem value="PCE" />
                    </FormControl>
                    <FormLabel className="font-normal">PCE</FormLabel>
                  </FormItem>
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
            name="startAmount"
            render={({ field }) => (
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
            name="startYear"
            render={({ field }) => (
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
          Calculate
        </Button>
      </form>
    </Form>
  )
}
