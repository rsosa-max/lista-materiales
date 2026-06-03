'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY    = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const ACCENT  = '#0E6E62'
const BG      = '#F6F4EC'

const inp = (w = '100%') => ({
  padding: '7px 10px', borderRadius: 8, border: '1.5px solid #d4d0be',
  fontFamily: BODY, fontSize: 13, outline: 'none', background: '#fff',
  width: w, boxSizing: 'border-box',
})
const btn = ({ bg = ACCENT, small = false } = {}) => ({
  padding: small ? '5px 12px' : '8px 16px', borderRadius: 8,
  background: bg, color: '#fff', border: 'none',
  fontFamily: BODY, fontWeight: 600, fontSize: small ? 12 : 13, cursor: 'pointer',
})
const ghostBtn = {
  padding: '5px 12px', borderRadius: 8, background: 'transparent',
  border: '1.5px solid #d4d0be', fontFamily: BODY, fontSize: 12, cursor: 'pointer', color: '#6b6a60',
}

const UNIDADES = ['pieza', 'caja', 'rollo', 'otro']

function MaterialRow({ row, catalogo, onChange, onRemove }) {
  const [showSug, setShowSug] = useState(false)
  const filtered = row.nombre_material
    ? catalogo.filter(m => m.nombre.toLowerCase().includes(row.nombre_material.toLowerCase())).slice(0, 7)
    : []

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
      <div style={{ flex: 2, position: 'relative' }}>
        <input
          value={row.nombre_material}
          onChange={e => onChange({ ...row, nombre_material: e.target.value, material_id: null })}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder="Nombre del material"
          style={inp()}
        />
        {showSug && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e7e4d6', borderRadius: 8, zIndex: 20, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
            {filtered.map(m => (
              <div key={m.id}
                onMouseDown={() => { onChange({ ...row, nombre_material: m.nombre, material_id: m.id }); setShowSug(false) }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0eee3' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f6f4ec'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <strong>{m.nombre}</strong>
                {m.marca_sugerida && <span style={{ color: '#9a988c', marginLeft: 6 }}>{m.marca_sugerida}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <input type="number" min="1" value={row.cantidad}
        onChange={e => onChange({ ...row, cantidad: e.target.value })}
        placeholder="Cant." style={inp('72px')} />
      <select value={row.unidad} onChange={e => onChange({ ...row, unidad: e.target.value })} style={inp('96px')}>
        {UNIDADES.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
      </select>
      <button onMouseDown={onRemove} style={{ ...ghostBtn, color: '#e74c3c', borderColor: '#fecaca', padding: '7px 10px' }}>✕</button>
    </div>
  )
}

let _key = 0
const newKey = () => ++_key
const blankRow = () => ({ key: newKey(), material_id: null, nombre_material: '', cantidad: '', unidad: 'pieza' })

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const [docente, setDocente]   = useState(null)
  const [materias, setMaterias] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  const [form, setForm] = useState({
    materia_id: '', nombre_practica: '', fecha_practica: '', habilidad: '',
  })
  const [filas, setFilas] = useState([blankRow()])

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap'
    document.head.appendChild(link)
  }, [])

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: doc } = await supabase.from('docentes').select('id, nombre').eq('auth_user_id', user.id).single()
    if (!doc) { router.push('/login'); return }
    setDocente(doc)

    const [{ data: dm }, { data: cats }] = await Promise.all([
      supabase.from('docente_materias').select('materia:materias(id, nombre)').eq('docente_id', doc.id),
      supabase.from('materiales').select('id, nombre, marca_sugerida').order('nombre'),
    ])

    setMaterias((dm || []).map(r => Array.isArray(r.materia) ? r.materia[0] : r.materia).filter(Boolean))
    setCatalogo(cats || [])
    setLoading(false)
  }

  function updateFila(key, updated) {
    setFilas(prev => prev.map(f => f.key === key ? { ...updated, key } : f))
  }
  function removeFila(key) {
    setFilas(prev => prev.length > 1 ? prev.filter(f => f.key !== key) : prev)
  }

  function validar(enviar) {
    if (!form.nombre_practica.trim()) return 'El nombre de la práctica es obligatorio.'
    if (!form.fecha_practica)        return 'La fecha de la práctica es obligatoria.'
    if (filas.every(f => !f.nombre_material.trim())) return 'Agrega al menos un material.'
    if (enviar) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      const fecha = new Date(form.fecha_practica + 'T12:00:00')
      if ((fecha - hoy) / 86400000 < 14)
        return 'No es posible enviar con menos de 2 semanas de anticipación.'
    }
    return null
  }

  async function guardar(enviar = false) {
    const err = validar(enviar)
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)
    try {
      const { data: sol, error: se } = await supabase.from('solicitudes').insert({
        docente_id: docente.id,
        materia_id: form.materia_id || null,
        nombre_practica: form.nombre_practica.trim(),
        fecha_practica:  form.fecha_practica,
        habilidad:       form.habilidad.trim() || null,
        estado:          enviar ? 'enviada' : 'borrador',
        ...(enviar ? { fecha_enviada: new Date().toISOString() } : {}),
      }).select('id').single()
      if (se) throw se

      const rows = filas
        .filter(f => f.nombre_material.trim())
        .map(f => ({
          solicitud_id:   sol.id,
          material_id:    f.material_id || null,
          nombre_material: f.nombre_material.trim(),
          cantidad:        f.cantidad ? parseInt(f.cantidad) : null,
          unidad:          f.unidad,
        }))
      if (rows.length) {
        const { error: me } = await supabase.from('solicitud_materiales').insert(rows)
        if (me) throw me
      }
      router.push(`/docente/solicitudes/${sol.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY }}>
      <p style={{ color: '#6b6a60' }}>Cargando…</p>
    </main>
  )

  const F = ({ label, required, children }) => (
    <label style={{ display: 'block', fontSize: 13, color: '#6b6a60', marginBottom: 14 }}>
      {label}{required && <span style={{ color: '#e74c3c' }}> *</span>}
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  )

  return (
    <main style={{ minHeight: '100vh', background: BG, fontFamily: BODY, color: '#1C1B17' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e7e4d6', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, marginBottom: 2 }}>Cirujano Dentista</p>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>Nueva solicitud de materiales</h1>
        </div>
        <a href="/docente/solicitudes" style={{ padding: '5px 12px', borderRadius: 8, background: 'transparent', border: '1.5px solid #d4d0be', fontFamily: BODY, fontSize: 12, color: '#6b6a60', textDecoration: 'none' }}>
          ← Mis solicitudes
        </a>
      </header>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div style={{ background: '#fbeaea', color: '#8a2020', borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Datos generales */}
        <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '24px', marginBottom: 20 }}>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600, margin: '0 0 20px' }}>Datos generales</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <div style={{ paddingRight: 12 }}>
              <F label="Materia">
                <select value={form.materia_id} onChange={e => setForm(f => ({ ...f, materia_id: e.target.value }))} style={inp()}>
                  <option value="">— Sin materia específica —</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </F>
            </div>
            <div style={{ paddingLeft: 12 }}>
              <F label="Fecha de la práctica" required>
                <input type="date" value={form.fecha_practica}
                  onChange={e => setForm(f => ({ ...f, fecha_practica: e.target.value }))} style={inp()} />
              </F>
            </div>
          </div>

          <F label="Nombre de la práctica" required>
            <input value={form.nombre_practica}
              onChange={e => setForm(f => ({ ...f, nombre_practica: e.target.value }))}
              placeholder="Ej. Práctica de diagnóstico periodontal" style={inp()} />
          </F>

          <F label="Habilidad / competencia que justifica la solicitud">
            <textarea value={form.habilidad}
              onChange={e => setForm(f => ({ ...f, habilidad: e.target.value }))}
              placeholder="Describe la habilidad o competencia a desarrollar…"
              rows={3}
              style={{ ...inp(), resize: 'vertical', lineHeight: 1.5 }} />
          </F>
        </section>

        {/* Materiales */}
        <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '24px', marginBottom: 24 }}>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600, margin: '0 0 6px' }}>Materiales</h2>
          <p style={{ fontSize: 12, color: '#9a988c', marginBottom: 16 }}>
            Busca en el catálogo o escribe el nombre del material.
          </p>

          {/* Column headers */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 2, fontSize: 11, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Material</span>
            <span style={{ width: 72, fontSize: 11, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cantidad</span>
            <span style={{ width: 96, fontSize: 11, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unidad</span>
            <span style={{ width: 40 }} />
          </div>

          {filas.map(row => (
            <MaterialRow key={row.key} row={row} catalogo={catalogo}
              onChange={updated => updateFila(row.key, updated)}
              onRemove={() => removeFila(row.key)} />
          ))}

          <button onClick={() => setFilas(prev => [...prev, blankRow()])}
            style={{ ...ghostBtn, marginTop: 4, borderStyle: 'dashed' }}>
            + Agregar material
          </button>
        </section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => guardar(false)} disabled={saving}
            style={{ ...btn({ bg: '#6b6a60' }), opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar borrador'}
          </button>
          <button onClick={() => guardar(true)} disabled={saving}
            style={{ ...btn(), opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </main>
  )
}
