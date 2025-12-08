'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchQuery = searchParams.get('search') || ''

  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('search', query)
    } else {
      params.delete('search')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearch={handleSearch} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

