'use client'

import { cn } from '@/lib/utils'

type UserStatus = 'active' | 'pending' | 'no_role'

interface UserStatusBadgeProps {
  status: UserStatus
}

export default function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const config = {
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    pending: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    no_role: {
      label: 'No Role',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
  }

  const { label, className } = config[status]

  return (
    <span
      className={cn(
        'px-2 py-1 text-xs font-medium rounded-full border',
        className
      )}
    >
      {label}
    </span>
  )
}

