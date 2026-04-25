'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Step = 'login' | 'otp' | 'nfc' | 'loading'

function extractUID(url: string): string | null {
  const match = url.match(/\/u\/([^/?#]+)/)
  return match ? match[1] : null
}

export default function LoginPage() {
  const router = useRouter()
  const [step,       setStep]      = useState<Step>('login')
  const [email,      setEmail]     = useState('')
  const [password,   setPassword]  = useState('')
  const [otp,        setOtp]       = useState('')
  const [showPwd,    setShowPwd]   = useState(false)
  const [error,      setError]     = useState('')
  const [loading,    setLoading]   = useState(false)
  const [otpTimer,   setOtpTimer]  = useState(0)
  const [nfcReady,   setNfcReady]  = useState(false)
  const [nfcScanning,setNfcScanning] = useState(false)
  const otpRef = useRef<HTMLInputElement>(null)

  // Check NFC support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) setNfcReady(true)
  }, [])

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return
    const iv = setInterval(() => setOtpTimer(t => t - 1), 1000)
    return () => clearInterval(iv)
  }, [otpTimer])

  // Focus OTP input when step changes
  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRef.current?.focus(), 100)
  }, [step])

  /* ── Step 1: email + password ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const sb = createClient()
    const { error: err } = await sb.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : err.message)
      setLoading(false)
      return
    }

    // Send OTP via backend
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      setError('Failed to send OTP. Try again.')
      setLoading(false)
      return
    }

    setOtpTimer(60)
    setStep('otp')
    setLoading(false)
  }

  /* ── Step 2: verify OTP ── */
  const handleOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    })
    const data = await res.json()

    if (!data.valid) {
      setError('Incorrect or expired OTP.')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  /* ── Resend OTP ── */
  const resendOTP = async () => {
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setOtpTimer(60)
    setOtp('')
    setError('')
  }

  /* ── NFC quick login ── */
  const startNFCLogin = async () => {
    setNfcScanning(true)
    setError('')
    try {
      const reader = new (window as any).NDEFReader()
      await reader.scan()
      reader.onreading = async (event: any) => {
        let uid: string | null = null
        for (const record of event.message.records) {
          if (record.recordType === 'url') {
            uid = extractUID(new TextDecoder().decode(record.data))
            if (uid) break
          }
          if (record.recordType === 'text') {
            uid = new TextDecoder().decode(record.data).trim()
            break
          }
        }
        if (!uid) { setError('Could not read card.'); setNfcScanning(false); return }

        // Backend NFC login
        const res = await fetch('/api/auth/nfc-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encrypted_uid: uid }),
        })
        const data = await res.json()
        if (!data.access_token) {
          setError(data.detail || 'Card not recognised.')
          setNfcScanning(false)
          return
        }

        // Set Supabase session
        const sb = createClient()
        await sb.auth.setSession({
          access_token:  data.access_token,
          refresh_token: data.refresh_token,
        })
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? 'NFC permission denied.' : 'NFC error.')
      setNfcScanning(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-dm-sans)', padding: '40px 24px',
      cursor: 'none',
    }}>
      <style>{`
        body { background:#080808; cursor:none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping {
          0%{transform:scale(1);opacity:.8} 70%{transform:scale(2.2);opacity:0} 100%{transform:scale(2.2);opacity:0}
        }
        @keyframes spin { to{transform:rotate(360deg)} }
        .ping-ring {
          position:absolute;inset:0;border-radius:50%;
          border:2px solid rgba(207,255,0,0.35);
          animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite;
        }
        .input-field {
          width:100%;background:#0d0d0d;border:1px solid #1e1e1e;
          border-radius:9px;color:#fff;font-family:var(--font-dm-sans);
          font-size:14px;padding:12px 16px;outline:none;
          box-sizing:border-box;transition:border-color .2s;
        }
        .input-field:focus { border-color:rgba(207,255,0,0.4); }
        .primary-btn {
          width:100%;padding:13px;background:#CFFF00;color:#000;
          border:none;border-radius:10px;font-family:var(--font-syne);
          font-weight:800;font-size:14px;cursor:none;
          transition:opacity .2s;letter-spacing:-.01em;
        }
        .primary-btn:hover { opacity:.88; }
        .primary-btn:disabled { background:#1e1e1e;color:#333;cursor:not-allowed; }
      `}</style>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36, animation: 'fadeUp .5s ease' }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Chathurya" style={{ width: 40, height: 40, objectFit: 'contain', marginBottom: 10, filter: 'drop-shadow(0 0 10px rgba(207,255,0,0.5))', cursor: 'none' }} />
        </Link>
        <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 18, letterSpacing: '-.03em' }}>
          Member Login
        </div>
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#333', letterSpacing: '.1em', marginTop: 4, textTransform: 'uppercase' }}>
          Chathurya SDC
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp .5s .1s ease both' }}>

        {/* ── STEP 1: Login ── */}
        {step === 'login' && (
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 18, padding: 32 }}>

            {/* NFC quick login — only on Android Chrome */}
            {nfcReady && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>
                  Quick login
                </div>
                <button onClick={startNFCLogin} disabled={nfcScanning}
                  style={{
                    width: '100%', padding: '14px',
                    background: 'rgba(207,255,0,0.05)',
                    border: `1px solid ${nfcScanning ? 'rgba(207,255,0,0.35)' : 'rgba(207,255,0,0.15)'}`,
                    borderRadius: 12, cursor: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    transition: 'all .2s',
                  }}>
                  {nfcScanning ? (
                    <>
                      <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
                        <div className="ping-ring" />
                        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1.5px solid #CFFF00' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#CFFF00', letterSpacing: '.04em' }}>
                        Hold card to phone...
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 18 }}>🃏</span>
                      <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#555', letterSpacing: '.04em' }}>
                        Tap NFC card to login instantly
                      </span>
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#111' }} />
                  <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#333', letterSpacing: '.06em' }}>or</span>
                  <div style={{ flex: 1, height: 1, background: '#111' }} />
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
                  Email
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="your@college.edu" className="input-field" autoFocus />
              </div>

              <div>
                <label style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••" className="input-field"
                    style={{ paddingRight: 52 }} />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'none', fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444' }}>
                    {showPwd ? 'hide' : 'show'}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ padding: '9px 14px', background: 'rgba(255,64,64,0.06)', border: '1px solid rgba(255,64,64,0.2)', borderRadius: 8, fontFamily: 'var(--font-jetbrains)', fontSize: 12, color: '#ff6b6b' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="primary-btn" style={{ marginTop: 4 }}>
                {loading ? 'Sending OTP...' : 'Continue →'}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 'otp' && (
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 18, padding: 32, animation: 'fadeUp .4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 18, letterSpacing: '-.03em', marginBottom: 6 }}>
                Check your email
              </h2>
              <p style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#444', lineHeight: 1.7 }}>
                We sent a 6-digit code to<br />
                <span style={{ color: '#CFFF00' }}>{email}</span>
              </p>
            </div>

            <form onSubmit={handleOTP} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
                  6-digit code
                </label>
                <input ref={otpRef} type="text" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6} className="input-field"
                  style={{ textAlign: 'center', fontSize: 24, letterSpacing: '.3em', fontFamily: 'var(--font-syne)', fontWeight: 800 }} />
              </div>

              {error && (
                <div style={{ padding: '9px 14px', background: 'rgba(255,64,64,0.06)', border: '1px solid rgba(255,64,64,0.2)', borderRadius: 8, fontFamily: 'var(--font-jetbrains)', fontSize: 12, color: '#ff6b6b' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || otp.length < 6} className="primary-btn">
                {loading ? 'Verifying...' : 'Verify →'}
              </button>

              <div style={{ textAlign: 'center' }}>
                {otpTimer > 0 ? (
                  <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#2a2a2a' }}>
                    Resend in {otpTimer}s
                  </span>
                ) : (
                  <button type="button" onClick={resendOTP}
                    style={{ background: 'none', border: 'none', cursor: 'none', fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#555', textDecoration: 'underline' }}>
                    Resend code
                  </button>
                )}
              </div>

              <button type="button" onClick={() => { setStep('login'); setError(''); setOtp('') }}
                style={{ background: 'none', border: 'none', cursor: 'none', fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#333', textAlign: 'center' }}>
                ← Back
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#2a2a2a', letterSpacing: '.06em' }}>
          Not a member?{' '}
          <Link href="/register" style={{ color: '#CFFF00', textDecoration: 'none' }}>Apply here →</Link>
        </div>
      </div>
    </div>
  )
}
