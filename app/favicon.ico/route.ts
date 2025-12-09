import { NextResponse } from 'next/server'

export async function GET() {
  // Redirect to the icon.svg file
  return NextResponse.redirect(new URL('/icon.svg', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'), 308)
}

