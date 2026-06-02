'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const ORDEN_SEM = ['1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo']
const DISPLAY   = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY      = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"

const PRINT_CSS = `
  .print-only { display: none; }
  @media print {
    .no-print      { display: none !important; }
    .print-only    { display: block !important; }
    body, main     { background: white !important; color: black !important; }
    .mat-table     { border-collapse: collapse; width: 100%; font-size: 11px; }
    .mat-table th  { border: 1px solid #999; padding: 5px 8px; background: white !important;
                     color: black !important; text-align: left; font-weight: 600; }
    .mat-table td  { border: 1px solid #bbb; padding: 4px 8px;
                     background: white !important; color: black !important; }
    .print-section { page-break-inside: avoid; break-inside: avoid; }
    .print-card    { border: 1px solid #ccc !important; background: white !important;
                     border-radius: 6px !important; }
  }
`

function MultiSelect({ label, options, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const displayLabel =
    selected.size === 0   ? label
    : selected.size === 1 ? (options.find(o => selected.has(o.value))?.label ?? label)
    :                       `${selected.size} seleccionadas`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
          selected.size
            ? 'bg-[#0E6E62] text-white border-[#0E6E62]'
            : 'bg-white text-[#3a3a34] border-[#dcdacb] hover:border-[#0E6E62] hover:text-[#0E6E62]'
        }`}
        style={{ minWidth: 180, justifyContent: 'space-between', fontFamily: BODY }}
      >
        <span className="truncate text-left">{displayLabel}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1.5 rounded-xl border bg-white shadow-xl z-30 overflow-y-auto py-1"
          style={{ minWidth: 240, maxHeight: 300, borderColor: '#e7e4d6' }}
        >
          {selected.size > 0 && (
            <button
              onClick={() => { onClear(); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-xs border-b"
              style={{ color: '#0E6E62', borderColor: '#f0eee3' }}
            >
              ✕ Limpiar selección
            </button>
          )}
          {options.map(opt => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#f6f4ec] text-[13px]"
              style={{ color: '#1C1B17' }}
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => onToggle(opt.value)}
                className="accent-[#0E6E62] w-4 h-4 cursor-pointer flex-shrink-0"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [reqs, setReqs]         = useState([])
  const [materias, setMaterias] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [selMaterias, setSelMaterias] = useState(new Set())
  const [selSems, setSelSems]         = useState(new Set())
  const [q, setQ]                     = useState('')

  useEffect(() => {
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap'
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('requerimientos')
        .select(`id, materia_id, semestre, cantidad, especificacion, nota,
                 materia:materias(nombre),
                 material:materiales(nombre, marca_sugerida, es_comun)`)
      if (error) { setError(error.message); setLoading(false); return }
      const norm = data.map(r => ({
        ...r,
        material: Array.isArray(r.material) ? r.material[0] : r.material,
        materia:  Array.isArray(r.materia)  ? r.materia[0]  : r.materia,
      }))
      setReqs(norm)
      const { data: ms } = await supabase.from('materias').select('id,nombre').order('nombre')
      setMaterias(ms || [])
      setLoading(false)
    }
    load()
  }, [])

  const semestres = useMemo(() => {
    const s = new Set(reqs.map(r => r.semestre).filter(Boolean))
    return ORDEN_SEM.filter(x => s.has(x))
  }, [reqs])

  const coincide = r => {
    if (!q) return true
    const t = `${r.material?.nombre||''} ${r.especificacion||''} ${r.nota||''} ${r.material?.marca_sugerida||''}`.toLowerCase()
    return t.includes(q.toLowerCase())
  }

  const comunes   = useMemo(() => reqs.filter(r => r.materia_id === null && coincide(r)), [reqs, q])
  const filtrados = useMemo(() => reqs.filter(r => {
    if (r.materia_id === null)                               return false
    if (selMaterias.size && !selMaterias.has(r.materia_id)) return false
    if (selSems.size     && !selSems.has(r.semestre))       return false
    return coincide(r)
  }), [reqs, selMaterias, selSems, q])

  const grupos = useMemo(() => {
    const m = new Map()
    for (const r of filtrados) {
      const key = r.materia?.nombre || '—'
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(r)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [filtrados])

  const gruposConOffset = useMemo(() => {
    let off = 1
    return grupos.map(([nombre, items]) => {
      const start = off
      off += items.length
      return { nombre, items, start }
    })
  }, [grupos])

  const toggleSet = (set, setter, val) => { const n = new Set(set); n.has(val) ? n.delete(val) : n.add(val); setter(n) }
  const limpiar   = () => { setSelMaterias(new Set()); setSelSems(new Set()); setQ('') }
  const hayFiltros = selMaterias.size || selSems.size || q

  const filtroTexto = useMemo(() => {
    const partes = []
    if (selMaterias.size) partes.push(materias.filter(m => selMaterias.has(m.id)).map(m => m.nombre).join(', '))
    if (selSems.size)     partes.push([...selSems].join(', '))
    return partes.length ? partes.join(' · ') : 'Lista completa'
  }, [selMaterias, selSems, materias])

  const matOptions = materias.map(m => ({ value: m.id, label: m.nombre }))
  const semOptions = semestres.map(s => ({ value: s, label: s }))

  const TH = ({ children, center }) => (
    <th style={{
      padding: '10px 14px',
      fontSize: 11,
      fontWeight: 600,
      color: '#9a988c',
      textAlign: center ? 'center' : 'left',
      background: '#faf9f4',
      borderBottom: '1px solid #eceadd',
      fontFamily: BODY,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {children}
    </th>
  )

  const renderRow = (r, num, isGeneral) => {
    const meta = [r.especificacion, r.material?.marca_sugerida].filter(Boolean).join(' · ')
    return (
      <tr key={r.id} style={{ borderBottom: `1px solid ${isGeneral ? '#f5f0e8' : '#f0eee3'}` }}>
        <td style={{ padding: '7px 14px', fontSize: 11, color: '#0E6E62', fontWeight: 600,
                     textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
          {num}
        </td>
        <td style={{ padding: '7px 14px', verticalAlign: 'top' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1B17', lineHeight: 1.3 }}>
            {r.material?.nombre}
          </span>
          {r.nota && (
            <div style={{ fontSize: 11, color: '#a8a699', fontStyle: 'italic', marginTop: 2 }}>
              {r.nota}
            </div>
          )}
        </td>
        <td style={{ padding: '7px 14px', fontSize: 13, color: '#6b6a60', verticalAlign: 'top' }}>
          {meta || ''}
        </td>
        <td style={{ padding: '7px 14px', textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
          {r.cantidad != null && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#3a3a34' }}>{r.cantidad}×</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <main className="min-h-screen" style={{ background: '#F6F4EC', color: '#1C1B17', fontFamily: BODY }}>
      <style>{PRINT_CSS}</style>

      <button
        onClick={() => window.print()}
        className="no-print fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-full text-white text-sm font-semibold shadow-lg hover:scale-105 transition-transform z-50"
        style={{ background: '#0E6E62', fontFamily: BODY }}
      >
        🖨 Imprimir lista
      </button>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

        <div className="print-only" style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
            Lista de materiales — Cirujano Dentista
          </h2>
          <p style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>{filtroTexto}</p>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
            Impresa el {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <hr style={{ borderColor: '#ccc', marginBottom: 20 }} />
        </div>

        <header className="no-print mb-9">
          <p className="text-xs tracking-[0.22em] uppercase mb-3" style={{ color: '#0E6E62' }}>Cirujano Dentista</p>
          <h1 className="text-4xl sm:text-5xl leading-[1.05] mb-3" style={{ fontFamily: DISPLAY, fontWeight: 600 }}>
            Lista de materiales
          </h1>
          <p className="text-[15px] max-w-xl" style={{ color: '#6b6a60' }}>
            Filtra por materia o semestre para ver lo que necesitas. El material de uso general aplica para todas.
          </p>
        </header>

        {loading && <p style={{ color: '#6b6a60' }}>Cargando lista…</p>}
        {error   && <p className="rounded-lg p-4" style={{ background: '#fbeaea', color: '#8a2020' }}>Error al cargar: {error}</p>}

        {!loading && !error && (
          <>
            <section className="no-print rounded-2xl border p-5 sm:p-6 mb-8" style={{ background: '#fff', borderColor: '#e7e4d6' }}>
              <div className="flex flex-wrap items-start gap-3">
                <MultiSelect
                  label="Todas las materias"
                  options={matOptions}
                  selected={selMaterias}
                  onToggle={v => toggleSet(selMaterias, setSelMaterias, v)}
                  onClear={() => setSelMaterias(new Set())}
                />
                <MultiSelect
                  label="Todos los semestres"
                  options={semOptions}
                  selected={selSems}
                  onToggle={v => toggleSet(selSems, setSelSems, v)}
                  onClear={() => setSelSems(new Set())}
                />
                <input
                  value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Buscar un material…"
                  className="flex-1 min-w-[180px] rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-[#0E6E62]"
                  style={{ borderColor: '#dcdacb', background: '#fbfaf5' }}
                />
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: '#f0eee3' }}>
                <span className="text-sm" style={{ color: '#6b6a60' }}>
                  <strong style={{ color: '#1C1B17' }}>{filtrados.length}</strong>
                  {' '}{filtrados.length === 1 ? 'material' : 'materiales'}
                  {hayFiltros ? ' con tus filtros' : ' en total'}
                </span>
                {hayFiltros && (
                  <button onClick={limpiar} className="text-sm underline underline-offset-2" style={{ color: '#0E6E62' }}>
                    Limpiar todo
                  </button>
                )}
              </div>
            </section>

            {grupos.length === 0 && comunes.length === 0 && (
              <div className="text-center py-16">
                <p className="text-2xl mb-2" style={{ fontFamily: DISPLAY, color: '#9a988c' }}>Sin resultados</p>
                <p className="text-sm" style={{ color: '#b3b1a4' }}>
                  Prueba con otros filtros o{' '}
                  <button onClick={limpiar} className="underline" style={{ color: '#0E6E62' }}>limpia la selección</button>.
                </p>
              </div>
            )}

            {(grupos.length > 0 || comunes.length > 0) && (
              <div className="print-card rounded-2xl border overflow-hidden" style={{ background: '#fff', borderColor: '#e7e4d6' }}>
                <table className="mat-table w-full" style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <TH center>#</TH>
                      <TH>Material</TH>
                      <TH>Especificación / Marca</TH>
                      <TH center>Cant.</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {gruposConOffset.flatMap(({ nombre, items, start }) => [
                      <tr key={`h-${nombre}`}>
                        <td colSpan={4} style={{
                          padding: '9px 14px',
                          fontFamily: DISPLAY,
                          fontWeight: 600,
                          fontSize: 15,
                          color: '#0E6E62',
                          background: '#e8f4f1',
                          borderTop: '1px solid #d0ebe5',
                          borderBottom: '1px solid #d0ebe5',
                        }}>
                          {nombre}
                        </td>
                      </tr>,
                      ...items.map((r, i) => renderRow(r, start + i, false)),
                    ])}
                    {comunes.length > 0 && [
                      <tr key="h-general">
                        <td colSpan={4} style={{
                          padding: '9px 14px',
                          fontFamily: DISPLAY,
                          fontWeight: 600,
                          fontSize: 15,
                          color: '#8a5a17',
                          background: '#FBF3E2',
                          borderTop: gruposConOffset.length > 0 ? '2px solid #e7e4d6' : undefined,
                          borderBottom: '1px solid #ecdcbc',
                        }}>
                          Material de uso general
                        </td>
                      </tr>,
                      ...comunes.map((r, i) => renderRow(r, filtrados.length + i + 1, true)),
                    ]}
                  </tbody>
                </table>
              </div>
            )}

            {(grupos.length > 0 || comunes.length > 0) && (
              <section className="print-section print-card rounded-2xl border p-5 sm:p-6 mt-6" style={{ background: '#fff', borderColor: '#e7e4d6' }}>
                <h2 className="text-base mb-1" style={{ fontFamily: DISPLAY, fontWeight: 600, color: '#1C1B17' }}>Resumen</h2>
                <p className="text-sm mb-4" style={{ color: '#6b6a60' }}>
                  <strong style={{ color: '#1C1B17' }}>{filtrados.length + comunes.length}</strong>{' '}
                  {filtrados.length + comunes.length === 1 ? 'material' : 'materiales'}
                  {hayFiltros ? ' con los filtros actuales' : ' en total'}
                </p>
                <div className="divide-y text-sm" style={{ borderColor: '#f0eee3' }}>
                  {gruposConOffset.map(({ nombre, items, start }) => (
                    <div key={nombre} className="flex justify-between py-2" style={{ color: '#3a3a34' }}>
                      <span>{nombre}</span>
                      <span>
                        <span style={{ color: '#0E6E62', fontWeight: 500 }}>
                          {items.length === 1 ? `${start}` : `${start}–${start + items.length - 1}`}
                        </span>
                        <span style={{ color: '#9a988c', marginLeft: 8 }}>({items.length})</span>
                      </span>
                    </div>
                  ))}
                  {comunes.length > 0 && (
                    <div className="flex justify-between py-2" style={{ color: '#3a3a34' }}>
                      <span>Uso general</span>
                      <span>
                        <span style={{ color: '#0E6E62', fontWeight: 500 }}>
                          {comunes.length === 1
                            ? `${filtrados.length + 1}`
                            : `${filtrados.length + 1}–${filtrados.length + comunes.length}`}
                        </span>
                        <span style={{ color: '#9a988c', marginLeft: 8 }}>({comunes.length})</span>
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            <footer className="no-print text-center text-xs mt-12" style={{ color: '#b3b1a4' }}>
              Lista de materiales · Cirujano Dentista
            </footer>
          </>
        )}
      </div>
    </main>
  )
}
