'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Sidebar from '@/app/components/Sidebar'

const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY    = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const ACCENT  = '#0E6E62'
const BG      = '#F6F4EC'
const SIDEBAR_W = 240
const TOPBAR_H  = 52

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

const NAV = [
  { id: 'docentes',    icon: '👥', label: 'Docentes'    },
  { id: 'materias',    icon: '📖', label: 'Materias'    },
  { id: 'solicitudes', icon: '📋', label: 'Solicitudes' },
]

const BADGE_SOL = {
  borrador:  { background: '#f3f1e8', color: '#6b6a60',  label: 'Borrador'  },
  enviada:   { background: '#dbeafe', color: '#1e40af',  label: 'Enviada'   },
  recibida:  { background: '#e8f4f1', color: ACCENT,     label: 'Recibida'  },
  procesada: { background: '#dcfce7', color: '#166534',  label: 'Procesada' },
}

const EMPTY_FORM = { nombre: '', nomina: '', emailReal: '', materiaIds: new Set(), isCoord: false }

function fmtFechaSol(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SectionHdr({ eyebrow, title, desc, action }) {
  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid #e7e4d6', padding: '20px 28px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexShrink: 0,
    }}>
      <div>
        {eyebrow && <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 4px', fontFamily: BODY }}>{eyebrow}</p>}
        <h1 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: '0 0 4px', color: '#1C1B17' }}>{title}</h1>
        {desc && <p style={{ fontFamily: BODY, fontSize: 13, color: '#9a988c', margin: 0 }}>{desc}</p>}
      </div>
      {action && <div style={{ flexShrink: 0, paddingTop: 4 }}>{action}</div>}
    </div>
  )
}

export default function CoordinadorPage() {
  const router = useRouter()

  // Layout
  const [active, setActive]     = useState('docentes')
  const [mobile, setMobile]     = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Docentes & materias
  const [docentes, setDocentes]       = useState([])
  const [allMaterias, setAllMaterias] = useState([])
  const [loading, setLoading]         = useState(true)
  const [form, setForm]               = useState(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [openDocentes, setOpenDocentes] = useState(new Set())

  // Materias CRUD
  const [matForm, setMatForm]     = useState(null)
  const [matSaving, setMatSaving] = useState(false)
  const [matError, setMatError]   = useState(null)

  // Solicitudes
  const [solicitudes, setSolicitudes]     = useState([])
  const [solsLoaded, setSolsLoaded]       = useState(false)
  const [solsLoading, setSolsLoading]     = useState(false)
  const [filtroEstado, setFiltroEstado]   = useState('todas')
  const [openSols, setOpenSols]           = useState(new Set())
  const [solMateriales, setSolMateriales] = useState({})
  const [notasEdit, setNotasEdit]         = useState({})
  const [savingEstado, setSavingEstado]   = useState(null)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (active === 'solicitudes' && !solsLoaded) loadSolicitudes()
  }, [active, solsLoaded])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: docs }, { data: mats }] = await Promise.all([
      supabase.from('docentes').select('*, docente_materias(materia_id, materias(id, nombre))').order('nombre'),
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

  async function loadSolicitudes() {
    setSolsLoading(true)
    const { data: sols } = await supabase.from('solicitudes').select('*').order('id', { ascending: false })
    const docenteIds = [...new Set((sols || []).map(s => s.docente_id).filter(Boolean))]
    const materiaIds = [...new Set((sols || []).map(s => s.materia_id).filter(Boolean))]
    const [{ data: docs }, { data: mats }] = await Promise.all([
      docenteIds.length ? supabase.from('docentes').select('id, nombre').in('id', docenteIds) : Promise.resolve({ data: [] }),
      materiaIds.length ? supabase.from('materias').select('id, nombre').in('id', materiaIds) : Promise.resolve({ data: [] }),
    ])
    const docMap = Object.fromEntries((docs || []).map(d => [d.id, d.nombre]))
    const matMap = Object.fromEntries((mats || []).map(m => [m.id, m.nombre]))
    setSolicitudes((sols || []).map(s => ({
      ...s,
      docente: { nombre: docMap[s.docente_id] ?? '—' },
      materia: { nombre: matMap[s.materia_id] ?? null },
    })))
    setSolsLoaded(true)
    setSolsLoading(false)
  }

  // ── Docentes ──────────────────────────────────────────────────────────────────

  const toggleDocente = id =>
    setOpenDocentes(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  function openAdd() { setError(null); setForm({ mode: 'add', ...EMPTY_FORM, materiaIds: new Set() }) }
  function openEdit(doc) {
    setError(null)
    setForm({ mode: 'edit', id: doc.id, nombre: doc.nombre, nomina: doc.numero_nomina, emailReal: doc.email_real || '', isCoord: doc.is_coordinador, materiaIds: new Set(doc.materias.map(m => m.id)) })
  }
  function toggleMateria(id) {
    setForm(f => { const s = new Set(f.materiaIds); s.has(id) ? s.delete(id) : s.add(id); return { ...f, materiaIds: s } })
  }

  async function handleSave(e) {
    e.preventDefault(); setError(null)
    if (!form.nombre.trim() || !form.nomina.trim()) { setError('Nombre y nómina son obligatorios'); return }
    setSaving(true)
    try {
      let docenteId = form.id
      if (form.mode === 'add') {
        const { data: nd, error: de } = await supabase.from('docentes')
          .insert({ nombre: form.nombre.trim(), numero_nomina: form.nomina.trim(), email_real: form.emailReal.trim() || null, is_coordinador: form.isCoord })
          .select('id').single()
        if (de) throw de
        docenteId = nd.id
      } else {
        const { error: de } = await supabase.from('docentes').update({
          nombre: form.nombre.trim(), numero_nomina: form.nomina.trim(),
          email_real: form.emailReal.trim() || null, is_coordinador: form.isCoord,
        }).eq('id', docenteId)
        if (de) throw de
        await supabase.from('docente_materias').delete().eq('docente_id', docenteId)
      }
      if (form.materiaIds.size > 0) {
        const rows = [...form.materiaIds].map(mid => ({ docente_id: docenteId, materia_id: mid }))
        const { error: me } = await supabase.from('docente_materias').insert(rows)
        if (me) throw me
      }
      setForm(null); await load()
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

  // ── Materias ──────────────────────────────────────────────────────────────────

  async function handleMatSave(e) {
    e.preventDefault(); setMatError(null)
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
      setMatForm(null); await load()
    } catch (err) {
      setMatError(err.message)
    } finally {
      setMatSaving(false)
    }
  }

  async function handleMatDelete(mat) {
    const { count } = await supabase
      .from('requerimientos')
      .select('id', { count: 'exact', head: true })
      .eq('materia_id', mat.id)
    if (count > 0) {
      alert(`No se puede eliminar "${mat.nombre}" porque tiene ${count} material(es) asignado(s). Elimínalos primero desde el panel docente.`)
      return
    }
    if (!confirm(`¿Eliminar la materia "${mat.nombre}"?`)) return
    await supabase.from('materias').delete().eq('id', mat.id)
    await load()
  }

  // ── Solicitudes ───────────────────────────────────────────────────────────────

  async function toggleSol(id) {
    setOpenSols(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
    if (!solMateriales[id]) {
      const { data } = await supabase.from('solicitud_materiales').select('*').eq('solicitud_id', id).order('id')
      setSolMateriales(prev => ({ ...prev, [id]: data || [] }))
    }
  }

  async function cambiarEstado(sol, nuevoEstado) {
    setSavingEstado(sol.id)
    const update = { estado: nuevoEstado }
    if (nuevoEstado === 'procesada') update.fecha_procesada = new Date().toISOString()
    await supabase.from('solicitudes').update(update).eq('id', sol.id)
    setSolicitudes(prev => prev.map(s => s.id === sol.id ? { ...s, ...update } : s))
    setSavingEstado(null)
  }

  async function guardarNotas(id) {
    setSavingEstado(id)
    await supabase.from('solicitudes').update({ notas_coordinador: notasEdit[id] ?? '' }).eq('id', id)
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, notas_coordinador: notasEdit[id] } : s))
    setSavingEstado(null)
  }

  async function eliminarSolicitud(sol) {
    if (!confirm(`¿Eliminar la solicitud "${sol.nombre_practica}"?\nEsta acción no se puede deshacer.`)) return
    await supabase.from('solicitud_materiales').delete().eq('solicitud_id', sol.id)
    await supabase.from('solicitudes').delete().eq('id', sol.id)
    setSolicitudes(prev => prev.filter(s => s.id !== sol.id))
  }

  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY }}>
      <p style={{ color: '#6b6a60' }}>Cargando…</p>
    </div>
  )

  const extraLinks = [
    { icon: '👨‍🏫', label: 'Panel docente',  href: '/docente' },
    { icon: '🌐',  label: 'Lista pública', href: '/lista'   },
  ]

  // ── Section renderers ─────────────────────────────────────────────────────────

  function renderDocentes() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr
          eyebrow="Gestión"
          title="Docentes"
          desc="Administra los docentes registrados y sus materias asignadas."
          action={!form && <button onClick={openAdd} style={btn()}>+ Agregar docente</button>}
        />
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

          {/* Add / Edit form */}
          {form && (
            <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '24px', marginBottom: 24 }}>
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
                  <input type="checkbox" checked={form.isCoord} onChange={e => setForm(f => ({ ...f, isCoord: e.target.checked }))} style={{ accentColor: ACCENT, width: 15, height: 15 }} />
                  Es coordinador
                </label>
                <p style={{ fontSize: 13, color: '#6b6a60', marginBottom: 8, fontWeight: 500 }}>Materias asignadas</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {allMaterias.map(m => (
                    <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${form.materiaIds.has(m.id) ? ACCENT : '#d4d0be'}`, background: form.materiaIds.has(m.id) ? '#e8f4f1' : '#fff', cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={form.materiaIds.has(m.id)} onChange={() => toggleMateria(m.id)} style={{ accentColor: ACCENT }} />
                      {m.nombre}
                    </label>
                  ))}
                  {allMaterias.length === 0 && <p style={{ fontSize: 13, color: '#b3b1a4' }}>Sin materias en el sistema</p>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" disabled={saving} style={{ ...btn(), opacity: saving ? 0.7 : 1 }}>{saving ? 'Guardando…' : 'Guardar'}</button>
                  <button type="button" onClick={() => { setForm(null); setError(null) }} style={ghostBtn}>Cancelar</button>
                </div>
              </form>
            </section>
          )}

          {/* Docentes table */}
          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', overflow: 'hidden' }}>
            {docentes.length === 0 ? (
              <p style={{ padding: '24px 20px', color: '#b3b1a4', fontSize: 14 }}>No hay docentes registrados.</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#faf9f4', borderBottom: '1px solid #eceadd' }}>
                    {['Nombre', 'Nómina', 'Rol', ''].map((h, i) => (
                      <th key={i} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#9a988c', textAlign: i === 3 ? 'right' : 'left', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: BODY }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                {docentes.map(doc => {
                  const open = openDocentes.has(doc.id)
                  return (
                    <tbody key={doc.id}>
                      <tr
                        onClick={() => toggleDocente(doc.id)}
                        style={{ cursor: 'pointer', background: open ? '#fbfaf5' : '#fff', borderBottom: open ? 'none' : '1px solid #f0eee3' }}
                        onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#faf9f4' }}
                        onMouseLeave={e => { e.currentTarget.style.background = open ? '#fbfaf5' : '#fff' }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{doc.nombre}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b6a60', fontFamily: 'monospace' }}>{doc.numero_nomina}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {doc.is_coordinador
                            ? <span style={{ background: '#e8f4f1', color: ACCENT, borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>Coordinador</span>
                            : <span style={{ background: '#f3f1e8', color: '#6b6a60', borderRadius: 12, padding: '3px 10px', fontSize: 11 }}>Docente</span>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <svg width="16" height="16" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform 0.25s ease', transform: open ? 'rotate(180deg)' : 'none', color: '#9a988c', display: 'inline-block' }}>
                            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f0eee3' }}>
                        <td colSpan={4} style={{ padding: 0 }}>
                          <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
                            <div style={{ overflow: 'hidden', opacity: open ? 1 : 0, transition: 'opacity 0.2s ease' }}>
                              <div style={{ padding: '16px 20px', background: '#fbfaf5', borderTop: '1px solid #eceadd', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                  <p style={{ fontSize: 11, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Email</p>
                                  <p style={{ fontSize: 13, color: '#1C1B17', margin: 0 }}>{doc.email_real || <span style={{ color: '#b3b1a4' }}>—</span>}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: 11, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Materias</p>
                                  {doc.materias.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {doc.materias.map(m => (
                                        <span key={m.id} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: '#e8f4f1', color: ACCENT, border: '1px solid #c5e0da', whiteSpace: 'nowrap' }}>{m.nombre}</span>
                                      ))}
                                    </div>
                                  ) : <span style={{ fontSize: 12, color: '#b3b1a4' }}>Sin materias asignadas</span>}
                                </div>
                              </div>
                              <div style={{ padding: '10px 20px 14px', borderTop: '1px solid #eceadd', display: 'flex', gap: 8 }}>
                                <button onClick={e => { e.stopPropagation(); openEdit(doc) }} style={btn({ small: true, bg: '#4b7bec' })}>Editar</button>
                                <button onClick={e => { e.stopPropagation(); handleDelete(doc) }} style={btn({ small: true, bg: '#e74c3c' })}>Eliminar</button>
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
        </div>
      </div>
    )
  }

  function renderMaterias() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr
          eyebrow="Catálogo"
          title="Materias"
          desc="Materias prácticas del programa. Solo se pueden eliminar si no tienen materiales asignados."
          action={!matForm && <button onClick={() => { setMatError(null); setMatForm({ mode: 'add', nombre: '' }) }} style={btn()}>+ Agregar materia</button>}
        />
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', overflow: 'hidden' }}>

            {/* Add / Edit form */}
            {matForm && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eceadd', background: '#fbfaf5' }}>
                {matError && <p style={{ background: '#fbeaea', color: '#8a2020', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{matError}</p>}
                <form onSubmit={handleMatSave} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <label style={{ fontSize: 13, color: '#6b6a60', flex: 1 }}>
                    {matForm.mode === 'add' ? 'Nueva materia' : 'Nombre de la materia'}
                    <input style={{ ...inp(), marginTop: 4 }} value={matForm.nombre} onChange={e => setMatForm(f => ({ ...f, nombre: e.target.value }))} required autoFocus />
                  </label>
                  <button type="submit" disabled={matSaving} style={{ ...btn(), opacity: matSaving ? 0.7 : 1 }}>{matSaving ? 'Guardando…' : 'Guardar'}</button>
                  <button type="button" onClick={() => { setMatForm(null); setMatError(null) }} style={ghostBtn}>Cancelar</button>
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
                      <th key={h} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#9a988c', textAlign: 'left', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: BODY }}>{h}</th>
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
                          {docsDeMateria.length > 0 ? docsDeMateria.map(d => d.nombre).join(', ') : <span style={{ color: '#b3b1a4' }}>Sin docentes</span>}
                        </td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => { setMatError(null); setMatForm({ mode: 'edit', id: mat.id, nombre: mat.nombre }) }} style={{ ...btn({ small: true, bg: '#4b7bec' }), marginRight: 6 }}>Editar</button>
                          <button onClick={() => handleMatDelete(mat)} style={btn({ small: true, bg: '#e74c3c' })}>Eliminar</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    )
  }

  function renderSolicitudes() {
    const solsFiltradas = solicitudes.filter(s => filtroEstado === 'todas' || s.estado === filtroEstado)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr eyebrow="Gestión" title="Solicitudes de materiales" desc="Todas las solicitudes de los docentes." />
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['todas', 'borrador', 'enviada', 'recibida', 'procesada'].map(est => (
              <button key={est} onClick={() => setFiltroEstado(est)}
                style={{ padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${filtroEstado === est ? ACCENT : '#d4d0be'}`, background: filtroEstado === est ? ACCENT : 'transparent', color: filtroEstado === est ? '#fff' : '#6b6a60', fontFamily: BODY, fontSize: 12, cursor: 'pointer', fontWeight: filtroEstado === est ? 600 : 400, textTransform: 'capitalize' }}>
                {est === 'todas' ? 'Todas' : est.charAt(0).toUpperCase() + est.slice(1)}
              </button>
            ))}
          </div>

          {solsLoading ? (
            <p style={{ color: '#b3b1a4', fontSize: 14 }}>Cargando solicitudes…</p>
          ) : solsFiltradas.length === 0 ? (
            <p style={{ color: '#b3b1a4', fontSize: 14 }}>No hay solicitudes con ese filtro.</p>
          ) : (
            <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', overflow: 'hidden' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#faf9f4', borderBottom: '1px solid #eceadd' }}>
                    {['Docente', 'Práctica', 'Materia', 'Fecha práctica', 'Estado', ''].map((h, i) => (
                      <th key={i} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#9a988c', textAlign: 'left', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: BODY }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                {solsFiltradas.map(sol => {
                  const open  = openSols.has(sol.id)
                  const badge = BADGE_SOL[sol.estado] ?? BADGE_SOL.borrador
                  const mats  = solMateriales[sol.id] || []
                  return (
                    <tbody key={sol.id}>
                      <tr
                        onClick={() => toggleSol(sol.id)}
                        style={{ cursor: 'pointer', borderBottom: open ? 'none' : '1px solid #f0eee3', background: open ? '#fbfaf5' : '#fff' }}
                        onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#faf9f4' }}
                        onMouseLeave={e => { e.currentTarget.style.background = open ? '#fbfaf5' : '#fff' }}
                      >
                        <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: 13 }}>{sol.docente?.nombre}</td>
                        <td style={{ padding: '10px 16px', fontSize: 13 }}>{sol.nombre_practica}</td>
                        <td style={{ padding: '10px 16px', fontSize: 13, color: '#6b6a60' }}>{sol.materia?.nombre || '—'}</td>
                        <td style={{ padding: '10px 16px', fontSize: 13, color: '#6b6a60' }}>{fmtFechaSol(sol.fecha_practica)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ ...badge, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{badge.label}</span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform 0.25s ease', transform: open ? 'rotate(180deg)' : 'none', color: '#9a988c', display: 'inline-block' }}>
                            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f0eee3' }}>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
                            <div style={{ overflow: 'hidden', opacity: open ? 1 : 0, transition: 'opacity 0.2s ease' }}>
                              <div style={{ padding: '16px 20px', background: '#fbfaf5', borderTop: '1px solid #eceadd' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                                  {[
                                    ['Habilidad/Competencia', sol.habilidad],
                                    ['Fecha enviada', sol.fecha_enviada ? fmtFechaSol(sol.fecha_enviada.split('T')[0]) : '—'],
                                    ['Fecha procesada', sol.fecha_procesada ? fmtFechaSol(sol.fecha_procesada.split('T')[0]) : '—'],
                                  ].map(([lbl, val]) => (
                                    <div key={lbl}>
                                      <p style={{ fontSize: 10, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{lbl}</p>
                                      <p style={{ fontSize: 13, color: '#1C1B17', margin: 0 }}>{val || '—'}</p>
                                    </div>
                                  ))}
                                </div>

                                {mats.length > 0 && (
                                  <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 16, background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
                                    <thead>
                                      <tr style={{ background: '#f0ede6' }}>
                                        {['#', 'Material', 'Cantidad', 'Unidad'].map(h => (
                                          <th key={h} style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: '#6b6a60', textAlign: h === '#' || h === 'Cantidad' ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {mats.map((m, i) => (
                                        <tr key={m.id} style={{ borderTop: '1px solid #f0eee3' }}>
                                          <td style={{ padding: '6px 10px', textAlign: 'center', fontSize: 11, color: '#9a988c' }}>{i + 1}</td>
                                          <td style={{ padding: '6px 10px', fontSize: 13 }}>{m.nombre_material}</td>
                                          <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{m.cantidad ?? '—'}</td>
                                          <td style={{ padding: '6px 10px', fontSize: 12, color: '#6b6a60', textTransform: 'capitalize' }}>{m.unidad}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}

                                <div style={{ marginBottom: 14 }}>
                                  <p style={{ fontSize: 11, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Notas del coordinador</p>
                                  <textarea
                                    value={notasEdit[sol.id] ?? sol.notas_coordinador ?? ''}
                                    onChange={e => setNotasEdit(prev => ({ ...prev, [sol.id]: e.target.value }))}
                                    rows={2} placeholder="Agregar notas…"
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #d4d0be', fontFamily: BODY, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {sol.estado === 'enviada' && (
                                      <button onClick={e => { e.stopPropagation(); cambiarEstado(sol, 'recibida') }} disabled={savingEstado === sol.id} style={{ ...btn({ small: true }), opacity: savingEstado === sol.id ? 0.7 : 1 }}>
                                        Marcar como recibida
                                      </button>
                                    )}
                                    {(sol.estado === 'enviada' || sol.estado === 'recibida') && (
                                      <button onClick={e => { e.stopPropagation(); cambiarEstado(sol, 'procesada') }} disabled={savingEstado === sol.id} style={{ ...btn({ small: true, bg: '#166534' }), opacity: savingEstado === sol.id ? 0.7 : 1 }}>
                                        Marcar como procesada
                                      </button>
                                    )}
                                    {(notasEdit[sol.id] !== undefined && notasEdit[sol.id] !== (sol.notas_coordinador ?? '')) && (
                                      <button onClick={e => { e.stopPropagation(); guardarNotas(sol.id) }} disabled={savingEstado === sol.id} style={{ ...btn({ small: true, bg: '#6b6a60' }), opacity: savingEstado === sol.id ? 0.7 : 1 }}>
                                        Guardar notas
                                      </button>
                                    )}
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); eliminarSolicitud(sol) }} disabled={savingEstado === sol.id} style={{ ...btn({ small: true, bg: '#e74c3c' }), opacity: savingEstado === sol.id ? 0.7 : 1 }}>
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  )
                })}
              </table>
            </section>
          )}
        </div>
      </div>
    )
  }

  const render = { docentes: renderDocentes, materias: renderMaterias, solicitudes: renderSolicitudes }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: BODY, color: '#1C1B17' }}>
      <Sidebar
        userName={docentes.find(d => d.is_coordinador)?.nombre ?? 'Coordinador'}
        role="Coordinador"
        items={NAV}
        active={active}
        onSelect={setActive}
        onSignOut={signOut}
        extraLinks={extraLinks}
        mobile={mobile}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen(v => !v)}
      />
      <div style={{ flex: 1, marginLeft: mobile ? 0 : SIDEBAR_W, paddingTop: mobile ? TOPBAR_H : 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {render[active]?.()}
      </div>
    </div>
  )
}
