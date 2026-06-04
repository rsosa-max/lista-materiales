'use client'

const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY    = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const P       = '#6D28D9'
const P_SOFT  = '#EDE9F6'
const P_MID   = '#C4B5FD'
const BG      = '#F2EEF8'
const TEXT    = '#1E1028'
const MUTED   = '#6B5B8A'

const cards = [
  {
    href: '/lista',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          stroke={P} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Ver lista de materiales',
    desc: 'Consulta todos los materiales requeridos por materia y semestre para el programa de Cirujano Dentista.',
    cta: 'Ver lista →',
  },
  {
    href: '/login',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          stroke={P} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Acceso docentes',
    desc: 'Administra los materiales de tus materias asignadas. Solo para personal académico autorizado.',
    cta: 'Iniciar sesión →',
  },
]

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', background: BG, fontFamily: BODY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

      {/* Wordmark */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: P, marginBottom: 14 }}>
          Ciencias Estomatológicas
        </p>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 700, color: TEXT, lineHeight: 1.05, margin: '0 0 14px' }}>
          Cirujano Dentista
        </h1>
        <p style={{ fontSize: 16, color: MUTED, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
          Portal de materiales.
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, width: '100%', maxWidth: 680 }}>
        {cards.map(({ href, icon, title, desc, cta }) => (
          <a key={href} href={href} style={{ textDecoration: 'none' }}>
            <div
              style={{ background: '#fff', border: `2px solid ${P_MID}`, borderRadius: 20, padding: '32px 28px', cursor: 'pointer', transition: 'border-color 0.18s, box-shadow 0.18s', boxShadow: `0 2px 12px ${P}18`, height: '100%', boxSizing: 'border-box' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.boxShadow = `0 8px 28px ${P}28` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = P_MID; e.currentTarget.style.boxShadow = `0 2px 12px ${P}18` }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, background: P_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                {icon}
              </div>
              <h2 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, color: TEXT, margin: '0 0 10px', lineHeight: 1.2 }}>
                {title}
              </h2>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>
                {desc}
              </p>
              <span style={{ fontSize: 14, fontWeight: 600, color: P }}>
                {cta}
              </span>
            </div>
          </a>
        ))}
      </div>

      <p style={{ marginTop: 48, fontSize: 12, color: '#A89EC0', letterSpacing: '0.04em' }}>
        Universidad de Montemorelos
      </p>
    </main>
  )
}
