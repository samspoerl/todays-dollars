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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getInflationAdjustedAmounts } from '@/lib/actions/calculate'
import { INFLATION_MEASURE_COOKIE } from '@/lib/constants'
import {
  CalculationInputs,
  CalculationResult,
  InflationMeasure,
  inputsSchema,
  MAX_START_YEAR,
  MIN_START_YEAR,
} from '@/lib/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlayIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Resolver } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function setMeasureCookie(measure: InflationMeasure) {
  document.cookie = `${INFLATION_MEASURE_COOKIE}=${measure}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`
}

interface InputFormProps {
  initialMeasure: InflationMeasure
  handleSubmitInParent: (outputs: CalculationResult) => void
}

export function InputForm({
  initialMeasure,
  handleSubmitInParent,
}: InputFormProps) {
  const form = useForm<CalculationInputs>({
    resolver: zodResolver(
      inputsSchema
    ) as unknown as Resolver<CalculationInputs>,
    defaultValues: {
      inflationMeasure: initialMeasure,
      startAmount: 100,
      startYear: 1975,
    },
  })

  const [isLoading, setIsLoading] = useState(false)

  // HOOKS
  const watchedMeasure = form.watch('inflationMeasure')
  useEffect(() => {
    setMeasureCookie(watchedMeasure)
  }, [watchedMeasure])

  // UTILS
  // Newest first, so recent years are the shortest scroll away.
  const years = Array.from(
    { length: MAX_START_YEAR - MIN_START_YEAR[watchedMeasure] + 1 },
    (_, i) => MAX_START_YEAR - i
  )

  // EVENT HANDLERS
  function handleMeasureChange(measure: InflationMeasure) {
    form.setValue('inflationMeasure', measure)
    // Switching to a series that starts later would otherwise leave the select
    // holding a year it no longer offers.
    const minYear = MIN_START_YEAR[measure]
    if (form.getValues('startYear') < minYear) {
      form.setValue('startYear', minYear)
    }
  }

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
                  onValueChange={(value) =>
                    handleMeasureChange(value as InflationMeasure)
                  }
                  value={field.value}
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
              <FormItem className="mx-1 inline-block align-middle">
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
              <FormItem className="mx-1 inline-block align-middle">
                <FormControl>
                  <NativeSelect
                    {...field}
                    value={String(field.value)}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    // Matches the amount Input: same padding and text size (16px
                    // below md keeps iOS from zooming on focus), centered text,
                    // and no fill. text-align-last is what centers a select's
                    // value; text-align alone doesn't reach it.
                    className="w-24 py-1 text-center text-base [text-align-last:center] md:text-sm dark:bg-transparent dark:hover:bg-transparent"
                  >
                    {years.map((year) => (
                      <NativeSelectOption key={year} value={year}>
                        {year}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
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
