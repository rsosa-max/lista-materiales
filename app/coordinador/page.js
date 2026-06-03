'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY    = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const ACCENT  = '#0E6E62'
const BG      = '#F6F4EC'

const inp = (w = '100%') => ({
  padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d4d0be',
  fontFamily: BODY, fontSize: 13, outline: 'none', background: '#fff',
  width: w, boxSizing: 'border-box', display: 'block',
})
const btn = ({ bg = ACCENT, small = false } = {}) => ({
  padding: small ? '5px 12px' : '9px 18px', borderRadius: 8,
  background: bg, color: '#fff', border: 'none',
  fontFamily: BODY, fontWeight: 600, fontSize: small ? 12 : 13, cursor: 'pointer',
})
const ghostBtn = {
  padding: '5px 12px', borderRadius: 8, background: 'transparent',
  border: '1.5px solid #d4d0be', fontFamily: BODY, fontSize: 12, cursor: 'pointer', color: '#6b6a60',
}

const EMPTY_FORM = { nombre: '', nomina: '', emailReal: '', materiaIds: new Set(), isCoord: false }

export default function CoordinadorPage() {
  const router = useRouter()

  const [docentes, setDocentes]       = useState([])
  const [allMaterias, setAllMaterias] = useState([])
  const [loading, setLoading]         = useState(true)
  const [form, setForm]               = useState(null)    // null | { mode:'add'|'edit', id?, ...fields }
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)

  // Collapsible docentes (default: all collapsed)
  const [openDocentes, setOpenDocentes] = useState(new Set())
  const toggleDocente = (id) =>
    setOpenDocentes(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // Materias CRUD
  const [matForm, setMatForm]         = useState(null)    // null | { mode:'add'|'edit', id?, nombre }
  const [matSaving, setMatSaving]     = useState(false)
  const [matError, setMatError]       = useState(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap'
    document.head.appendChild(link)
  }, [])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: docs }, { data: mats }] = await Promise.all([
      supabase
        .from('docentes')
        .select('*, docente_materias(materia_id, materias(id, nombre))')
        .order('nombre'),
      supabase.from('materias').select('id, nombre').order('nombre'),
    ])
    setAllMaterias(mats || [])
    setDocentes(
      (docs || []).map(d => ({
        ...d,
        materias: (d.docente_materias || [])
          .map(dm => Array.isArray(dm.materias) ? dm.materias[0] : dm.materias)
          .filter(Boolean),
      }))
    )
    setLoading(false)
  }

  function openAdd() {
    setError(null)
    setForm({ mode: 'add', ...EMPTY_FORM, materiaIds: new Set() })
  }

  function openEdit(doc) {
    setError(null)
    setForm({
      mode: 'edit',
      id: doc.id,
      nombre: doc.nombre,
      nomina: doc.nomina,
      emailReal: doc.email_real || '',
      isCoord: doc.is_coordinador,
      materiaIds: new Set(doc.materias.map(m => m.id)),
    })
  }

  function toggleMateria(id) {
    setForm(f => {
      const s = new Set(f.materiaIds)
      s.has(id) ? s.delete(id) : s.add(id)
      return { ...f, materiaIds: s }
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim() || !form.nomina.trim()) { setError('Nombre y nómina son obligatorios'); return }
    setSaving(true)
    try {
      let docenteId = form.id

      if (form.mode === 'add') {
        const { data: nd, error: de } = await supabase
          .from('docentes')
          .insert({ nombre: form.nombre.trim(), nomina: form.nomina.trim(), email_real: form.emailReal.trim() || null, is_coordinador: form.isCoord })
          .select('id').single()
        if (de) throw de
        docenteId = nd.id
      } else {
        const { error: de } = await supabase.from('docentes').update({
          nombre: form.nombre.trim(),
          nomina: form.nomina.trim(),
          email_real: form.emailReal.trim() || null,
          is_coordinador: form.isCoord,
        }).eq('id', docenteId)
        if (de) throw de
        await supabase.from('docente_materias').delete().eq('docente_id', docenteId)
      }

      if (form.materiaIds.size > 0) {
        const rows = [...form.materiaIds].map(mid => ({ docente_id: docenteId, materia_id: mid }))
        const { error: me } = await supabase.from('docente_materias').insert(rows)
        if (me) throw me
      }

      setForm(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(doc) {
    if (!confirm(`¿Eliminar a ${doc.nombre}? Esta acción no se puede deshacer.`)) return
    await supabase.from('docentes').delete().eq('id', doc.id)
    await load()
  }

  async function handleMatSave(e) {
    e.preventDefault()
    setMatError(null)
    if (!matForm.nombre.trim()) { setMatError('El nombre es obligatorio'); return }
    setMatSaving(true)
    try {
      if (matForm.mode === 'add') {
        const { error: me } = await supabase.from('materias').insert({ nombre: matForm.nombre.trim() })
        if (me) throw me
      } else {
        const { error: me } = await supabase.from('materias').update({ nombre: matForm.nombre.trim() }).eq('id', matForm.id)
        if (me) throw me
      }
      setMatForm(null)
      await load()
    } catch (err) {
      setMatError(err.message)
    } finally {
      setMatSaving(false)
    }
  }

  async function handleMatDelete(mat) {
    if (!confirm(`¿Eliminar la materia "${mat.nombre}"?\nEsto también eliminará todos sus requerimientos.`)) return
    await supabase.from('materias').delete().eq('id', mat.id)
    await load()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY }}>
      <p style={{ color: '#6b6a60' }}>Cargando…</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: BG, fontFamily: BODY, color: '#1C1B17' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e7e4d6', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, marginBottom: 2 }}>Cirujano Dentista</p>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>Panel del coordinador</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!form && <button onClick={openAdd} style={btn()}>+ Agregar docente</button>}
          <a href="/docente" style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-block', color: ACCENT, borderColor: ACCENT }}>Panel docente</a>
          <a href="/lista" style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-block' }}>Lista pública</a>
          <button onClick={signOut} style={ghostBtn}>Cerrar sesión</button>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Add / Edit form ── */}
        {form && (
          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '24px', marginBottom: 28 }}>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
              {form.mode === 'add' ? 'Agregar docente' : 'Editar docente'}
            </h2>
            {error && <p style={{ background: '#fbeaea', color: '#8a2020', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</p>}
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#6b6a60' }}>
                  Nombre *
                  <input style={{ ...inp(), marginTop: 4 }} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
                </label>
                <label style={{ fontSize: 13, color: '#6b6a60' }}>
                  Nómina *
                  <input style={{ ...inp(), marginTop: 4 }} value={form.nomina} onChange={e => setForm(f => ({ ...f, nomina: e.target.value }))} required />
                </label>
                <label style={{ fontSize: 13, color: '#6b6a60' }}>
                  Email real (para recuperación)
                  <input style={{ ...inp(), marginTop: 4 }} type="email" value={form.emailReal} onChange={e => setForm(f => ({ ...f, emailReal: e.target.value }))} />
                </label>
              </div>

              <label style={{ fontSize: 13, color: '#6b6a60', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isCoord} onChange={e => setForm(f => ({ ...f, isCoord: e.target.checked }))}
                       style={{ accentColor: ACCENT, width: 15, height: 15 }} />
                Es coordinador
              </label>

              <p style={{ fontSize: 13, color: '#6b6a60', marginBottom: 8, fontWeight: 500 }}>Materias asignadas</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {allMaterias.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${form.materiaIds.has(m.id) ? ACCENT : '#d4d0be'}`, background: form.materiaIds.has(m.id) ? '#e8f4f1' : '#fff', cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.materiaIds.has(m.id)} onChange={() => toggleMateria(m.id)}
                           style={{ accentColor: ACCENT }} />
                    {m.nombre}
                  </label>
                ))}
                {allMaterias.length === 0 && <p style={{ fontSize: 13, color: '#b3b1a4' }}>Sin materias en el sistema</p>}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={saving} style={{ ...btn(), opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" onClick={() => { setForm(null); setError(null) }} style={ghostBtn}>Cancelar</button>
              </div>
            </form>
          </section>
        )}

        {/* ── Docentes list ── */}
        <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #eceadd' }}>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, margin: 0 }}>Docentes</h2>
          </div>

          {docentes.length === 0 ? (
            <p style={{ padding: '24px 20px', color: '#b3b1a4', fontSize: 14 }}>No hay docentes registrados.</p>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ background: '#faf9f4', borderBottom: '1px solid #eceadd' }}>
                  {['Nombre', 'Nómina', 'Rol', ''].map((h, i) => (
                    <th key={i} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#9a988c',
                                        textAlign: i === 3 ? 'right' : 'left', letterSpacing: '0.04em',
                                        textTransform: 'uppercase', fontFamily: BODY }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              {docentes.map(doc => {
                const open = openDocentes.has(doc.id)
                return (
                  <tbody key={doc.id}>
                    {/* Summary row — clickable */}
                    <tr
                      onClick={() => toggleDocente(doc.id)}
                      style={{ cursor: 'pointer', background: open ? '#fbfaf5' : '#fff',
                               borderBottom: open ? 'none' : '1px solid #f0eee3' }}
                      onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#faf9f4' }}
                      onMouseLeave={e => { e.currentTarget.style.background = open ? '#fbfaf5' : '#fff' }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{doc.nombre}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b6a60', fontFamily: 'monospace' }}>{doc.nomina}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {doc.is_coordinador
                          ? <span style={{ background: '#e8f4f1', color: ACCENT, borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>Coordinador</span>
                          : <span style={{ background: '#f3f1e8', color: '#6b6a60', borderRadius: 12, padding: '3px 10px', fontSize: 11 }}>Docente</span>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <svg width="16" height="16" viewBox="0 0 12 12" fill="none"
                          style={{ transition: 'transform 0.25s ease', transform: open ? 'rotate(180deg)' : 'none', color: '#9a988c', display: 'inline-block' }}>
                          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </td>
                    </tr>
                    {/* Detail row */}
                    <tr style={{ borderBottom: '1px solid #f0eee3' }}>
                      <td colSpan={4} style={{ padding: 0 }}>
                        <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr',
                                      transition: 'grid-template-rows 0.3s ease' }}>
                          <div style={{ overflow: 'hidden', opacity: open ? 1 : 0, transition: 'opacity 0.2s ease' }}>
                            <div style={{ padding: '16px 20px', background: '#fbfaf5', borderTop: '1px solid #eceadd',
                                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                              <div>
                                <p style={{ fontSize: 11, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase',
                                            letterSpacing: '0.05em', margin: '0 0 4px' }}>Email</p>
                                <p style={{ fontSize: 13, color: '#1C1B17', margin: 0 }}>
                                  {doc.email_real || <span style={{ color: '#b3b1a4' }}>—</span>}
                                </p>
                              </div>
                              <div>
                                <p style={{ fontSize: 11, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase',
                                            letterSpacing: '0.05em', margin: '0 0 6px' }}>Materias</p>
                                {doc.materias.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {doc.materias.map(m => (
                                      <span key={m.id} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px',
                                                                 borderRadius: 20, background: '#e8f4f1', color: ACCENT,
                                                                 border: '1px solid #c5e0da', whiteSpace: 'nowrap' }}>
                                        {m.nombre}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#b3b1a4' }}>Sin materias asignadas</span>
                                )}
                              </div>
                            </div>
                            <div style={{ padding: '10px 20px 14px', borderTop: '1px solid #eceadd', display: 'flex', gap: 8 }}>
                              <button onClick={e => { e.stopPropagation(); openEdit(doc) }}
                                style={{ ...btn({ small: true, bg: '#4b7bec' }), marginRight: 0 }}>Editar</button>
                              <button onClick={e => { e.stopPropagation(); handleDelete(doc) }}
                                style={btn({ small: true, bg: '#e74c3c' })}>Eliminar</button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )
              })}
            </table>
          )}
        </section>

        {/* ── Materias ── */}
        <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', overflow: 'hidden', marginTop: 24 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #eceadd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, margin: 0 }}>Materias</h2>
            {!matForm && (
              <button onClick={() => { setMatError(null); setMatForm({ mode: 'add', nombre: '' }) }} style={btn({ small: true })}>
                + Agregar materia
              </button>
            )}
          </div>

          {matForm && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eceadd', background: '#fbfaf5' }}>
              {matError && <p style={{ background: '#fbeaea', color: '#8a2020', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{matError}</p>}
              <form onSubmit={handleMatSave} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <label style={{ fontSize: 13, color: '#6b6a60', flex: 1 }}>
                  {matForm.mode === 'add' ? 'Nueva materia' : 'Nombre de la materia'}
                  <input
                    style={{ ...inp(), marginTop: 4 }}
                    value={matForm.nombre}
                    onChange={e => setMatForm(f => ({ ...f, nombre: e.target.value }))}
                    required
                    autoFocus
                  />
                </label>
                <button type="submit" disabled={matSaving} style={{ ...btn(), opacity: matSaving ? 0.7 : 1 }}>
                  {matSaving ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" onClick={() => { setMatForm(null); setMatError(null) }} style={ghostBtn}>
                  Cancelar
                </button>
              </form>
            </div>
          )}

          {allMaterias.length === 0 ? (
            <p style={{ padding: '20px', color: '#b3b1a4', fontSize: 14 }}>No hay materias registradas.</p>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ background: '#faf9f4', borderBottom: '1px solid #eceadd' }}>
                  {['Materia', 'Docentes asignados', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#9a988c', textAlign: 'left', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: BODY }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allMaterias.map(mat => {
                  const docsDeMateria = docentes.filter(d => d.materias.some(m => m.id === mat.id))
                  return (
                    <tr key={mat.id} style={{ borderBottom: '1px solid #f0eee3' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: 14 }}>{mat.nombre}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#6b6a60' }}>
                        {docsDeMateria.length > 0
                          ? docsDeMateria.map(d => d.nombre).join(', ')
                          : <span style={{ color: '#b3b1a4' }}>Sin docentes</span>}
                      </td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => { setMatError(null); setMatForm({ mode: 'edit', id: mat.id, nombre: mat.nombre }) }}
                          style={{ ...btn({ small: true, bg: '#4b7bec' }), marginRight: 6 }}
                        >
                          Editar
                        </button>
                        <button onClick={() => handleMatDelete(mat)} style={btn({ small: true, bg: '#e74c3c' })}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

      </div>
    </main>
  )
}
