'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY    = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const ACCENT  = '#0E6E62'
const BG      = '#F6F4EC'

const ghostBtn = { padding: '5px 12px', borderRadius: 8, background: 'transparent', border: '1.5px solid #d4d0be', fontFamily: BODY, fontSize: 12, cursor: 'pointer', color: '#6b6a60', textDecoration: 'none', display: 'inline-block' }
const btnStyle = { padding: '8px 16px', borderRadius: 8, background: ACCENT, color: '#fff', border: 'none', fontFamily: BODY, fontWeight: 600, fontSize: 13, cursor: 'pointer' }

const BADGE = {
  borrador:  { background: '#f3f1e8', color: '#6b6a60',  label: 'Borrador'  },
  enviada:   { background: '#dbeafe', color: '#1e40af',  label: 'Enviada'   },
  recibida:  { background: '#e8f4f1', color: '#0E6E62',  label: 'Recibida'  },
  procesada: { background: '#dcfce7', color: '#166534',  label: 'Procesada' },
}

function fmtFecha(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SolicitudesPage() {
  const router = useRouter()
  const [docente, setDocente]       = useState(null)
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: doc } = await supabase.from('docentes').select('id, nombre').eq('auth_user_id', user.id).single()
    if (!doc) { router.push('/login'); return }
    setDocente(doc)

    const { data: sols } = await supabase
      .from('solicitudes')
      .select('id, nombre_practica, fecha_practica, estado, materia_id')
      .eq('docente_id', doc.id)
      .order('id', { ascending: false })

    // Obtener nombres de materias por separado (evita dependencia de FK en BD)
    const ids = [...new Set((sols || []).map(s => s.materia_id).filter(Boolean))]
    let matMap = {}
    if (ids.length) {
      const { data: mats } = await supabase.from('materias').select('id, nombre').in('id', ids)
      matMap = Object.fromEntries((mats || []).map(m => [m.id, m.nombre]))
    }
    setSolicitudes((sols || []).map(s => ({ ...s, materia: { nombre: matMap[s.materia_id] ?? null } })))
    setLoading(false)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY }}>
      <p style={{ color: '#6b6a60' }}>Cargando…</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: BG, fontFamily: BODY, color: '#1C1B17' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e7e4d6', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, marginBottom: 2 }}>Cirujano Dentista</p>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>Mis solicitudes</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/docente" style={ghostBtn}>← Panel docente</a>
          <button onClick={() => router.push('/docente/solicitudes/nueva')} style={btnStyle}>+ Nueva solicitud</button>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        {solicitudes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6' }}>
            <p style={{ fontFamily: DISPLAY, fontSize: 20, color: '#9a988c', marginBottom: 8 }}>Sin solicitudes aún</p>
            <p style={{ fontSize: 14, color: '#b3b1a4', marginBottom: 24 }}>
              Crea tu primera solicitud de materiales para práctica.
            </p>
            <button onClick={() => router.push('/docente/solicitudes/nueva')} style={btnStyle}>
              + Nueva solicitud
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {solicitudes.map(s => {
              const badge = BADGE[s.estado] ?? BADGE.borrador
              return (
                <a key={s.id} href={`/docente/solicitudes/${s.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{ background: '#fff', borderRadius: 14, border: '1px solid #e7e4d6', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = '0 4px 14px rgba(14,110,98,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e7e4d6'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div>
                      <p style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, color: '#1C1B17', margin: '0 0 4px' }}>
                        {s.nombre_practica || <em style={{ color: '#9a988c' }}>Sin nombre</em>}
                      </p>
                      <p style={{ fontSize: 12, color: '#9a988c', margin: 0 }}>
                        {s.materia?.nombre ?? '—'}
                        {s.fecha_practica && <> · {fmtFecha(s.fecha_practica)}</>}
                      </p>
                    </div>
                    <span style={{ ...badge, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                      {badge.label}
                    </span>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
