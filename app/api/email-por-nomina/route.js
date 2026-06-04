import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ email: null })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { nomina } = await request.json()
  if (!nomina?.trim()) return NextResponse.json({ email: null })

  const { data } = await admin
    .from('docentes')
    .select('email_real')
    .eq('numero_nomina', nomina.trim())
    .single()

  return NextResponse.json({ email: data?.email_real ?? null })
}
