'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Bell, LogOut, Users, Activity, Upload, Home } from 'lucide-react'
import UserMenu from './UserMenu'
import { APP_VERSION } from '@/lib/version'

interface HeaderProps {
  onSearch?: (query: string) => void
  searchQuery?: string
}

export default function Header({ onSearch, searchQuery = '' }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [localSearch, setLocalSearch] = useState(searchQuery)

  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setLocalSearch(query)
    if (onSearch) {
      onSearch(query)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Archera CRM</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/">
              <Button variant={pathname === '/' ? 'default' : 'ghost'} size="sm">
                <Home className="h-4 w-4 mr-2" />
                Customers
              </Button>
            </Link>
            <Link href="/activity">
              <Button variant={pathname === '/activity' ? 'default' : 'ghost'} size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </Button>
            </Link>
            <Link href="/users">
              <Button variant={pathname === '/users' ? 'default' : 'ghost'} size="sm">
                <Users className="h-4 w-4 mr-2" />
                Users
              </Button>
            </Link>
            <Link href="/import">
              <Button variant={pathname === '/import' ? 'default' : 'ghost'} size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {pathname === '/' && (
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search customers..."
                value={localSearch}
                onChange={handleSearch}
                className="w-64 pl-9"
              />
            </div>
          )}
          <div className="text-xs text-muted-foreground hidden md:block">
            v{APP_VERSION}
          </div>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

