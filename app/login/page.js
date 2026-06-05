'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const BODY    = "'Hanken Grotesk', -apple-system, system-ui, sans-serif"
const ACCENT  = '#0E6E62'
const BG      = '#F6F4EC'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]       = useState('login') // 'login' | 'activacion' | 'recuperar'
  const [nomina, setNomina]   = useState('')
  const [correo, setCorreo]   = useState('')
  const [password, setPass]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(null)

  const resetForm = () => { setNomina(''); setCorreo(''); setPass(''); setConfirm(''); setError(null); setSuccess(null) }

  async function getDestino(userId, userEmail) {
    let { data } = await supabase.from('docentes').select('is_coordinador, is_insumos').eq('auth_user_id', userId).single()
    if (!data && userEmail) {
      const { data: d2 } = await supabase.from('docentes').select('is_coordinador, is_insumos').eq('email_real', userEmail).single()
      data = d2
    }
    if (data?.is_insumos) return '/insumos'
    return data?.is_coordinador ? '/coordinador' : '/docente'
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      let candidatos = []

      if (nomina.includes('@')) {
        // El usuario escribió su correo directamente
        candidatos = [nomina.trim()]
      } else {
        // El usuario escribió su nómina → resolver correo via API con service role key
        const resp = await fetch('/api/email-por-nomina', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nomina: nomina.trim() }),
        })
        const { email: emailFromDB } = await resp.json()

        if (!emailFromDB) throw new Error('Nómina no encontrada o cuenta no activada. Usa "Primer acceso" si es la primera vez.')

        // Incluir también el formato interno por compatibilidad con cuentas antiguas
        candidatos = [...new Set([emailFromDB, `${nomina.trim()}@docentes.interna`].filter(Boolean))]
      }

      let loginData = null
      let lastErr   = null
      for (const email of candidatos) {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInErr && data?.user) { loginData = data; break }
        lastErr = signInErr
      }

      if (!loginData) {
        const msg = lastErr?.message ?? ''
        if (msg === 'Invalid login credentials')
          throw new Error('Correo/nómina o contraseña incorrectos')
        if (msg.toLowerCase().includes('email not confirmed'))
          throw new Error('Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.')
        throw new Error(msg || 'No se pudo iniciar sesión')
      }

      router.push(await getDestino(loginData.user.id, loginData.user.email))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleActivacion(e) {
    e.preventDefault()
    setError(null)
    if (!correo.trim())        { setError('Ingresa tu correo electrónico'); return }
    if (password !== confirm)  { setError('Las contraseñas no coinciden'); return }
    if (password.length < 8)   { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setLoading(true)
    try {
      const { data: existe, error: rpcErr } = await supabase.rpc('nomina_existe', { nomina })
      if (rpcErr) throw rpcErr
      if (!existe) throw new Error('Nómina no encontrada en el sistema')

      const correoReal = correo.trim()

      // Crear cuenta; si ya existe, iniciar sesión con las credenciales dadas
      let session
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email: correoReal, password })
      if (signUpErr) {
        const msg = signUpErr.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already')) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email: correoReal, password })
          if (signInErr) throw new Error('Ya existe una cuenta con ese correo. Si la contraseña es incorrecta, usa "Olvidé mi contraseña".')
          session = signInData.session
        } else {
          throw signUpErr
        }
      } else {
        session = signUpData.session
      }

      if (!session?.access_token)
        throw new Error('Cuenta creada. Confirma tu correo electrónico antes de continuar.')

      // Vincular via API con service role key (bypasea RLS)
      const vincResp = await fetch('/api/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ nomina }),
      })
      const vincResult = await vincResp.json()
      if (!vincResp.ok) throw new Error(vincResult.error ?? 'No se pudo vincular la cuenta')

      const { data: doc } = await supabase.from('docentes').select('is_coordinador, is_insumos').eq('numero_nomina', nomina).single()
      if (doc?.is_insumos) router.push('/insumos')
      else router.push(doc?.is_coordinador ? '/coordinador' : '/docente')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRecuperar(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data: email, error: rpcErr } = await supabase.rpc('get_email_real_by_nomina', { nomina })
      if (rpcErr || !email) throw new Error('Nómina no encontrada')

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/docente/nueva-contrasena`,
      })
      if (resetErr) throw resetErr
      setSuccess('Te enviamos un correo con el enlace para restablecer tu contraseña.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    display: 'block', width: '100%', padding: '10px 14px', marginTop: 4,
    borderRadius: 10, border: '1.5px solid #d4d0be', background: '#fff',
    fontFamily: BODY, fontSize: 14, color: '#1C1B17', outline: 'none', boxSizing: 'border-box',
  }
  const submitBtn = {
    display: 'block', width: '100%', marginTop: 20, padding: '11px',
    borderRadius: 10, background: ACCENT, color: '#fff', border: 'none',
    fontFamily: BODY, fontWeight: 600, fontSize: 15,
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
  }
  const link = { color: ACCENT, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }

  const TITLES = { login: 'Iniciar sesión', activacion: 'Primer acceso', recuperar: 'Recuperar contraseña' }

  return (
    <main style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e7e4d6', padding: '36px 32px' }}>

          <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT, marginBottom: 8 }}>
            Cirujano Dentista
          </p>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, color: '#1C1B17', marginBottom: 24, lineHeight: 1.1 }}>
            {TITLES[mode]}
          </h1>

          {error   && <p style={{ background: '#fbeaea', color: '#8a2020', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</p>}
          {success && <p style={{ background: '#e8f4f1', color: '#0c5a50', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{success}</p>}

          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block' }}>
                Nómina o correo electrónico
                <input style={inp} value={nomina} onChange={e => setNomina(e.target.value)} required autoFocus placeholder="Nómina o correo" />
              </label>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginTop: 14 }}>
                Contraseña
                <input style={inp} type="password" value={password} onChange={e => setPass(e.target.value)} required />
              </label>
              <button style={submitBtn} disabled={loading} type="submit">
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          )}

          {mode === 'activacion' && (
            <form onSubmit={handleActivacion}>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block' }}>
                Nómina
                <input style={inp} value={nomina} onChange={e => setNomina(e.target.value)} required autoFocus />
              </label>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginTop: 14 }}>
                Correo electrónico
                <input style={inp} type="email" value={correo} onChange={e => setCorreo(e.target.value)} required placeholder="tu@correo.com" />
              </label>
              <p style={{ fontSize: 11, color: '#9a988c', margin: '6px 0 0', lineHeight: 1.5 }}>
                🔒 Tu correo se usa únicamente para el registro de tu cuenta y comunicación con coordinación. No se comparte ni se utiliza con fines publicitarios.
              </p>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginTop: 14 }}>
                Nueva contraseña
                <input style={inp} type="password" value={password} onChange={e => setPass(e.target.value)} required />
              </label>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block', marginTop: 14 }}>
                Confirmar contraseña
                <input style={inp} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </label>
              <button style={submitBtn} disabled={loading} type="submit">
                {loading ? 'Activando…' : 'Activar cuenta'}
              </button>
            </form>
          )}

          {mode === 'recuperar' && !success && (
            <form onSubmit={handleRecuperar}>
              <label style={{ fontSize: 13, color: '#6b6a60', display: 'block' }}>
                Nómina
                <input style={inp} value={nomina} onChange={e => setNomina(e.target.value)} required autoFocus />
              </label>
              <button style={submitBtn} disabled={loading} type="submit">
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          )}

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {mode !== 'login' && (
              <span style={link} onClick={() => { resetForm(); setMode('login') }}>← Iniciar sesión</span>
            )}
            {mode !== 'activacion' && (
              <span style={link} onClick={() => { resetForm(); setMode('activacion') }}>Primer acceso (activar cuenta)</span>
            )}
            {mode !== 'recuperar' && (
              <span style={link} onClick={() => { resetForm(); setMode('recuperar') }}>Olvidé mi contraseña</span>
            )}
          </div>

        </div>
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/" style={{ fontSize: 13, color: ACCENT, textDecoration: 'none', fontWeight: 500 }}>
            ← Lista de materiales
          </a>
        </p>
      </div>
    </main>
  )
}
