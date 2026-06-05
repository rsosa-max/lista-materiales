'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Sidebar from '@/app/components/Sidebar'

const DISPLAY   = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY      = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const ACCENT    = '#0E6E62'
const BG        = '#F6F4EC'
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
  ajustada:  { background: '#fef3c7', color: '#92400e',  label: 'Ajustada'  },
  aprobada:  { background: '#dcfce7', color: '#166534',  label: 'Aprobada'  },
  entregada: { background: '#ede9fe', color: '#5b21b6',  label: 'Entregada' },
  cerrada:   { background: '#f1f5f9', color: '#475569',  label: 'Cerrada'   },
  procesada: { background: '#dcfce7', color: '#166534',  label: 'Procesada' },
}

const NAV = [
  { id: 'solicitudes', icon: '📋', label: 'Solicitudes'        },
  { id: 'imprimir',   icon: '🖨',  label: 'Imprimir solicitud' },
  { id: 'cuenta',     icon: '🔑',  label: 'Mi cuenta'          },
]

const ESTADOS_FILTRO = ['todas', 'enviada', 'recibida', 'ajustada', 'aprobada', 'entregada', 'cerrada']
const ORDEN_ESTADOS  = ['enviada', 'recibida', 'ajustada', 'aprobada', 'entregada', 'cerrada', 'borrador', 'procesada']

const PRINT_CSS = `
  .insumos-print-only { display: none; }
  @media print {
    .insumos-no-print   { display: none !important; }
    .insumos-print-only { display: block !important; }
    body, html { background: white !important; color: black !important; margin: 0; padding: 0; }
    .insumos-print-only { font-family: 'Hanken Grotesk', sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; }
    .pt { border-collapse: collapse; width: 100%; font-size: 11px; }
    .pt th { border: 1px solid #999; padding: 5px 8px; background: #f0f0f0; font-weight: 600; text-align: left; }
    .pt td { border: 1px solid #bbb; padding: 5px 8px; }
  }
`

function fmtFecha(iso) {
  if (!iso) return '—'
  const d = iso.includes('T') ? new Date(iso) : new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtFechaCorta(iso) {
  if (!iso) return '—'
  const d = iso.includes('T') ? new Date(iso) : new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SectionHdr({ eyebrow, title, desc, action }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e7e4d6', padding: '20px 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
      <div>
        {eyebrow && <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 4px', fontFamily: BODY }}>{eyebrow}</p>}
        <h1 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, margin: '0 0 4px', color: '#1C1B17' }}>{title}</h1>
        {desc && <p style={{ fontFamily: BODY, fontSize: 13, color: '#9a988c', margin: 0 }}>{desc}</p>}
      </div>
      {action && <div style={{ flexShrink: 0, paddingTop: 4 }}>{action}</div>}
    </div>
  )
}

export default function InsumosPage() {
  const router = useRouter()

  const [active, setActive]     = useState('solicitudes')
  const [mobile, setMobile]     = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const [insumos, setInsumos]         = useState(null)
  const [pageLoading, setPageLoading] = useState(true)

  const [solicitudes, setSolicitudes]     = useState([])
  const [filtroEstado, setFiltroEstado]   = useState('todas')
  const [filtroDocente, setFiltroDocente] = useState('')

  const [selectedId, setSelectedId]       = useState(null)
  const [solDetail, setSolDetail]         = useState(null)
  const [solMats, setSolMats]             = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [showAjuste, setShowAjuste]             = useState(false)
  const [ajusteRows, setAjusteRows]             = useState([])
  const [comentarioAjuste, setComentarioAjuste] = useState('')
  const [savingAjuste, setSavingAjuste]         = useState(false)
  const [ajusteAlert, setAjusteAlert]           = useState(null)

  const [savingEstado, setSavingEstado] = useState(false)

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

  useEffect(() => { loadInitial() }, [])

  async function loadInitial() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: doc } = await supabase.from('docentes')
      .select('id, nombre, is_insumos, email_real')
      .eq('auth_user_id', user.id).single()
    if (!doc?.is_insumos) { router.push('/login'); return }
    setInsumos(doc)
    await loadSolicitudes()
    setPageLoading(false)
  }

  async function loadSolicitudes() {
    const { data: sols } = await supabase.from('solicitudes').select('*').order('id', { ascending: false })
    const docenteIds = [...new Set((sols || []).map(s => s.docente_id).filter(Boolean))]
    const materiaIds = [...new Set((sols || []).map(s => s.materia_id).filter(Boolean))]
    const [{ data: docs }, { data: mats }] = await Promise.all([
      docenteIds.length ? supabase.from('docentes').select('id, nombre, email_real').in('id', docenteIds) : Promise.resolve({ data: [] }),
      materiaIds.length ? supabase.from('materias').select('id, nombre').in('id', materiaIds) : Promise.resolve({ data: [] }),
    ])
    const docMap = Object.fromEntries((docs || []).map(d => [d.id, d]))
    const matMap = Object.fromEntries((mats || []).map(m => [m.id, m]))
    setSolicitudes((sols || []).map(s => ({
      ...s,
      docente: docMap[s.docente_id] ?? { nombre: '—', email_real: null },
      materia: matMap[s.materia_id] ?? null,
    })))
  }

  async function openDetail(id) {
    setSelectedId(id)
    setShowAjuste(false)
    setAjusteAlert(null)
    setLoadingDetail(true)

    const [{ data: sol }, { data: mats }] = await Promise.all([
      supabase.from('solicitudes')
        .select('*, docente:docentes(id, nombre, email_real), materia:materias(id, nombre)')
        .eq('id', id).single(),
      supabase.from('solicitud_materiales').select('*').eq('solicitud_id', id).order('id'),
    ])

    // Auto-aprobación si ajustada > 48 h sin respuesta del docente
    if (sol?.estado === 'ajustada' && sol.fecha_ajuste) {
      const horas = (Date.now() - new Date(sol.fecha_ajuste).getTime()) / 3600000
      if (horas > 48) {
        const notaAuto = 'Aprobado automáticamente por vencimiento de plazo'
        const comentFinal = sol.comentario_ajuste
          ? sol.comentario_ajuste + '\n' + notaAuto
          : notaAuto
        await supabase.from('solicitudes').update({
          estado: 'aprobada',
          comentario_ajuste: comentFinal,
          fecha_aprobacion_docente: new Date().toISOString(),
        }).eq('id', id)
        const { data: solAct } = await supabase.from('solicitudes')
          .select('*, docente:docentes(id, nombre, email_real), materia:materias(id, nombre)')
          .eq('id', id).single()
        setSolDetail(solAct)
        setSolMats(mats || [])
        setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: 'aprobada' } : s))
        setLoadingDetail(false)
        return
      }
    }

    setSolDetail(sol)
    setSolMats(mats || [])
    setLoadingDetail(false)
  }

  function openAjusteModule() {
    setAjusteRows((solMats || []).map(m => ({
      id: m.id,
      nombre_material: m.nombre_material,
      cantidad: m.cantidad,
      cantidad_ajustada: m.cantidad_ajustada != null ? String(m.cantidad_ajustada) : '',
      disponible: m.disponible !== false,
      nota_ajuste: m.nota_ajuste ?? '',
    })))
    setComentarioAjuste(solDetail?.comentario_ajuste ?? '')
    setShowAjuste(true)
    setAjusteAlert(null)
  }

  async function guardarAjuste() {
    setSavingAjuste(true)
    try {
      for (const row of ajusteRows) {
        await supabase.from('solicitud_materiales').update({
          cantidad_ajustada: row.cantidad_ajustada !== '' ? parseInt(row.cantidad_ajustada) : null,
          disponible: row.disponible,
          nota_ajuste: row.nota_ajuste.trim() || null,
        }).eq('id', row.id)
      }
      const docParaAlerta = Array.isArray(solDetail?.docente) ? solDetail.docente[0] : solDetail?.docente
      await supabase.from('solicitudes').update({
        estado: 'ajustada',
        fecha_ajuste: new Date().toISOString(),
        comentario_ajuste: comentarioAjuste.trim() || null,
      }).eq('id', selectedId)
      setShowAjuste(false)
      await openDetail(selectedId)
      await loadSolicitudes()
      setAjusteAlert({ nombre: docParaAlerta?.nombre, email: docParaAlerta?.email_real })
    } finally {
      setSavingAjuste(false)
    }
  }

  async function cambiarEstado(nuevoEstado) {
    setSavingEstado(true)
    const update = { estado: nuevoEstado }
    if (nuevoEstado === 'aprobada') update.fecha_aprobacion_docente = new Date().toISOString()
    await supabase.from('solicitudes').update(update).eq('id', selectedId)
    setSavingEstado(false)
    await openDetail(selectedId)
    await loadSolicitudes()
  }

  async function handlePassword(e) {
    e.preventDefault(); setPassMsg(null)
    if (passNew !== passConf) { setPassMsg({ ok: false, text: 'Las contraseñas no coinciden' }); return }
    if (passNew.length < 8) { setPassMsg({ ok: false, text: 'Mínimo 8 caracteres' }); return }
    setPassLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passNew })
    setPassLoading(false)
    if (error) { setPassMsg({ ok: false, text: error.message }); return }
    setPassMsg({ ok: true, text: 'Contraseña actualizada correctamente.' })
    setPassNew(''); setPassConf('')
  }

  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  function clearDetail() { setSelectedId(null); setSolDetail(null); setSolMats([]); setAjusteAlert(null); setShowAjuste(false) }

  if (pageLoading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY }}>
      <p style={{ color: '#6b6a60' }}>Cargando…</p>
    </div>
  )

  // ── Print document (hidden on screen, visible on print) ──────────────────────

  const sol4Print      = solDetail
  const docente4Print  = sol4Print ? (Array.isArray(sol4Print.docente) ? sol4Print.docente[0] : sol4Print.docente) : null
  const materia4Print  = sol4Print ? (Array.isArray(sol4Print.materia) ? sol4Print.materia[0] : sol4Print.materia) : null
  const hayAjuste      = solMats.some(m => m.cantidad_ajustada != null || m.disponible === false || m.nota_ajuste)

  const printDoc = sol4Print ? (
    <div className="insumos-print-only">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontSize: 13, margin: '0 0 2px' }}>Universidad de Montemorelos · Escuela de Ciencias Estomatológicas</p>
        <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.05em', margin: '14px 0 18px', textTransform: 'uppercase' }}>
          Solicitud de Materiales para Práctica
        </h2>
        <hr style={{ borderColor: '#aaa', marginBottom: 18 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14, fontSize: 12 }}>
        {[['Docente', docente4Print?.nombre], ['Materia', materia4Print?.nombre], ['Práctica', sol4Print.nombre_practica], ['Fecha', fmtFecha(sol4Print.fecha_practica)]].map(([lbl, val]) => (
          <div key={lbl}>
            <strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', marginBottom: 2 }}>{lbl}</strong>
            {val || '—'}
          </div>
        ))}
      </div>
      {sol4Print.habilidad && (
        <div style={{ fontSize: 12, marginBottom: 14 }}>
          <strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', marginBottom: 2 }}>Habilidad / Competencia</strong>
          {sol4Print.habilidad}
        </div>
      )}
      <table className="pt" style={{ marginBottom: 20 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Material</th>
            <th style={{ textAlign: 'center' }}>Cant. Solicitada</th>
            <th style={{ textAlign: 'center' }}>Cant. Ajustada</th>
            <th>Unidad</th>
          </tr>
        </thead>
        <tbody>
          {solMats.map((m, i) => (
            <tr key={m.id}>
              <td>{i + 1}</td>
              <td>
                {m.nombre_material}
                {m.nota_ajuste && <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{m.nota_ajuste}</div>}
              </td>
              <td style={{ textAlign: 'center' }}>{m.cantidad ?? '—'}</td>
              <td style={{ textAlign: 'center' }}>
                {m.disponible === false ? 'No disponible' : (m.cantidad_ajustada != null ? m.cantidad_ajustada : '—')}
              </td>
              <td style={{ textTransform: 'capitalize' }}>{m.unidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sol4Print.comentario_ajuste && (
        <div style={{ fontSize: 12, marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Comentario de Insumos Dentales:</strong>
          {sol4Print.comentario_ajuste}
        </div>
      )}
      <div style={{ fontSize: 11, marginBottom: 36 }}>
        Fecha de generación: {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 40 }}>
        <div>
          <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Entrega</strong>
          {['Entregado por', 'Recibido por', 'Fecha'].map(lbl => (
            <div key={lbl} style={{ borderBottom: '1px solid #333', paddingBottom: 4, marginTop: 22, fontSize: 11, color: '#555' }}>{lbl}</div>
          ))}
        </div>
        <div>
          <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Devolución</strong>
          {['Devuelto por', 'Recibido en Insumos', 'Fecha'].map(lbl => (
            <div key={lbl} style={{ borderBottom: '1px solid #333', paddingBottom: 4, marginTop: 22, fontSize: 11, color: '#555' }}>{lbl}</div>
          ))}
        </div>
      </div>
    </div>
  ) : null

  // ── Section renderers ────────────────────────────────────────────────────────

  function renderSolicitudes() {
    if (loadingDetail) return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr eyebrow="Insumos Dentales" title="Solicitudes" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#9a988c', fontFamily: BODY }}>Cargando…</p>
        </div>
      </div>
    )
    if (selectedId && solDetail) return renderDetail()
    return renderList()
  }

  function renderList() {
    const docentesUnicos = [...new Map(
      solicitudes.filter(s => s.docente?.nombre).map(s => [s.docente_id, s.docente])
    ).values()]

    const filtradas = solicitudes.filter(s => {
      if (filtroEstado !== 'todas' && s.estado !== filtroEstado) return false
      if (filtroDocente && s.docente_id !== filtroDocente) return false
      return true
    })

    const grupos = {}
    for (const s of filtradas) {
      if (!grupos[s.estado]) grupos[s.estado] = []
      grupos[s.estado].push(s)
    }
    const estadosPresentes = ORDEN_ESTADOS.filter(e => grupos[e]?.length)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr eyebrow="Insumos Dentales" title="Solicitudes" desc="Todas las solicitudes de materiales para prácticas." />
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ESTADOS_FILTRO.map(est => {
                const on = filtroEstado === est
                return (
                  <button key={est} onClick={() => setFiltroEstado(est)}
                    style={{ padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${on ? ACCENT : '#d4d0be'}`, background: on ? ACCENT : 'transparent', color: on ? '#fff' : '#6b6a60', fontFamily: BODY, fontSize: 12, cursor: 'pointer', fontWeight: on ? 600 : 400, textTransform: 'capitalize' }}>
                    {est === 'todas' ? 'Todas' : (BADGE[est]?.label ?? est)}
                  </button>
                )
              })}
            </div>
            {docentesUnicos.length > 1 && (
              <select value={filtroDocente} onChange={e => setFiltroDocente(e.target.value)}
                style={{ ...inp('180px'), fontSize: 12 }}>
                <option value="">Todos los docentes</option>
                {docentesUnicos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            )}
          </div>

          {filtradas.length === 0 ? (
            <p style={{ color: '#b3b1a4', fontSize: 14 }}>No hay solicitudes con ese filtro.</p>
          ) : filtroEstado !== 'todas' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtradas.map(s => <SolCardItem key={s.id} s={s} onOpen={() => openDetail(s.id)} />)}
            </div>
          ) : (
            estadosPresentes.map(est => {
              const badge = BADGE[est] ?? BADGE.borrador
              return (
                <div key={est} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ ...badge, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{badge.label}</span>
                    <span style={{ fontSize: 12, color: '#9a988c' }}>{grupos[est].length} {grupos[est].length === 1 ? 'solicitud' : 'solicitudes'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grupos[est].map(s => <SolCardItem key={s.id} s={s} onOpen={() => openDetail(s.id)} />)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  function SolCardItem({ s, onOpen }) {
    const badge = BADGE[s.estado] ?? BADGE.borrador
    return (
      <div onClick={onOpen}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #e7e4d6', padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s, box-shadow 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.boxShadow = '0 4px 14px rgba(14,110,98,0.1)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e7e4d6'; e.currentTarget.style.boxShadow = 'none' }}>
        <div>
          <p style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, color: '#1C1B17', margin: '0 0 3px' }}>
            {s.nombre_practica || <em style={{ color: '#9a988c' }}>Sin nombre</em>}
          </p>
          <p style={{ fontSize: 12, color: '#9a988c', margin: 0 }}>
            {s.docente?.nombre} · {s.materia?.nombre || '—'} · {fmtFechaCorta(s.fecha_practica)}
          </p>
        </div>
        <span style={{ ...badge, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 12 }}>{badge.label}</span>
      </div>
    )
  }

  function renderDetail() {
    const sol     = solDetail
    const badge   = BADGE[sol?.estado] ?? BADGE.borrador
    const docente = Array.isArray(sol?.docente) ? sol.docente[0] : sol?.docente
    const materia = Array.isArray(sol?.materia) ? sol.materia[0] : sol?.materia

    const horasDesdeAjuste = sol?.estado === 'ajustada' && sol.fecha_ajuste
      ? (Date.now() - new Date(sol.fecha_ajuste).getTime()) / 3600000
      : 0
    const autoAprobPendiente = sol?.estado === 'ajustada' && horasDesdeAjuste > 24

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #e7e4d6', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={clearDetail} style={ghostBtn}>← Volver</button>
            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 2px', fontFamily: BODY }}>Solicitud</p>
              <h1 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, margin: 0, color: '#1C1B17' }}>{sol?.nombre_practica || 'Sin nombre'}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ ...badge, fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>{badge.label}</span>
            <button onClick={() => setActive('imprimir')} style={{ ...btn({ bg: '#6b6a60', small: true }) }}>🖨 Imprimir</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* Badge auto-aprobación pendiente */}
          {autoAprobPendiente && (
            <div style={{ background: '#fef9c3', border: '1.5px solid #ca8a04', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>⏱</span>
              <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.6 }}>
                <strong>Auto-aprobación pendiente.</strong> Han pasado más de 24 h desde el ajuste.
                Se aprobará automáticamente al cumplir 48 h sin respuesta del docente.
              </p>
            </div>
          )}

          {/* Alerta ajuste guardado */}
          {ajusteAlert && (
            <div style={{ background: '#e8f4f1', border: '1.5px solid #0E6E62', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ACCENT, margin: '0 0 10px' }}>✅ Ajuste guardado</p>
              <p style={{ fontSize: 13, color: '#1C1B17', margin: '0 0 8px', lineHeight: 1.6 }}>
                El docente tiene <strong>48 horas</strong> para responder antes de que se apruebe automáticamente.
              </p>
              <p style={{ fontSize: 13, color: '#1C1B17', margin: '0 0 12px', lineHeight: 1.6 }}>
                📞 Recuerda notificar al docente por teléfono o correo electrónico para asegurar su respuesta a tiempo.
              </p>
              {ajusteAlert.nombre && (
                <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>{ajusteAlert.nombre}</strong>
                  {ajusteAlert.email && <span style={{ color: '#6b6a60' }}>✉ {ajusteAlert.email}</span>}
                </div>
              )}
              <button onClick={() => setAjusteAlert(null)} style={{ ...ghostBtn, marginTop: 12, fontSize: 12 }}>Cerrar</button>
            </div>
          )}

          {/* Datos generales */}
          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '20px 24px', marginBottom: 16 }}>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Datos generales</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: docente?.email_real ? 16 : 0 }}>
              {[
                ['Docente',  docente?.nombre],
                ['Materia',  materia?.nombre],
                ['Práctica', sol?.nombre_practica],
                ['Fecha',    fmtFecha(sol?.fecha_practica)],
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <p style={{ fontSize: 10, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px', fontFamily: BODY }}>{lbl}</p>
                  <p style={{ fontSize: 13, color: '#1C1B17', margin: 0 }}>{val || <em style={{ color: '#b3b1a4' }}>—</em>}</p>
                </div>
              ))}
            </div>
            {docente?.email_real && (
              <div style={{ paddingTop: 14, borderTop: '1px solid #f0eee3', fontSize: 13, color: '#6b6a60' }}>
                ✉ {docente.email_real}
              </div>
            )}
          </section>

          {/* Materiales */}
          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '20px 24px', marginBottom: 16 }}>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Materiales</h2>

            {showAjuste ? (
              <div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: '#faf9f4', borderBottom: '1px solid #eceadd' }}>
                        {['Material', 'Cant. solicitada', 'Cant. ajustada', 'Disponible', 'Nota de ajuste'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#9a988c', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', fontFamily: BODY }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ajusteRows.map((row, i) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid #f0eee3' }}>
                          <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500 }}>{row.nombre_material}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{row.cantidad ?? '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <input type="number" min="0" value={row.cantidad_ajustada}
                              onChange={e => setAjusteRows(prev => prev.map((r, j) => j === i ? { ...r, cantidad_ajustada: e.target.value } : r))}
                              placeholder="Sin cambio"
                              style={{ ...inp('90px'), fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <input type="checkbox" checked={row.disponible}
                              onChange={e => setAjusteRows(prev => prev.map((r, j) => j === i ? { ...r, disponible: e.target.checked } : r))}
                              style={{ accentColor: ACCENT, width: 16, height: 16, cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input value={row.nota_ajuste}
                              onChange={e => setAjusteRows(prev => prev.map((r, j) => j === i ? { ...r, nota_ajuste: e.target.value } : r))}
                              placeholder="Ej. Solo hay 20 unidades"
                              style={{ ...inp(), fontSize: 12 }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginBottom: 16 }}>
                  Comentario al docente
                  <textarea value={comentarioAjuste} onChange={e => setComentarioAjuste(e.target.value)}
                    rows={3} placeholder="Mensaje general para el docente…"
                    style={{ ...inp(), marginTop: 4, resize: 'vertical', lineHeight: 1.5 }} />
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={guardarAjuste} disabled={savingAjuste}
                    style={{ ...btn(), opacity: savingAjuste ? 0.7 : 1 }}>
                    {savingAjuste ? 'Guardando…' : 'Guardar ajustes'}
                  </button>
                  <button onClick={() => setShowAjuste(false)} style={ghostBtn}>Cancelar</button>
                </div>
              </div>
            ) : (
              solMats.length === 0 ? (
                <p style={{ fontSize: 13, color: '#b3b1a4' }}>Sin materiales registrados.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr style={{ background: '#faf9f4', borderBottom: '1px solid #eceadd' }}>
                        {['#', 'Material', 'Cant.', 'Ajustada', 'Disponible', 'Unidad', 'Nota'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#9a988c', textAlign: h === '#' || h === 'Cant.' || h === 'Ajustada' ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', fontFamily: BODY }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {solMats.map((m, i) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f0eee3' }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, color: '#9a988c' }}>{i + 1}</td>
                          <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500 }}>{m.nombre_material}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{m.cantidad ?? '—'}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 13 }}>
                            {m.cantidad_ajustada != null
                              ? <strong style={{ color: '#92400e' }}>{m.cantidad_ajustada}</strong>
                              : <span style={{ color: '#ccc' }}>—</span>}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12 }}>
                            {m.disponible === false
                              ? <span style={{ color: '#e74c3c', fontWeight: 600 }}>No</span>
                              : <span style={{ color: '#166534' }}>Sí</span>}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b6a60', textTransform: 'capitalize' }}>{m.unidad}</td>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: '#9a988c', fontStyle: m.nota_ajuste ? 'italic' : 'normal' }}>
                            {m.nota_ajuste || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </section>

          {/* Comentario al docente */}
          {!showAjuste && sol?.comentario_ajuste && (
            <section style={{ background: '#fef3c7', borderRadius: 12, border: '1px solid #fcd34d', padding: '14px 18px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px', fontFamily: BODY }}>Comentario al docente</p>
              <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.6 }}>{sol.comentario_ajuste}</p>
            </section>
          )}

          {/* Fechas */}
          {(sol?.fecha_enviada || sol?.fecha_ajuste || sol?.fecha_aprobacion_docente) && (
            <section style={{ background: '#fff', borderRadius: 12, border: '1px solid #e7e4d6', padding: '14px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {sol.fecha_enviada && (
                  <div>
                    <p style={{ fontSize: 10, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px', fontFamily: BODY }}>Enviada</p>
                    <p style={{ fontSize: 13, margin: 0 }}>{fmtFechaCorta(sol.fecha_enviada)}</p>
                  </div>
                )}
                {sol.fecha_ajuste && (
                  <div>
                    <p style={{ fontSize: 10, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px', fontFamily: BODY }}>Ajustada</p>
                    <p style={{ fontSize: 13, margin: 0 }}>{fmtFechaCorta(sol.fecha_ajuste)}</p>
                  </div>
                )}
                {sol.fecha_aprobacion_docente && (
                  <div>
                    <p style={{ fontSize: 10, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px', fontFamily: BODY }}>Aprobada</p>
                    <p style={{ fontSize: 13, margin: 0 }}>{fmtFechaCorta(sol.fecha_aprobacion_docente)}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Acciones según estado */}
          {!showAjuste && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {sol?.estado === 'enviada' && (
                <button onClick={() => cambiarEstado('recibida')} disabled={savingEstado}
                  style={{ ...btn(), opacity: savingEstado ? 0.7 : 1 }}>
                  {savingEstado ? 'Guardando…' : 'Marcar como recibida'}
                </button>
              )}
              {sol?.estado === 'recibida' && (
                <>
                  <button onClick={openAjusteModule} style={btn()}>Registrar ajustes</button>
                  <button onClick={() => cambiarEstado('aprobada')} disabled={savingEstado}
                    style={{ ...btn({ bg: '#166534' }), opacity: savingEstado ? 0.7 : 1 }}>
                    {savingEstado ? 'Guardando…' : 'Marcar como aprobada'}
                  </button>
                </>
              )}
              {sol?.estado === 'ajustada' && (
                <button onClick={() => cambiarEstado('aprobada')} disabled={savingEstado}
                  style={{ ...btn({ bg: '#166534' }), opacity: savingEstado ? 0.7 : 1 }}>
                  {savingEstado ? 'Guardando…' : 'Marcar como aprobada'}
                </button>
              )}
              {sol?.estado === 'aprobada' && (
                <button onClick={() => cambiarEstado('entregada')} disabled={savingEstado}
                  style={{ ...btn({ bg: '#5b21b6' }), opacity: savingEstado ? 0.7 : 1 }}>
                  {savingEstado ? 'Guardando…' : 'Registrar entrega'}
                </button>
              )}
              {sol?.estado === 'entregada' && (
                <button onClick={() => cambiarEstado('cerrada')} disabled={savingEstado}
                  style={{ ...btn({ bg: '#475569' }), opacity: savingEstado ? 0.7 : 1 }}>
                  {savingEstado ? 'Guardando…' : 'Registrar devolución / Cerrar'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderImprimir() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr eyebrow="Insumos Dentales" title="Imprimir solicitud" desc="Genera e imprime el comprobante de entrega y devolución." />
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>

          {!solDetail ? (
            <div>
              <p style={{ fontSize: 14, color: '#6b6a60', marginBottom: 16 }}>Selecciona una solicitud para imprimir:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {solicitudes.filter(s => s.estado !== 'borrador').map(s => {
                  const badge = BADGE[s.estado] ?? BADGE.borrador
                  return (
                    <div key={s.id}
                      onClick={async () => { await openDetail(s.id) }}
                      style={{ background: '#fff', borderRadius: 12, border: '1px solid #e7e4d6', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#e7e4d6'}>
                      <div>
                        <p style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 600, color: '#1C1B17', margin: '0 0 2px' }}>{s.nombre_practica}</p>
                        <p style={{ fontSize: 12, color: '#9a988c', margin: 0 }}>{s.docente?.nombre} · {fmtFechaCorta(s.fecha_practica)}</p>
                      </div>
                      <span style={{ ...badge, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 12 }}>{badge.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                <button onClick={clearDetail} style={ghostBtn}>← Cambiar solicitud</button>
                <button onClick={() => window.print()} style={btn()}>🖨 Imprimir</button>
              </div>

              {/* Print preview on screen */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '32px', maxWidth: 700 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <p style={{ fontSize: 13, color: '#6b6a60', margin: '0 0 4px' }}>Universidad de Montemorelos · Escuela de Ciencias Estomatológicas</p>
                  <h2 style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, letterSpacing: '0.04em', margin: '14px 0 16px', color: '#1C1B17', textTransform: 'uppercase' }}>
                    Solicitud de Materiales para Práctica
                  </h2>
                  <hr style={{ borderColor: '#e7e4d6', margin: '0 0 20px' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  {[
                    ['Docente', docente4Print?.nombre],
                    ['Materia', materia4Print?.nombre],
                    ['Práctica', sol4Print?.nombre_practica],
                    ['Fecha', fmtFecha(sol4Print?.fecha_practica)],
                  ].map(([lbl, val]) => (
                    <div key={lbl}>
                      <p style={{ fontSize: 10, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px', fontFamily: BODY }}>{lbl}</p>
                      <p style={{ fontSize: 14, color: '#1C1B17', margin: 0 }}>{val || '—'}</p>
                    </div>
                  ))}
                </div>
                {sol4Print?.habilidad && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 10, color: '#9a988c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px', fontFamily: BODY }}>Habilidad / Competencia</p>
                    <p style={{ fontSize: 14, color: '#1C1B17', margin: 0 }}>{sol4Print.habilidad}</p>
                  </div>
                )}

                <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 24 }}>
                  <thead>
                    <tr style={{ background: '#f0ede6' }}>
                      {['#', 'Material', 'Cant. Solicitada', 'Cant. Ajustada', 'Unidad'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#6b6a60', textAlign: h === '#' || h.includes('Cant') ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: '0.04em', border: '1px solid #e7e4d6', fontFamily: BODY }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {solMats.map((m, i) => (
                      <tr key={m.id}>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, border: '1px solid #eceadd' }}>{i + 1}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #eceadd' }}>
                          {m.nombre_material}
                          {m.nota_ajuste && <div style={{ fontSize: 11, color: '#9a988c', marginTop: 2 }}>Nota: {m.nota_ajuste}</div>}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, fontSize: 13, border: '1px solid #eceadd' }}>{m.cantidad ?? '—'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 13, border: '1px solid #eceadd' }}>
                          {m.disponible === false
                            ? <em style={{ color: '#e74c3c', fontStyle: 'italic' }}>No disponible</em>
                            : (m.cantidad_ajustada != null ? m.cantidad_ajustada : '—')}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 12, textTransform: 'capitalize', border: '1px solid #eceadd' }}>{m.unidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p style={{ fontSize: 12, color: '#9a988c', marginBottom: 40 }}>
                  Fecha de generación: {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 18px', fontFamily: BODY }}>Entrega</p>
                    {['Entregado por', 'Recibido por', 'Fecha'].map(lbl => (
                      <div key={lbl} style={{ borderBottom: '1px solid #999', paddingBottom: 4, marginBottom: 20, fontSize: 12, color: '#6b6a60' }}>{lbl}</div>
                    ))}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 18px', fontFamily: BODY }}>Devolución</p>
                    {['Devuelto por', 'Recibido en Insumos', 'Fecha'].map(lbl => (
                      <div key={lbl} style={{ borderBottom: '1px solid #999', paddingBottom: 4, marginBottom: 20, fontSize: 12, color: '#6b6a60' }}>{lbl}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderCuenta() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <SectionHdr eyebrow="Mi cuenta" title="Seguridad" desc="Cambia tu contraseña de acceso." />
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e4d6', padding: '24px', maxWidth: 480 }}>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 600, margin: '0 0 20px' }}>Cambiar contraseña</h2>
            <form onSubmit={handlePassword}>
              {passMsg && (
                <p style={{ background: passMsg.ok ? '#e8f4f1' : '#fbeaea', color: passMsg.ok ? '#0c5a50' : '#8a2020', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{passMsg.text}</p>
              )}
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginBottom: 12 }}>
                Nueva contraseña
                <input type="password" style={{ ...inp(), marginTop: 4, display: 'block' }} value={passNew} onChange={e => setPassNew(e.target.value)} required />
              </label>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginBottom: 16 }}>
                Confirmar contraseña
                <input type="password" style={{ ...inp(), marginTop: 4, display: 'block' }} value={passConf} onChange={e => setPassConf(e.target.value)} required />
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

  const renderers = { solicitudes: renderSolicitudes, imprimir: renderImprimir, cuenta: renderCuenta }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {printDoc}
      <div className="insumos-no-print" style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: BODY, color: '#1C1B17' }}>
        <Sidebar
          userName={insumos?.nombre ?? 'Insumos'}
          role="Encargado de Insumos"
          items={NAV}
          active={active}
          onSelect={id => {
            setActive(id)
            if (id === 'solicitudes') clearDetail()
          }}
          onSignOut={signOut}
          extraLinks={[]}
          mobile={mobile}
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen(v => !v)}
        />
        <div style={{ flex: 1, marginLeft: mobile ? 0 : SIDEBAR_W, paddingTop: mobile ? TOPBAR_H : 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {renderers[active]?.()}
        </div>
      </div>
    </>
  )
}
