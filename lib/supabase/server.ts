import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
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

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || supabaseUrl === 'your_anon_key_here' || supabaseUrl.includes('YOUR_PROJECT_ID')) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Please set it in your .env.local file with your actual Supabase project URL.'
    )
  }

  if (!serviceRoleKey || serviceRoleKey === 'your_service_role_key_here') {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Please set it in your .env.local file with your actual Supabase service role key.'
    )
  }
  
  return createSupabaseClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

