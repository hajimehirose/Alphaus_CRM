import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern to avoid recreating client on every call
let clientInstance: ReturnType<typeof createBrowserClient> | null = null
let authListenerSet = false

function clearSupabaseStorage() {
  if (typeof window === 'undefined') return
  
  try {
    // Use more efficient method: iterate only once
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase') || key.startsWith('sb-'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Clear cookies more efficiently
    if (document.cookie) {
      const cookies = document.cookie.split(';')
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        if (name.includes('supabase') || name.startsWith('sb-') || name.includes('auth-token')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        }
      })
    }
  } catch (e) {
    // Ignore localStorage/cookie errors
  }
}

export function createClient() {
  // Return existing client instance if available
  if (clientInstance) {
    return clientInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || supabaseUrl === 'your_anon_key_here' || supabaseUrl.includes('YOUR_PROJECT_ID')) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Please set it in your .env.local file with your actual Supabase project URL.'
    )
  }

  if (!supabaseAnonKey || supabaseAnonKey === 'your_anon_key_here') {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Please set it in your .env.local file with your actual Supabase anon key.'
    )
  }

  // Pre-flight check for corrupted Supabase session in localStorage
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const keysToInspect: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('supabase') || key.startsWith('sb-'))) {
          keysToInspect.push(key)
        }
      }

      let corrupted = false
      for (const key of keysToInspect) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        try {
          const parsed = JSON.parse(raw)
          // If parsed value is a string (instead of object), treat as corrupted
          if (typeof parsed === 'string') {
            corrupted = true
            break
          }
        } catch {
          // JSON parse failed -> corrupted
          corrupted = true
          break
        }
      }

      if (corrupted) {
        clearSupabaseStorage()
      }
    } catch {
      // ignore inspection errors
    }
  }

  // Wrap client creation with error handling for corrupted session data
  try {
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
    
    // Set up auth listener only once
    if (typeof window !== 'undefined' && clientInstance.auth && !authListenerSet) {
      authListenerSet = true
      clientInstance.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          clearSupabaseStorage()
        }
      })
    }
  } catch (error: any) {
    // If client creation fails due to corrupted session, clear storage and retry
    if (typeof window !== 'undefined' && error.message?.includes('Cannot create property')) {
      console.warn('Detected corrupted session data, clearing storage...')
      clearSupabaseStorage()
      // Retry client creation
      try {
        clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
      } catch (clearError) {
        console.error('Failed to clear corrupted session data:', clearError)
        // Still create client, let Supabase handle it
        clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
      }
    } else {
      throw error
    }
  }

  return clientInstance
}

