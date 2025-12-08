'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEAL_STAGES } from '@/lib/constants'

const customerSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_jp: z.string().optional(),
  company_site: z.string().url('Invalid URL').optional().or(z.literal('')),
  tier: z.string().optional(),
  cloud_usage: z.string().optional(),
  priority: z.string().optional(),
  ripple_customer: z.string().optional(),
  archera_customer: z.string().optional(),
  pic: z.string().optional(),
  exec: z.string().optional(),
  alphaus_rep: z.string().optional(),
  alphaus_exec: z.string().optional(),
  deal_stage: z.string().optional(),
  deal_value_usd: z.number().optional(),
  deal_value_jpy: z.number().optional(),
  deal_probability: z.number().optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerFormProps {
  customer?: Partial<CustomerFormData>
  onSubmit: (data: CustomerFormData) => void
  onCancel: () => void
}

export default function CustomerForm({ customer, onSubmit, onCancel }: CustomerFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {
      deal_stage: 'Lead',
      deal_probability: 10,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">English Name *</label>
          <Input {...register('name_en')} />
          {errors.name_en && (
            <p className="text-sm text-red-500 mt-1">{errors.name_en.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Japanese Name</label>
          <Input {...register('name_jp')} />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium">Company Site</label>
          <Input type="url" {...register('company_site')} placeholder="https://example.com" />
        </div>
        <div>
          <label className="text-sm font-medium">AWS Tier</label>
          <Input {...register('tier')} placeholder="Premier, Advanced, Selected, -" />
        </div>
        <div>
          <label className="text-sm font-medium">Priority</label>
          <Input {...register('priority')} placeholder="High, Mid, Low" />
        </div>
        <div>
          <label className="text-sm font-medium">Deal Stage</label>
          <select {...register('deal_stage')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {DEAL_STAGES.map(stage => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Deal Value USD</label>
          <Input type="number" {...register('deal_value_usd', { valueAsNumber: true })} />
        </div>
        <div>
          <label className="text-sm font-medium">Cloud Usage</label>
          <Input {...register('cloud_usage')} />
        </div>
        <div>
          <label className="text-sm font-medium">PIC</label>
          <Input {...register('pic')} />
        </div>
        <div>
          <label className="text-sm font-medium">Alphaus Rep</label>
          <Input {...register('alphaus_rep')} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {customer ? 'Update' : 'Create'} Customer
        </Button>
      </div>
    </form>
  )
}

