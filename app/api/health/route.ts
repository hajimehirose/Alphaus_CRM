import { NextResponse } from 'next/server'

/**
 * Health check endpoint to verify environment variables are set
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: {
      set: !!supabaseUrl,
      value: supabaseUrl ? (supabaseUrl.length > 0 ? 'Set' : 'Empty') : 'Not set',
      isPlaceholder: supabaseUrl?.includes('YOUR_PROJECT_ID') || supabaseUrl === 'your_anon_key_here',
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      set: !!supabaseAnonKey,
      value: supabaseAnonKey ? (supabaseAnonKey.length > 20 ? 'Set' : 'Too short') : 'Not set',
      isPlaceholder: supabaseAnonKey === 'your_anon_key_here',
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      set: !!serviceRoleKey,
      value: serviceRoleKey ? (serviceRoleKey.length > 20 ? 'Set' : 'Too short') : 'Not set',
      isPlaceholder: serviceRoleKey === 'your_service_role_key_here',
    },
  }

  const allSet = envCheck.NEXT_PUBLIC_SUPABASE_URL.set && 
                 !envCheck.NEXT_PUBLIC_SUPABASE_URL.isPlaceholder &&
                 envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY.set && 
                 !envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY.isPlaceholder &&
                 envCheck.SUPABASE_SERVICE_ROLE_KEY.set && 
                 !envCheck.SUPABASE_SERVICE_ROLE_KEY.isPlaceholder

  return NextResponse.json({
    status: allSet ? 'healthy' : 'unhealthy',
    environment: process.env.NODE_ENV,
    envCheck,
    message: allSet 
      ? 'All environment variables are set correctly' 
      : 'Some environment variables are missing or have placeholder values',
    instructions: !allSet ? {
      step1: 'Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
      step2: 'Add the following variables:',
      variables: [
        'NEXT_PUBLIC_SUPABASE_URL=https://nihagqfbxxztuanoebrw.supabase.co',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=(your anon key from Supabase)',
        'SUPABASE_SERVICE_ROLE_KEY=(your service role key from Supabase)',
      ],
      step3: 'Redeploy your application',
    } : null,
  }, {
    status: allSet ? 200 : 503,
  })
}

