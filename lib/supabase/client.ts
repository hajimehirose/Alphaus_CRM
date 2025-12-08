import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
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

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

