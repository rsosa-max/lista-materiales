'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const DISPLAY   = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY      = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const ACCENT    = '#0E6E62'
const BG        = '#F6F4EC'
const ORDEN_SEM = ['1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo']

// ── Shared style helpers ──────────────────────────────────────────────────────
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
const ghostBtn = { padding: '5px 12px', borderRadius: 8, background: 'transparent',
  border: `1.5px solid #d4d0be`, fontFamily: BODY, fontSize: 12, cursor: 'pointer', color: '#6b6a60' }

export default function DocentePage() {
  const router = useRouter()

  const [docente, setDocente]   = useState(null)
  const [materias, setMaterias] = useState([])
  const [reqs, setReqs]         = useState({})       // { materia_id: [req, ...] }
  const [catalogo, setCatalogo] = useState([])
  const [loading, setLoading]   = useState(true)

  // ── Add form ─────────────────────────────────────────────────────────────────
  const [addingTo, setAddingTo]       = useState(null)  // materia_id
  const [search, setSearch]           = useState('')
  const [selMat, setSelMat]           = useState(null)  // { id, nombre, marca_sugerida }
  const [creando, setCreando]         = useState(false)
  const [newNombre, setNewNombre]     = useState('')
  const [newMarca, setNewMarca]       = useState('')
  const [addSem, setAddSem]           = useState('')
  const [addCant, setAddCant]         = useState('')
  const [addEspec, setAddEspec]       = useState('')
  const [addNota, setAddNota]         = useState('')
  const [addLoading, setAddLoading]   = useState(false)
  const [addError, setAddError]       = useState(null)

  // ── Edit row ──────────────────────────────────────────────────────────────────
  const [editingReq, setEditingReq]   = useState(null)
  const [editSem, setEditSem]         = useState('')
  const [editCant, setEditCant]       = useState('')
  const [editEspec, setEditEspec]     = useState('')
  const [editNota, setEditNota]       = useState('')

  // ── Collapsible sections (default: all expanded) ─────────────────────────────
  const [closedMaterias, setClosedMaterias] = useState(new Set())
  const isMateriaOpen       = (id) => !closedMaterias.has(id)
  const toggleMateriaSection = (id) =>
    setClosedMaterias(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // ── Password ──────────────────────────────────────────────────────────────────
  const [showPass, setShowPass]       = useState(false)
  const [passNew, setPassNew]         = useState('')
  const [passConf, setPassConf]       = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg]         = useState(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap'
    document.head.appendChild(link)
  }, [])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: doc }, { data: cats }] = await Promise.all([
      supabase.from('docentes').select('id, nombre, is_coordinador').eq('auth_user_id', user.id).single(),
      supabase.from('materiales').select('id, nombre, marca_sugerida').order('nombre'),
    ])
    if (!doc) { router.push('/login'); return }
    setDocente(doc)
    setCatalogo(cats || [])

    const { data: dm } = await supabase
      .from('docente_materias')
      .select('materia:materias(id, nombre)')
      .eq('docente_id', doc.id)

    const mats = (dm || []).map(r => Array.isArray(r.materia) ? r.materia[0] : r.materia).filter(Boolean)
    setMaterias(mats)

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
    setAddingTo(materiaId)
    setSearch(''); setSelMat(null); setCreando(false)
    setNewNombre(''); setNewMarca('')
    setAddSem(''); setAddCant(''); setAddEspec(''); setAddNota('')
    setAddError(null)
  }
  function closeAdd() { setAddingTo(null) }

  async function handleAdd() {
    setAddError(null)
    if (!selMat && !creando) { setAddError('Selecciona o crea un material'); return }
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
        materia_id: addingTo,
        material_id: materialId,
        semestre: addSem || null,
        cantidad: addCant ? parseInt(addCant) : null,
        especificacion: addEspec.trim() || null,
        nota: addNota.trim() || null,
      })
      if (re) throw re
      closeAdd()
      await load()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  function startEdit(r) {
    setEditingReq(r)
    setEditSem(r.semestre || '')
    setEditCant(r.cantidad?.toString() || '')
    setEditEspec(r.especificacion || '')
    setEditNota(r.nota || '')
  }
  async function saveEdit() {
    const { error } = await supabase.from('requerimientos').update({
      semestre: editSem || null,
      cantidad: editCant ? parseInt(editCant) : null,
      especificacion: editEspec.trim() || null,
      nota: editNota.trim() || null,
    }).eq('id', editingReq.id)
    if (error) { alert(error.message); return }
    setEditingReq(null)
    await load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este material de la lista?')) return
    await supabase.from('requerimientos').delete().eq('id', id)
    await load()
  }

  async function handlePassword(e) {
    e.preventDefault()
    setPassMsg(null)
    if (passNew !== passConf)  { setPassMsg({ ok: false, text: 'Las contraseñas no coinciden' }); return }
    if (passNew.length < 8)    { setPassMsg({ ok: false, text: 'Mínimo 8 caracteres' }); return }
    setPassLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passNew })
    setPassLoading(false)
    if (error) { setPassMsg({ ok: false, text: error.message }); return }
    setPassMsg({ ok: true, text: 'Contraseña actualizada.' })
    setPassNew(''); setPassConf('')
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
          <h1 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: 0 }}>
            Bienvenido, {docente?.nombre}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/lista" style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-block' }}>Lista pública</a>
          {docente?.is_coordinador && (
            <a href="/coordinador" style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-block', color: ACCENT, borderColor: ACCENT }}>
              Panel coordinador
            </a>
          )}
          <button onClick={signOut} style={ghostBtn}>Cerrar sesión</button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {materias.length === 0 && (
          <p style={{ color: '#6b6a60' }}>No tienes materias asignadas aún.</p>
        )}

        {/* ── Materias ── */}
        {materias.map(materia => {
          const items = reqs[materia.id] || []
          return (
            <section key={materia.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', marginBottom: 24, overflow: 'hidden' }}>
              {/* Materia header — toggles section */}
              <button
                onClick={() => toggleMateriaSection(materia.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                         padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: BODY,
                         borderBottom: isMateriaOpen(materia.id) ? '1px solid #eceadd' : 'none' }}
              >
                <h2 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, margin: 0 }}>{materia.nombre}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>{items.length} materiales</span>
                  <svg width="16" height="16" viewBox="0 0 12 12" fill="none"
                    style={{ flexShrink: 0, transition: 'transform 0.25s ease',
                             transform: isMateriaOpen(materia.id) ? 'rotate(180deg)' : 'none' }}>
                    <path d="M2 4l4 4 4-4" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>

              {/* Collapsible body */}
              <div style={{ display: 'grid', gridTemplateRows: isMateriaOpen(materia.id) ? '1fr' : '0fr',
                            transition: 'grid-template-rows 0.3s ease' }}>
              <div style={{ overflow: 'hidden', opacity: isMateriaOpen(materia.id) ? 1 : 0, transition: 'opacity 0.2s ease' }}>

              {/* Table */}
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
                        <td style={{ padding: '6px 14px' }}>
                          <input style={inp()} value={editEspec} onChange={e => setEditEspec(e.target.value)} placeholder="Especificación" />
                        </td>
                        <td style={{ padding: '6px 14px' }}>
                          <select style={{ ...inp('80px') }} value={editSem} onChange={e => setEditSem(e.target.value)}>
                            <option value="">—</option>
                            {ORDEN_SEM.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 14px' }}>
                          <input style={inp('60px')} type="number" min="1" value={editCant} onChange={e => setEditCant(e.target.value)} placeholder="Cant." />
                        </td>
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
                          {r.cantidad != null
                            ? <span style={{ fontWeight: 700, fontSize: 13 }}>{r.cantidad}×</span>
                            : <span style={{ color: '#ccc' }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button onClick={() => startEdit(r)} style={{ ...btn({ small: true, bg: '#4b7bec' }), marginRight: 6 }}>Editar</button>
                          <button onClick={() => handleDelete(r.id)} style={{ ...btn({ small: true, bg: '#e74c3c' }) }}>Eliminar</button>
                        </td>
                      </tr>
                    )
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '16px 14px', textAlign: 'center', color: '#b3b1a4', fontSize: 13 }}>
                        Sin materiales aún
                      </td>
                    </tr>
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
                      <input
                        style={{ ...inp(), marginBottom: 8 }}
                        placeholder="Buscar en catálogo…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                      />
                      <div style={{ border: '1px solid #e7e4d6', borderRadius: 8, background: '#fff', maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
                        {filteredCatalogo.slice(0, 10).map(m => (
                          <div
                            key={m.id}
                            onClick={() => { setSelMat(m); setSearch('') }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0eee3' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f6f4ec'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            <strong>{m.nombre}</strong>
                            {m.marca_sugerida && <span style={{ color: '#9a988c', marginLeft: 6 }}>{m.marca_sugerida}</span>}
                          </div>
                        ))}
                        {filteredCatalogo.length === 0 && (
                          <p style={{ padding: '8px 12px', fontSize: 12, color: '#b3b1a4' }}>Sin coincidencias</p>
                        )}
                      </div>
                      <button onClick={() => setCreando(true)} style={{ ...ghostBtn, borderColor: ACCENT, color: ACCENT }}>
                        + Crear nuevo material
                      </button>
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
                    <button onClick={handleAdd} disabled={addLoading} style={btn()}>
                      {addLoading ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button onClick={closeAdd} style={ghostBtn}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 20px', borderTop: '1px solid #f0eee3' }}>
                  <button onClick={() => openAdd(materia.id)} style={{ ...btn({ bg: '#fff' }), color: ACCENT, border: `1.5px solid ${ACCENT}` }}>
                    + Agregar material
                  </button>
                </div>
              )}
              </div>{/* /collapseInner */}
              </div>{/* /collapseOuter */}
            </section>
          )
        })}

        {/* ── Cambiar contraseña ── */}
        <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', overflow: 'hidden' }}>
          <button
            onClick={() => { setShowPass(!showPass); setPassMsg(null) }}
            style={{ width: '100%', textAlign: 'left', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: BODY, fontSize: 14, fontWeight: 600, color: '#1C1B17', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            Cambiar contraseña
            <span style={{ color: '#9a988c', fontSize: 18 }}>{showPass ? '▲' : '▼'}</span>
          </button>

          {showPass && (
            <form onSubmit={handlePassword} style={{ padding: '0 20px 20px' }}>
              {passMsg && (
                <p style={{ background: passMsg.ok ? '#e8f4f1' : '#fbeaea', color: passMsg.ok ? '#0c5a50' : '#8a2020', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
                  {passMsg.text}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13, color: '#6b6a60', flex: 1, minWidth: 180 }}>
                  Nueva contraseña
                  <input type="password" style={{ ...inp(), marginTop: 4, display: 'block', width: '100%' }} value={passNew} onChange={e => setPassNew(e.target.value)} required />
                </label>
                <label style={{ fontSize: 13, color: '#6b6a60', flex: 1, minWidth: 180 }}>
                  Confirmar
                  <input type="password" style={{ ...inp(), marginTop: 4, display: 'block', width: '100%' }} value={passConf} onChange={e => setPassConf(e.target.value)} required />
                </label>
              </div>
              <button type="submit" disabled={passLoading} style={{ ...btn(), marginTop: 12 }}>
                {passLoading ? 'Guardando…' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </section>

      </div>
    </main>
  )
}
