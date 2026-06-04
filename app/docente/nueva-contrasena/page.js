'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY    = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const ACCENT  = '#0E6E62'
const BG      = '#F6F4EC'

export default function NuevaContrasena() {
  const router = useRouter()
  const [ready, setReady]       = useState(false)
  const [password, setPass]     = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const recoveredRef            = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveredRef.current = true
        setReady(true)
      }
    })
    // Si el evento PASSWORD_RECOVERY no llega en 4s, redirigir a /login
    const t = setTimeout(() => {
      if (!recoveredRef.current) router.replace('/login')
    }, 4000)
    return () => { subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 8)  { setError('Mínimo 8 caracteres'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/docente')
  }

  const inp = {
    display: 'block', width: '100%', padding: '10px 14px', marginTop: 4,
    borderRadius: 10, border: '1.5px solid #d4d0be', background: '#fff',
    fontFamily: BODY, fontSize: 14, color: '#1C1B17', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e7e4d6', padding: '36px 32px' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT, marginBottom: 8 }}>
            Cirujano Dentista
          </p>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, color: '#1C1B17', marginBottom: 24, lineHeight: 1.1 }}>
            Nueva contraseña
          </h1>

          {!ready && (
            <p style={{ color: '#6b6a60', fontSize: 14 }}>Verificando enlace de recuperación…</p>
          )}

          {ready && (
            <form onSubmit={handleSubmit}>
              {error && (
                <p style={{ background: '#fbeaea', color: '#8a2020', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </p>
              )}
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block' }}>
                Nueva contraseña
                <input style={inp} type="password" value={password} onChange={e => setPass(e.target.value)} required autoFocus />
              </label>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginTop: 14 }}>
                Confirmar contraseña
                <input style={inp} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </label>
              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'block', width: '100%', marginTop: 20, padding: '11px',
                  borderRadius: 10, background: ACCENT, color: '#fff', border: 'none',
                  fontFamily: BODY, fontWeight: 600, fontSize: 15,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
