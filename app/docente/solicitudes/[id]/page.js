'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

const BADGE = {
  borrador:  { background: '#f3f1e8', color: '#6b6a60',  label: 'Borrador'  },
  enviada:   { background: '#dbeafe', color: '#1e40af',  label: 'Enviada'   },
  recibida:  { background: '#e8f4f1', color: '#0E6E62',  label: 'Recibida'  },
  procesada: { background: '#dcfce7', color: '#166534',  label: 'Procesada' },
}
const UNIDADES = ['pieza', 'caja', 'rollo', 'kg', 'litro', 'gramos', 'ml', 'otro']

const PRINT_CSS = `
  .print-only { display: none; }
  @media print {
    .no-print  { display: none !important; }
    .print-only { display: block !important; }
    body, main { background: white !important; color: black !important; }
    .print-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .print-table th { border: 1px solid #999; padding: 5px 10px; background: #f0f0f0; font-weight: 600; text-align: left; }
    .print-table td { border: 1px solid #bbb; padding: 5px 10px; }
    .print-doc { font-family: 'Hanken Grotesk', sans-serif; max-width: 700px; margin: 0 auto; }
    .print-header { text-align: center; margin-bottom: 24px; }
    .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .print-field { font-size: 12px; }
    .print-field strong { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-bottom: 2px; }
    .print-sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px; }
    .print-sign-line { border-bottom: 1px solid #333; padding-bottom: 4px; font-size: 11px; color: #555; margin-top: 24px; }
  }
`

function fmtFecha(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

let _key = 0
const newKey = () => ++_key
const blankRow = () => ({ key: newKey(), material_id: null, nombre_material: '', cantidad: '', unidad: 'pieza' })

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{label}</p>
      <p style={{ fontSize: 14, color: '#1C1B17', margin: 0 }}>{value || <em style={{ color: '#b3b1a4' }}>—</em>}</p>
    </div>
  )
}

function F({ label, required, children }) {
  return (
    <label style={{ display: 'block', fontSize: 13, color: '#6b6a60', marginBottom: 14 }}>
      {label}{required && <span style={{ color: '#e74c3c' }}> *</span>}
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  )
}

function MaterialRow({ row, catalogo, onChange, onRemove }) {
  const [showSug, setShowSug] = useState(false)
  const filtered = row.nombre_material
    ? catalogo.filter(m => m.nombre.toLowerCase().includes(row.nombre_material.toLowerCase())).slice(0, 7)
    : []
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
      <div style={{ flex: 2, position: 'relative' }}>
        <input value={row.nombre_material}
          onChange={e => onChange({ ...row, nombre_material: e.target.value, material_id: null })}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder="Nombre del material" style={inp()} />
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

export default function SolicitudDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()

  const [docente, setDocente]       = useState(null)
  const [solicitud, setSolicitud]   = useState(null)
  const [materiales, setMateriales] = useState([])
  const [materiasList, setMateriasList] = useState([])
  const [catalogo, setCatalogo]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  // Edit state (used only if borrador)
  const [form, setForm]   = useState(null)
  const [filas, setFilas] = useState([])

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: doc } = await supabase.from('docentes').select('id, nombre').eq('auth_user_id', user.id).single()
    if (!doc) { router.push('/login'); return }
    setDocente(doc)

    const [{ data: sol }, { data: mats }, { data: dm }, { data: cats }] = await Promise.all([
      supabase.from('solicitudes').select('*').eq('id', id).single(),
      supabase.from('solicitud_materiales').select('*').eq('solicitud_id', id).order('id'),
      supabase.from('docente_materias').select('materia:materias(id, nombre)').eq('docente_id', doc.id),
      supabase.from('materiales').select('id, nombre, marca_sugerida').order('nombre'),
    ])

    if (!sol || sol.docente_id !== doc.id) { router.push('/docente/solicitudes'); return }

    const mats_list = (dm || []).map(r => Array.isArray(r.materia) ? r.materia[0] : r.materia).filter(Boolean)
    const materia   = mats_list.find(m => m.id === sol.materia_id) ?? null
    const solNorm   = { ...sol, materia }
    setSolicitud(solNorm)
    setMateriales(mats || [])
    setMateriasList(mats_list)
    setCatalogo(cats || [])

    if (solNorm.estado === 'borrador') {
      setForm({
        materia_id:      solNorm.materia?.id ?? '',
        nombre_practica: solNorm.nombre_practica ?? '',
        fecha_practica:  solNorm.fecha_practica   ?? '',
        habilidad:       solNorm.habilidad         ?? '',
      })
      setFilas(
        (mats && mats.length > 0)
          ? mats.map(m => ({ key: newKey(), material_id: m.material_id, nombre_material: m.nombre_material, cantidad: m.cantidad?.toString() ?? '', unidad: m.unidad ?? 'pieza' }))
          : [blankRow()]
      )
    }
    setLoading(false)
  }

  function updateFila(key, updated) { setFilas(prev => prev.map(f => f.key === key ? { ...updated, key } : f)) }
  function removeFila(key)          { setFilas(prev => prev.length > 1 ? prev.filter(f => f.key !== key) : prev) }

  async function eliminarBorrador() {
    if (!confirm('¿Eliminar este borrador? Esta acción no se puede deshacer.')) return
    await supabase.from('solicitud_materiales').delete().eq('solicitud_id', id)
    const { error: de } = await supabase.from('solicitudes').delete().eq('id', id)
    if (de) { setError(de.message); return }
    router.push('/docente/solicitudes')
  }

  function validar(enviar) {
    if (!form.nombre_practica.trim()) return 'El nombre de la práctica es obligatorio.'
    if (!form.fecha_practica)         return 'La fecha de la práctica es obligatoria.'
    if (enviar) {
      if (filas.every(f => !f.nombre_material.trim())) return 'Agrega al menos un material antes de enviar.'
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
      const { error: se } = await supabase.from('solicitudes').update({
        materia_id:      form.materia_id || null,
        nombre_practica: form.nombre_practica.trim(),
        fecha_practica:  form.fecha_practica,
        habilidad:       form.habilidad.trim(),   // '' en vez de null (NOT NULL)
        estado:          enviar ? 'enviada' : 'borrador',
        ...(enviar ? { fecha_enviada: new Date().toISOString() } : {}),
      }).eq('id', id)
      if (se) throw new Error(se.message)

      await supabase.from('solicitud_materiales').delete().eq('solicitud_id', id)
      const rows = filas.filter(f => f.nombre_material.trim()).map(f => ({
        solicitud_id:    id,
        material_id:     f.material_id || null,
        nombre_material: f.nombre_material.trim(),
        cantidad:        f.cantidad ? parseInt(f.cantidad) : null,
        unidad:          f.unidad,
      }))
      if (rows.length) {
        const { error: me } = await supabase.from('solicitud_materiales').insert(rows)
        if (me) throw new Error(me.message)
      }
      await load()
    } catch (e) {
      console.error('[guardar solicitud]', e)
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

  const editable = solicitud?.estado === 'borrador'
  const badge    = BADGE[solicitud?.estado] ?? BADGE.borrador

  return (
    <main style={{ minHeight: '100vh', background: BG, fontFamily: BODY, color: '#1C1B17' }}>
      <style>{PRINT_CSS}</style>

      {error && (
        <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fbeaea', borderBottom: '2px solid #f5c6c6', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#8a2020', fontSize: 13, fontWeight: 500 }}>⚠ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a2020', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Print document ── */}
      <div className="print-only">
        <div className="print-doc">
          <div className="print-header">
            <p style={{ fontSize: 13, margin: '0 0 2px' }}>Universidad de Montemorelos</p>
            <p style={{ fontSize: 13, margin: '0 0 16px' }}>Escuela de Ciencias Estomatológicas</p>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', margin: '0 0 20px' }}>
              SOLICITUD DE MATERIALES PARA PRÁCTICA
            </h2>
            <hr style={{ borderColor: '#aaa', marginBottom: 20 }} />
          </div>
          <div className="print-grid">
            <div className="print-field"><strong>Docente</strong>{docente?.nombre}</div>
            <div className="print-field"><strong>Materia</strong>{solicitud?.materia?.nombre || '—'}</div>
            <div className="print-field"><strong>Nombre de la práctica</strong>{solicitud?.nombre_practica}</div>
            <div className="print-field"><strong>Fecha de la práctica</strong>{fmtFecha(solicitud?.fecha_practica)}</div>
          </div>
          {solicitud?.habilidad && (
            <div className="print-field" style={{ marginBottom: 16 }}>
              <strong>Habilidad / Competencia</strong>{solicitud.habilidad}
            </div>
          )}
          <table className="print-table" style={{ marginBottom: 24 }}>
            <thead>
              <tr><th>#</th><th>Material</th><th>Cantidad</th><th>Unidad</th></tr>
            </thead>
            <tbody>
              {materiales.map((m, i) => (
                <tr key={m.id}>
                  <td>{i + 1}</td>
                  <td>{m.nombre_material}</td>
                  <td style={{ textAlign: 'center' }}>{m.cantidad ?? '—'}</td>
                  <td>{m.unidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="print-field" style={{ marginBottom: 8 }}>
            <strong>Fecha de generación</strong>
            {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="print-field">
            <strong>Fecha de procesamiento</strong>
            {solicitud?.fecha_procesada ? fmtFecha(solicitud.fecha_procesada) : '___________________________'}
          </div>
          <div className="print-sign">
            <div>
              <div className="print-sign-line">Firma del docente</div>
            </div>
            <div>
              <div className="print-sign-line">Recibido por</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Screen UI ── */}
      <header className="no-print" style={{ background: '#fff', borderBottom: '1px solid #e7e4d6', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, marginBottom: 2 }}>Cirujano Dentista</p>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>
            {solicitud?.nombre_practica || 'Solicitud'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/docente" style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-block' }}>← Panel docente</a>
          <button onClick={() => window.print()} style={btn({ bg: '#6b6a60' })}>🖨 Imprimir</button>
        </div>
      </header>

      <div className="no-print" style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px' }}>

        {/* Estado badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ ...badge, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>{badge.label}</span>
          {solicitud?.fecha_enviada && (
            <span style={{ fontSize: 12, color: '#9a988c' }}>
              Enviada el {fmtFecha(solicitud.fecha_enviada.split('T')[0])}
            </span>
          )}
          {solicitud?.fecha_procesada && (
            <span style={{ fontSize: 12, color: '#9a988c' }}>
              · Procesada el {fmtFecha(solicitud.fecha_procesada.split('T')[0])}
            </span>
          )}
        </div>

        {solicitud?.notas_coordinador && (
          <div style={{ background: '#e8f4f1', borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20, borderLeft: `3px solid ${ACCENT}` }}>
            <strong style={{ color: ACCENT, display: 'block', marginBottom: 4 }}>Notas del coordinador</strong>
            {solicitud.notas_coordinador}
          </div>
        )}

        {/* Content */}
        <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '24px', marginBottom: 20 }}>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600, margin: '0 0 20px' }}>Datos generales</h2>

          {editable && form ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <div style={{ paddingRight: 12 }}>
                  <F label="Materia">
                    <select value={form.materia_id} onChange={e => setForm(f => ({ ...f, materia_id: e.target.value }))} style={inp()}>
                      <option value="">— Sin materia específica —</option>
                      {materiasList.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </F>
                </div>
                <div style={{ paddingLeft: 12 }}>
                  <F label="Fecha de la práctica" required>
                    <input type="date" value={form.fecha_practica} onChange={e => setForm(f => ({ ...f, fecha_practica: e.target.value }))} style={inp()} />
                  </F>
                </div>
              </div>
              <F label="Nombre de la práctica" required>
                <input value={form.nombre_practica} onChange={e => setForm(f => ({ ...f, nombre_practica: e.target.value }))} style={inp()} />
              </F>
              <F label="Habilidad / competencia">
                <textarea value={form.habilidad} onChange={e => setForm(f => ({ ...f, habilidad: e.target.value }))}
                  rows={3} style={{ ...inp(), resize: 'vertical', lineHeight: 1.5 }} />
              </F>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Materia"     value={solicitud?.materia?.nombre} />
              <Field label="Fecha"       value={fmtFecha(solicitud?.fecha_practica)} />
              <Field label="Práctica"    value={solicitud?.nombre_practica} />
              <Field label="Habilidad"   value={solicitud?.habilidad} />
            </div>
          )}
        </section>

        {/* Materials */}
        <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '24px', marginBottom: 24 }}>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600, margin: '0 0 16px' }}>Materiales</h2>

          {editable ? (
            <>
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
            </>
          ) : (
            materiales.length > 0 ? (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#faf9f4', borderBottom: '1px solid #eceadd' }}>
                    {['#', 'Material', 'Cantidad', 'Unidad'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#9a988c', textAlign: h === '#' || h === 'Cantidad' ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: BODY }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materiales.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f0eee3' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, color: '#9a988c' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px', fontSize: 14, fontWeight: 500 }}>{m.nombre_material}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{m.cantidad ?? '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 13, color: '#6b6a60', textTransform: 'capitalize' }}>{m.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: 13, color: '#b3b1a4' }}>Sin materiales registrados.</p>
            )
          )}
        </section>

        {/* Actions */}
        {editable && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={eliminarBorrador} disabled={saving}
              style={{ ...btn({ bg: '#e74c3c' }), opacity: saving ? 0.7 : 1 }}>
              Eliminar borrador
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
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
        )}

        {/* Print CTA */}
        {!editable && (
          <div className="no-print" style={{ background: '#fff', borderRadius: 14, border: '1px solid #e7e4d6', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, margin: '0 0 3px', color: '#1C1B17' }}>
                Imprimir solicitud
              </p>
              <p style={{ fontSize: 12, color: '#9a988c', margin: 0 }}>
                Genera una copia en papel para entregar a coordinación.
              </p>
            </div>
            <button onClick={() => window.print()}
              style={{ ...btn({ bg: '#6b6a60' }), whiteSpace: 'nowrap', flexShrink: 0 }}>
              🖨 Imprimir
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
