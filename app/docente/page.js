'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Sidebar from '@/app/components/Sidebar'

const DISPLAY   = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY      = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const ACCENT    = '#0E6E62'
const BG        = '#F6F4EC'
const ORDEN_SEM = ['1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo']
const SIDEBAR_W = 240
const TOPBAR_H  = 52

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
  recibida:  { background: '#e8f4f1', color: ACCENT,     label: 'Recibida'  },
  procesada: { background: '#dcfce7', color: '#166534',  label: 'Procesada' },
}

const NAV = [
  { id: 'materiales',  icon: '📚', label: 'Materiales por materia'       },
  { id: 'solicitudes', icon: '📋', label: 'Solicitudes a la institución' },
  { id: 'cuenta',      icon: '🔑', label: 'Mi cuenta'                    },
]

function fmtFecha(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
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

export default function DocentePage() {
  const router = useRouter()

  // Layout
  const [active, setActive]     = useState('materiales')
  const [mobile, setMobile]     = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Core data
  const [docente, setDocente]         = useState(null)
  const [materias, setMaterias]       = useState([])
  const [reqs, setReqs]               = useState({})
  const [catalogo, setCatalogo]       = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [vincNomina, setVincNomina]   = useState('')
  const [vincLoading, setVincLoading] = useState(false)
  const [vincError, setVincError]     = useState(null)
  const [authUser, setAuthUser]       = useState(null)

  // Add material form
  const [addingTo, setAddingTo]     = useState(null)
  const [search, setSearch]         = useState('')
  const [selMat, setSelMat]         = useState(null)
  const [creando, setCreando]       = useState(false)
  const [newNombre, setNewNombre]   = useState('')
  const [newMarca, setNewMarca]     = useState('')
  const [addSem, setAddSem]         = useState('')
  const [addCant, setAddCant]       = useState('')
  const [addEspec, setAddEspec]     = useState('')
  const [addNota, setAddNota]       = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError]     = useState(null)

  // Edit row
  const [editingReq, setEditingReq] = useState(null)
  const [editSem, setEditSem]       = useState('')
  const [editCant, setEditCant]     = useState('')
  const [editEspec, setEditEspec]   = useState('')
  const [editNota, setEditNota]     = useState('')

  // Collapsible materias
  const [closedMaterias, setClosedMaterias] = useState(new Set())
  const isMateriaOpen        = id => !closedMaterias.has(id)
  const toggleMateriaSection = id =>
    setClosedMaterias(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // Password
  const [passNew, setPassNew]         = useState('')
  const [passConf, setPassConf]       = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg]         = useState(null)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setAuthUser(user)

    const [{ data: docPorId }, { data: cats }] = await Promise.all([
      supabase.from('docentes').select('id, nombre, numero_nomina, email_real, is_coordinador').eq('auth_user_id', user.id).single(),
      supabase.from('materiales').select('id, nombre, marca_sugerida').order('nombre'),
    ])

    // Fallback: buscar por email_real si auth_user_id no está enlazado aún
    let doc = docPorId
    if (!doc && user.email) {
      const { data: docPorEmail } = await supabase
        .from('docentes').select('id, nombre, numero_nomina, email_real, is_coordinador')
        .eq('email_real', user.email).single()
      doc = docPorEmail
    }
    if (!doc) {
      setError('No se encontró tu perfil de docente. Tu cuenta de acceso existe pero no está vinculada a un registro. Contacta al coordinador.')
      setLoading(false)
      return
    }
    setDocente(doc)
    setCatalogo(cats || [])

    const [{ data: dm }, { data: sols }] = await Promise.all([
      supabase.from('docente_materias').select('materia:materias(id, nombre)').eq('docente_id', doc.id),
      supabase.from('solicitudes').select('id, nombre_practica, fecha_practica, estado, materia_id').eq('docente_id', doc.id).order('id', { ascending: false }),
    ])

    const mats = (dm || []).map(r => Array.isArray(r.materia) ? r.materia[0] : r.materia).filter(Boolean)
    setMaterias(mats)

    const matIds = [...new Set((sols || []).map(s => s.materia_id).filter(Boolean))]
    let matMap = {}
    if (matIds.length) {
      const { data: mn } = await supabase.from('materias').select('id, nombre').in('id', matIds)
      matMap = Object.fromEntries((mn || []).map(m => [m.id, m.nombre]))
    }
    setSolicitudes((sols || []).map(s => ({ ...s, materia_nombre: matMap[s.materia_id] ?? null })))

    if (mats.length > 0) {
      const { data: rqs } = await supabase
        .from('requerimientos')
        .select('id, materia_id, semestre, cantidad, especificacion, nota, material:materiales(id, nombre, marca_sugerida)')
        .in('materia_id', mats.map(m => m.id))
        .order('id')
      const grouped = Object.fromEntries(mats.map(m => [m.id, []]))
      for (const r of rqs || []) {
        const mat = Array.isArray(r.material) ? r.material[0] : r.material
        if (grouped[r.materia_id]) grouped[r.materia_id].push({ ...r, material: mat })
      }
      setReqs(grouped)
    }
    setLoading(false)
  }

  const filteredCatalogo = useMemo(() =>
    search ? catalogo.filter(m => m.nombre.toLowerCase().includes(search.toLowerCase())) : catalogo
  , [catalogo, search])

  function openAdd(materiaId) {
    setClosedMaterias(prev => { const s = new Set(prev); s.delete(materiaId); return s })
    setAddingTo(materiaId); setSearch(''); setSelMat(null); setCreando(false)
    setNewNombre(''); setNewMarca(''); setAddSem(''); setAddCant(''); setAddEspec(''); setAddNota(''); setAddError(null)
  }

  async function handleAdd() {
    setAddError(null)
    if (!selMat && !creando)          { setAddError('Selecciona o crea un material'); return }
    if (creando && !newNombre.trim()) { setAddError('Ingresa el nombre del material'); return }
    setAddLoading(true)
    try {
      let materialId = selMat?.id
      if (creando) {
        const { data: nm, error: me } = await supabase
          .from('materiales')
          .insert({ nombre: newNombre.trim(), marca_sugerida: newMarca.trim() || null })
          .select().single()
        if (me) throw me
        materialId = nm.id
        setCatalogo(prev => [...prev, nm].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
      }
      const { error: re } = await supabase.from('requerimientos').insert({
        materia_id: addingTo, material_id: materialId,
        semestre: addSem || null, cantidad: addCant ? parseInt(addCant) : null,
        especificacion: addEspec.trim() || null, nota: addNota.trim() || null,
      })
      if (re) throw re
      setAddingTo(null); await load()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  function startEdit(r) {
    setEditingReq(r); setEditSem(r.semestre || ''); setEditCant(r.cantidad?.toString() || '')
    setEditEspec(r.especificacion || ''); setEditNota(r.nota || '')
  }
  async function saveEdit() {
    const { error } = await supabase.from('requerimientos').update({
      semestre: editSem || null, cantidad: editCant ? parseInt(editCant) : null,
      especificacion: editEspec.trim() || null, nota: editNota.trim() || null,
    }).eq('id', editingReq.id)
    if (error) { alert(error.message); return }
    setEditingReq(null); await load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este material de la lista?')) return
    await supabase.from('requerimientos').delete().eq('id', id)
    await load()
  }

  async function handlePassword(e) {
    e.preventDefault(); setPassMsg(null)
    if (passNew !== passConf) { setPassMsg({ ok: false, text: 'Las contraseñas no coinciden' }); return }
    if (passNew.length < 8)   { setPassMsg({ ok: false, text: 'Mínimo 8 caracteres' }); return }
    setPassLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passNew })
    setPassLoading(false)
    if (error) { setPassMsg({ ok: false, text: error.message }); return }
    setPassMsg({ ok: true, text: 'Contraseña actualizada correctamente.' })
    setPassNew(''); setPassConf('')
  }

  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  async function handleVincular(e) {
    e.preventDefault()
    setVincError(null)
    if (!vincNomina.trim()) { setVincError('Ingresa tu nómina'); return }
    setVincLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesión activa. Inicia sesión nuevamente.')

      const resp = await fetch('/api/vincular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ nomina: vincNomina.trim() }),
      })

      const result = await resp.json()
      if (!resp.ok) throw new Error(result.error ?? 'No se pudo vincular la cuenta')

      setError(null)
      setVincNomina('')
      await load()
    } catch (err) {
      setVincError(err.message)
    } finally {
      setVincLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY }}>
      <p style={{ color: '#6b6a60' }}>Cargando…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY, padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '36px', maxWidth: 420, width: '100%' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px', fontFamily: BODY }}>Cirujano Dentista</p>
        <p style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: '#1C1B17', margin: '0 0 6px' }}>Vincular perfil docente</p>
        <p style={{ fontSize: 13, color: '#9a988c', margin: '0 0 24px', lineHeight: 1.6 }}>
          Tu cuenta de acceso existe pero no está vinculada a un perfil docente.<br/>
          Ingresa tu nómina para vincularlos.
        </p>
        {authUser?.email && (
          <p style={{ fontSize: 12, color: '#6b6a60', background: '#f6f4ec', borderRadius: 8, padding: '8px 12px', marginBottom: 18 }}>
            Cuenta activa: <strong>{authUser.email}</strong>
          </p>
        )}
        {vincError && (
          <p style={{ background: '#fbeaea', color: '#8a2020', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{vincError}</p>
        )}
        <form onSubmit={handleVincular}>
          <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginBottom: 16 }}>
            Tu nómina
            <input
              style={{ display: 'block', width: '100%', padding: '9px 12px', marginTop: 4, borderRadius: 8, border: '1.5px solid #d4d0be', fontFamily: BODY, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              value={vincNomina}
              onChange={e => setVincNomina(e.target.value)}
              required autoFocus placeholder="Ej. 12345"
            />
          </label>
          <button
            type="submit"
            disabled={vincLoading}
            style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 8, background: ACCENT, color: '#fff', border: 'none', fontFamily: BODY, fontWeight: 600, fontSize: 14, cursor: vincLoading ? 'not-allowed' : 'pointer', opacity: vincLoading ? 0.7 : 1 }}
          >
            {vincLoading ? 'Vinculando…' : 'Vincular mi cuenta'}
          </button>
        </form>
        <button
          onClick={signOut}
          style={{ display: 'block', width: '100%', marginTop: 10, padding: '8px', borderRadius: 8, background: 'transparent', border: '1px solid #d4d0be', fontFamily: BODY, fontSize: 13, color: '#9a988c', cursor: 'pointer' }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  const extraLinks = [
    { icon: '🌐', label: 'Lista pública', href: '/lista' },
    ...(docente?.is_coordinador ? [{ icon: '⚙️', label: 'Panel coordinador', href: '/coordinador' }] : []),
  ]

  // ── Section renderers ─────────────────────────────────────────────────────────

  function renderMateriales() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr
          eyebrow="Materiales por materia"
          title="Materiales requeridos para alumnos"
          desc="Lista de materiales que cada alumno debe adquirir por su cuenta para tus materias."
        />
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {materias.length === 0 && (
            <p style={{ color: '#6b6a60', fontSize: 14 }}>No tienes materias asignadas aún.</p>
          )}
          {materias.map(materia => {
            const items = reqs[materia.id] || []
            return (
              <section key={materia.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', marginBottom: 20, overflow: 'hidden' }}>
                <button
                  onClick={() => toggleMateriaSection(materia.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: BODY, borderBottom: isMateriaOpen(materia.id) ? '1px solid #eceadd' : 'none' }}
                >
                  <h2 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, margin: 0 }}>{materia.nombre}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>{items.length} materiales</span>
                    <svg width="16" height="16" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transition: 'transform 0.25s ease', transform: isMateriaOpen(materia.id) ? 'rotate(180deg)' : 'none' }}>
                      <path d="M2 4l4 4 4-4" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>

                <div style={{ display: 'grid', gridTemplateRows: isMateriaOpen(materia.id) ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
                  <div style={{ overflow: 'hidden', opacity: isMateriaOpen(materia.id) ? 1 : 0, transition: 'opacity 0.2s ease' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <thead>
                        <tr style={{ background: '#faf9f4', borderBottom: '1px solid #eceadd' }}>
                          {['#', 'Material', 'Especificación / Marca', 'Sem.', 'Cant.', 'Acciones'].map(h => (
                            <th key={h} style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: '#9a988c', textAlign: h === 'Acciones' ? 'center' : 'left', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: BODY }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((r, i) => (
                          editingReq?.id === r.id ? (
                            <tr key={r.id} style={{ background: '#f6f4ec', borderBottom: '1px solid #eceadd' }}>
                              <td style={{ padding: '8px 14px', fontSize: 11, color: ACCENT, fontWeight: 600, textAlign: 'center' }}>{i + 1}</td>
                              <td style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>{r.material?.nombre}</td>
                              <td style={{ padding: '6px 14px' }}><input style={inp()} value={editEspec} onChange={e => setEditEspec(e.target.value)} placeholder="Especificación" /></td>
                              <td style={{ padding: '6px 14px' }}>
                                <select style={{ ...inp('80px') }} value={editSem} onChange={e => setEditSem(e.target.value)}>
                                  <option value="">—</option>
                                  {ORDEN_SEM.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '6px 14px' }}><input style={inp('60px')} type="number" min="1" value={editCant} onChange={e => setEditCant(e.target.value)} placeholder="Cant." /></td>
                              <td style={{ padding: '6px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <button onClick={saveEdit} style={{ ...btn({ small: true }), marginRight: 6 }}>Guardar</button>
                                <button onClick={() => setEditingReq(null)} style={ghostBtn}>Cancelar</button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f0eee3' }}>
                              <td style={{ padding: '8px 14px', fontSize: 11, color: ACCENT, fontWeight: 600, textAlign: 'center' }}>{i + 1}</td>
                              <td style={{ padding: '8px 14px', verticalAlign: 'top' }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.material?.nombre}</div>
                                {r.nota && <div style={{ fontSize: 11, color: '#a8a699', fontStyle: 'italic', marginTop: 2 }}>{r.nota}</div>}
                              </td>
                              <td style={{ padding: '8px 14px', fontSize: 13, color: '#6b6a60' }}>
                                {[r.especificacion, r.material?.marca_sugerida].filter(Boolean).join(' · ') || '—'}
                              </td>
                              <td style={{ padding: '8px 14px', fontSize: 13, color: '#6b6a60' }}>{r.semestre || '—'}</td>
                              <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                {r.cantidad != null ? <span style={{ fontWeight: 700, fontSize: 13 }}>{r.cantidad}×</span> : <span style={{ color: '#ccc' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <button onClick={() => startEdit(r)} style={{ ...btn({ small: true, bg: '#4b7bec' }), marginRight: 6 }}>Editar</button>
                                <button onClick={() => handleDelete(r.id)} style={btn({ small: true, bg: '#e74c3c' })}>Eliminar</button>
                              </td>
                            </tr>
                          )
                        ))}
                        {items.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: '16px 14px', textAlign: 'center', color: '#b3b1a4', fontSize: 13 }}>Sin materiales aún</td></tr>
                        )}
                      </tbody>
                    </table>

                    {/* Add form */}
                    {addingTo === materia.id ? (
                      <div style={{ borderTop: '1px solid #e7e4d6', padding: '16px 20px', background: '#fbfaf5' }}>
                        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Agregar material</p>
                        {addError && <p style={{ background: '#fbeaea', color: '#8a2020', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 10 }}>{addError}</p>}
                        {!selMat && !creando && (
                          <>
                            <input style={{ ...inp(), marginBottom: 8 }} placeholder="Buscar en catálogo…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                            <div style={{ border: '1px solid #e7e4d6', borderRadius: 8, background: '#fff', maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
                              {filteredCatalogo.slice(0, 10).map(m => (
                                <div key={m.id} onClick={() => { setSelMat(m); setSearch('') }}
                                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0eee3' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#f6f4ec'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                  <strong>{m.nombre}</strong>
                                  {m.marca_sugerida && <span style={{ color: '#9a988c', marginLeft: 6 }}>{m.marca_sugerida}</span>}
                                </div>
                              ))}
                              {filteredCatalogo.length === 0 && <p style={{ padding: '8px 12px', fontSize: 12, color: '#b3b1a4' }}>Sin coincidencias</p>}
                            </div>
                            <button onClick={() => setCreando(true)} style={{ ...ghostBtn, borderColor: ACCENT, color: ACCENT }}>+ Crear nuevo material</button>
                          </>
                        )}
                        {creando && (
                          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            <input style={inp()} placeholder="Nombre del material *" value={newNombre} onChange={e => setNewNombre(e.target.value)} autoFocus />
                            <input style={inp('200px')} placeholder="Marca (opcional)" value={newMarca} onChange={e => setNewMarca(e.target.value)} />
                            <button onClick={() => setCreando(false)} style={ghostBtn}>✕</button>
                          </div>
                        )}
                        {(selMat || creando) && (
                          <>
                            {selMat && (
                              <div style={{ background: '#e8f4f1', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span><strong>{selMat.nombre}</strong>{selMat.marca_sugerida ? ` · ${selMat.marca_sugerida}` : ''}</span>
                                <button onClick={() => setSelMat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a988c', fontSize: 16 }}>✕</button>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                              <select style={inp('100px')} value={addSem} onChange={e => setAddSem(e.target.value)}>
                                <option value="">Semestre</option>
                                {ORDEN_SEM.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <input style={inp('80px')} type="number" min="1" placeholder="Cant." value={addCant} onChange={e => setAddCant(e.target.value)} />
                              <input style={{ ...inp(), flex: 1 }} placeholder="Especificación" value={addEspec} onChange={e => setAddEspec(e.target.value)} />
                              <input style={{ ...inp(), flex: 1 }} placeholder="Nota (opcional)" value={addNota} onChange={e => setAddNota(e.target.value)} />
                            </div>
                          </>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button onClick={handleAdd} disabled={addLoading} style={btn()}>{addLoading ? 'Guardando…' : 'Guardar'}</button>
                          <button onClick={() => setAddingTo(null)} style={ghostBtn}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '10px 20px', borderTop: '1px solid #f0eee3' }}>
                        <button onClick={() => openAdd(materia.id)} style={{ ...btn({ bg: '#fff' }), color: ACCENT, border: `1.5px solid ${ACCENT}` }}>
                          + Agregar material
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  function renderSolicitudes() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr
          eyebrow="Solicitudes a la institución"
          title="Solicitud de materiales para prácticas"
          desc="Materiales que la escuela debe proveer para tus prácticas. Genera y gestiona tus solicitudes."
          action={
            <button onClick={() => router.push('/docente/solicitudes/nueva')} style={btn()}>
              + Nueva solicitud
            </button>
          }
        />
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {solicitudes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6' }}>
              <p style={{ fontFamily: DISPLAY, fontSize: 20, color: '#9a988c', marginBottom: 8 }}>Sin solicitudes aún</p>
              <p style={{ fontSize: 14, color: '#b3b1a4', marginBottom: 24 }}>Crea tu primera solicitud de materiales para práctica.</p>
              <button onClick={() => router.push('/docente/solicitudes/nueva')} style={btn()}>+ Nueva solicitud</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {solicitudes.map(s => {
                const badge = BADGE[s.estado] ?? BADGE.borrador
                return (
                  <a key={s.id} href={`/docente/solicitudes/${s.id}`} style={{ textDecoration: 'none' }}>
                    <div
                      style={{ background: '#fff', borderRadius: 14, border: '1px solid #e7e4d6', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = '0 4px 14px rgba(14,110,98,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e7e4d6'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div>
                        <p style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, color: '#1C1B17', margin: '0 0 3px' }}>
                          {s.nombre_practica || <em style={{ color: '#9a988c' }}>Sin nombre</em>}
                        </p>
                        <p style={{ fontSize: 12, color: '#9a988c', margin: 0 }}>
                          {s.materia_nombre ?? '—'}
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
      </div>
    )
  }

  function renderCuenta() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr
          eyebrow="Mi cuenta"
          title="Seguridad"
          desc="Información de tu cuenta y contraseña de acceso."
        />
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

          {/* Datos de la cuenta */}
          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '24px', maxWidth: 480, marginBottom: 20 }}>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600, margin: '0 0 16px' }}>Datos de la cuenta</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Nombre',  docente?.nombre    ],
                ['Nómina',  docente?.numero_nomina ],
                ['Correo',  docente?.email_real ],
                ['Rol',     docente?.is_coordinador ? 'Coordinador' : 'Docente'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px', fontFamily: BODY }}>{label}</p>
                  <p style={{ fontSize: 14, color: '#1C1B17', margin: 0, fontFamily: value === docente?.numero_nomina ? 'monospace' : BODY }}>
                    {value || <em style={{ color: '#b3b1a4' }}>—</em>}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '24px', maxWidth: 480 }}>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600, margin: '0 0 20px' }}>Cambiar contraseña</h2>
            <form onSubmit={handlePassword}>
              {passMsg && (
                <p style={{ background: passMsg.ok ? '#e8f4f1' : '#fbeaea', color: passMsg.ok ? '#0c5a50' : '#8a2020', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
                  {passMsg.text}
                </p>
              )}
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginBottom: 12 }}>
                Nueva contraseña
                <input type="password" style={{ ...inp(), marginTop: 4, display: 'block', width: '100%' }} value={passNew} onChange={e => setPassNew(e.target.value)} required />
              </label>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginBottom: 16 }}>
                Confirmar contraseña
                <input type="password" style={{ ...inp(), marginTop: 4, display: 'block', width: '100%' }} value={passConf} onChange={e => setPassConf(e.target.value)} required />
              </label>
              <button type="submit" disabled={passLoading} style={{ ...btn(), opacity: passLoading ? 0.7 : 1 }}>
                {passLoading ? 'Guardando…' : 'Actualizar contraseña'}
              </button>
            </form>
          </section>
        </div>
      </div>
    )
  }

  const render = { materiales: renderMateriales, solicitudes: renderSolicitudes, cuenta: renderCuenta }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: BODY, color: '#1C1B17' }}>
      <Sidebar
        userName={docente?.nombre}
        role="Docente"
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
