import { useState, useEffect } from 'react'
import { useToast } from './use-toast'

export type TableDensity = 'compact' | 'comfortable' | 'spacious'

export type ColumnConfig = {
  field: string
  label: string
  visible: boolean
  locked: boolean
  type: 'text' | 'dropdown' | 'number' | 'url'
  options?: string[]
  required: boolean
  order: number
}

export type UserSettings = {
  columns?: ColumnConfig[]
  density?: TableDensity
  [key: string]: any
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/user/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings || {})
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSetting = async (key: string, value: any) => {
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })

      if (res.ok) {
        setSettings((prev) => ({ ...prev, [key]: value }))
        return true
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save setting')
      }
    } catch (error: any) {
      console.error('Error saving setting:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save setting',
      })
      return false
    }
  }

  const deleteSetting = async (key: string) => {
    try {
      const res = await fetch(`/api/user/settings?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const newSettings = { ...settings }
        delete newSettings[key]
        setSettings(newSettings)
        return true
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete setting')
      }
    } catch (error: any) {
      console.error('Error deleting setting:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete setting',
      })
      return false
    }
  }

  return {
    settings,
    loading,
    saveSetting,
    deleteSetting,
    reload: loadSettings,
  }
}

