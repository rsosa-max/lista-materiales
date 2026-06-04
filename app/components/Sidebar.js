'use client'

const ACCENT = '#0E6E62'
const BODY   = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const BG      = '#F6F4EC'
const W       = 240

export default function Sidebar({ userName, role, items, active, onSelect, onSignOut, extraLinks = [], mobile, menuOpen, onMenuToggle }) {
  return (
    <>
      {/* Mobile top bar */}
      {mobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: '#fff', borderBottom: '1px solid #e7e4d6',
          height: 52, padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button
            onClick={onMenuToggle}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: 20, height: 2, background: '#1C1B17', borderRadius: 2 }} />
            ))}
          </button>
          <span style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, color: '#1C1B17' }}>{userName}</span>
          <span style={{ width: 32 }} />
        </div>
      )}

      {/* Backdrop */}
      {mobile && menuOpen && (
        <div onClick={onMenuToggle} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 110 }} />
      )}

      {/* Sidebar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: W,
        background: BG, borderRight: '1px solid #e7e4d6',
        display: 'flex', flexDirection: 'column',
        zIndex: mobile ? 120 : 10,
        transform: mobile && !menuOpen ? `translateX(-${W}px)` : 'translateX(0)',
        transition: 'transform 0.25s ease',
      }}>

        {/* User info */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #e7e4d6' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 8px', fontFamily: BODY }}>
            Cirujano Dentista
          </p>
          <p style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, color: '#1C1B17', margin: '0 0 2px', lineHeight: 1.2 }}>{userName}</p>
          <p style={{ fontFamily: BODY, fontSize: 11, color: '#9a988c', margin: 0 }}>{role}</p>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
          {items.map(item => {
            const on = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); if (mobile) onMenuToggle() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: BODY, fontSize: 13,
                  fontWeight: on ? 600 : 400,
                  background: on ? ACCENT : 'transparent',
                  color: on ? '#fff' : '#4a4a42',
                  marginBottom: 2,
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!on) { e.currentTarget.style.background = '#daeee9'; e.currentTarget.style.color = ACCENT } }}
                onMouseLeave={e => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a4a42' } }}
              >
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Extra links + sign out */}
        <div style={{ padding: '10px', borderTop: '1px solid #e7e4d6' }}>
          {extraLinks.map(lnk => (
            <a
              key={lnk.href}
              href={lnk.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                textDecoration: 'none', fontFamily: BODY, fontSize: 12,
                color: '#6b6a60', marginBottom: 2,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#daeee9'; e.currentTarget.style.color = ACCENT }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b6a60' }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>{lnk.icon}</span>
              {lnk.label}
            </a>
          ))}
          <button
            onClick={onSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none',
              cursor: 'pointer', textAlign: 'left', background: 'transparent',
              fontFamily: BODY, fontSize: 12, color: '#9a988c',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fbeaea'; e.currentTarget.style.color = '#c0392b' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9a988c' }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>⏏</span>
            Cerrar sesión
          </button>
        </div>
      </nav>
    </>
  )
}
