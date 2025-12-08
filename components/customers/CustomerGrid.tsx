'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, DollarSign } from 'lucide-react'
import type { Customer } from '@/types/database'
import { formatCurrency } from '@/lib/utils'

interface CustomerGridProps {
  customers: Customer[]
  onUpdate: (id: number, updates: Partial<Customer>) => void
  onDelete: (id: number) => void
  onNavigate: (id: number) => void
}

export default function CustomerGrid({
  customers,
  onUpdate,
  onDelete,
  onNavigate,
}: CustomerGridProps) {
  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800'
      case 'Mid':
        return 'bg-yellow-100 text-yellow-800'
      case 'Low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {customers.map(customer => (
        <Card
          key={customer.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-base">{customer.name_en}</h3>
              {customer.priority && (
                <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(customer.priority)}`}>
                  {customer.priority}
                </span>
              )}
            </div>
            {customer.name_jp && (
              <p className="text-sm text-muted-foreground mb-2">{customer.name_jp}</p>
            )}
            {customer.company_site && (
              <p className="text-xs text-muted-foreground mb-2 truncate">{customer.company_site}</p>
            )}
            <div className="space-y-1 mb-3">
              <div className="text-xs text-muted-foreground">
                Stage: <span className="font-medium">{customer.deal_stage}</span>
              </div>
              {customer.deal_value_usd > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-medium">{formatCurrency(customer.deal_value_usd, 'USD')}</span>
                </div>
              )}
              {customer.tier && (
                <div className="text-xs text-muted-foreground">
                  Tier: {customer.tier}
                </div>
              )}
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => onNavigate(customer.id)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </CardContent>
        </Card>
      ))}
      {customers.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">No customers found</div>
      )}
    </div>
  )
}

