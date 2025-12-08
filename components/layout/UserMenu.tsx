'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, User, ChevronDown } from 'lucide-react'

interface User {
  email: string
  name: string
  role: string | null
}

export default function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setUser({
            email: data.email,
            name: data.name,
            role: data.role,
          })
        }
      })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (!user) {
    return <div className="h-8 w-8 rounded-full bg-gray-300 animate-pulse" />
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center gap-2"
        onClick={() => setOpen(!open)}
      >
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:block">{user.name}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white border z-50">
            <div className="p-4 border-b">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              {user.role && (
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                  {user.role}
                </span>
              )}
            </div>
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

