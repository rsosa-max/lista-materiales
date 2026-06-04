import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY no configurado en .env.local' },
      { status: 500 }
    )
  }

  // Cliente admin — bypasea RLS
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verificar que la petición viene de un usuario autenticado
  const token = (request.headers.get('authorization') ?? '').replace(/^bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const body = await request.json()
  const nomina = body?.nomina?.trim()
  if (!nomina) return NextResponse.json({ error: 'Nómina requerida' }, { status: 400 })

  // Vincular si: (a) auth_user_id es null, o (b) ya pertenece al mismo usuario (re-activación)
  const { data: updated, error } = await admin
    .from('docentes')
    .update({ auth_user_id: user.id, email_real: user.email })
    .eq('numero_nomina', nomina)
    .or(`auth_user_id.is.null,auth_user_id.eq.${user.id}`)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!updated?.length) {
    return NextResponse.json(
      { error: 'Nómina no encontrada o ya está vinculada a otra cuenta' },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true })
}
