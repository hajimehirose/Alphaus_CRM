'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, DollarSign, AlertCircle } from 'lucide-react'
import type { Customer } from '@/types/database'
import { DEAL_STAGES, STAGE_PROBABILITIES } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

interface KanbanBoardProps {
  customers: Customer[]
  onUpdate: (id: number, updates: Partial<Customer>) => void
  onDelete: (id: number) => void
  onNavigate: (id: number) => void
}

export default function KanbanBoard({
  customers,
  onUpdate,
  onDelete,
  onNavigate,
}: KanbanBoardProps) {
  const moveStage = (customer: Customer, direction: 'left' | 'right') => {
    const currentIndex = DEAL_STAGES.indexOf(customer.deal_stage as typeof DEAL_STAGES[number])
    if (currentIndex === -1) return

    const newIndex = direction === 'right' 
      ? Math.min(currentIndex + 1, DEAL_STAGES.length - 1)
      : Math.max(currentIndex - 1, 0)

    const newStage = DEAL_STAGES[newIndex]
    const newProbability = STAGE_PROBABILITIES[newStage] || 10

    onUpdate(customer.id, {
      deal_stage: newStage,
      deal_probability: newProbability,
      stage_updated_at: new Date().toISOString(),
    })
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'Mid':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const customersByStage = DEAL_STAGES.reduce((acc, stage) => {
    acc[stage] = customers.filter(c => c.deal_stage === stage)
    return acc
  }, {} as Record<string, Customer[]>)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {DEAL_STAGES.map((stage, index) => {
        const stageCustomers = customersByStage[stage] || []
        const stageValue = stageCustomers.reduce((sum, c) => sum + (c.deal_value_usd || 0), 0)

        return (
          <div key={stage} className="flex-shrink-0 w-72">
            <div className="bg-gray-50 rounded-lg p-4 sticky top-0 z-10">
              <h3 className="font-semibold text-sm mb-1">{stage}</h3>
              <div className="text-xs text-muted-foreground">
                {stageCustomers.length} deals • ${stageValue.toLocaleString()}
              </div>
            </div>
            <div className="mt-2 space-y-2 min-h-[500px]">
              {stageCustomers.map(customer => (
                <Card
                  key={customer.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onNavigate(customer.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{customer.name_en}</h4>
                      {customer.priority && (
                        <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(customer.priority)}`}>
                          {customer.priority}
                        </span>
                      )}
                    </div>
                    {customer.deal_value_usd > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(customer.deal_value_usd, 'USD')}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveStage(customer, 'left')
                        }}
                        disabled={index === 0}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          moveStage(customer, 'right')
                        }}
                        disabled={index === DEAL_STAGES.length - 1}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

