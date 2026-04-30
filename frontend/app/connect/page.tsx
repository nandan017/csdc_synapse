'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import QRCode from 'qrcode'

type State = 'idle' | 'scanning' | 'qr' | 'success' | 'already' | 'error' | 'connecting'

interface ConnectedMember {
  id: string
  first_name: string
  last_name: string
  stream: string
  year: number
  avatar_url: string | null
  github: string
  linkedin: string
  skills: string[]
  bio: string
}

function extractUID(url: string): string | null {
  const match = url.match(/\/u\/([^/?#]+)/)
  return match ? match[1] : null
}

export default function ConnectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state,      setState]     = useState<State>('idle')
  const [memberId,   setMemberId]  = useState<string | null>(null)
  const [myUid,      setMyUid]     = useState<string | null>(null)
  const [result,     setResult]    = useState<ConnectedMember | null>(null)
  const [error,      setError]     = useState('')
  const [nfcSupport, setNfcSupport] = useState(true)
  const [qrDataUrl,  setQrDataUrl] = useState<string | null>(null)
  const qrGenerated = useRef(false)

  // ── Init: check NFC support, get member info ──
  useEffect(() => {
    if (!('NDEFReader' in window)) setNfcSupport(false)
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      sb.from('members').select('id, encrypted_uid').eq('auth_user_id', data.user.id).single()
        .then(({ data: m }) => {
          if (m) {
            setMemberId(m.id)
            setMyUid(m.encrypted_uid)
          } else {
            router.push('/onboard')
          }
        })
    })
  }, [router])

  // ── Auto-connect via ?uid query param (QR scanned by another device) ──
  useEffect(() => {
    const uidParam = searchParams.get('uid')
    if (!uidParam || !memberId) return

    // Prevent double-trigger
    setState('connecting')
    setError('')

    fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ their_encrypted_uid: uidParam }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.detail || 'Connection failed.')
          setState('error')
          return
        }
        setResult(data.member)
        setState(data.already ? 'already' : 'success')
      })
      .catch(() => {
        setError('Network error.')
        setState('error')
      })
  }, [searchParams, memberId])

  // ── NFC scan ──
  const startScan = async () => {
    if (!nfcSupport || !memberId) return
    setState('scanning')
    setError('')
    try {
      const reader = new (window as any).NDEFReader()
      await reader.scan()
      reader.onreading = async (event: any) => {
        let uid: string | null = null
        for (const record of event.message.records) {
          if (record.recordType === 'url') { uid = extractUID(new TextDecoder().decode(record.data)); if (uid) break }
          if (record.recordType === 'text') { uid = new TextDecoder().decode(record.data).trim(); break }
        }
        if (!uid) { setError('Could not read card.'); setState('error'); return }

        const res = await fetch('/api/connect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ their_encrypted_uid: uid }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.detail || 'Error'); setState('error'); return }

        setResult(data.member)
        setState(data.already ? 'already' : 'success')
      }
      reader.onerror = () => { setError('NFC read error.'); setState('error') }
    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? 'NFC permission denied.' : err.message || 'NFC error.')
      setState('error')
    }
  }

  // ── Show QR code ──
  const showMyQR = async () => {
    if (!myUid) return
    setState('qr')
    if (qrGenerated.current && qrDataUrl) return

    const connectUrl = `${window.location.origin}/connect?uid=${myUid}`
    try {
      const dataUrl = await QRCode.toDataURL(connectUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#CFFF00',
          light: '#00000000',
        },
        errorCorrectionLevel: 'M',
      })
      setQrDataUrl(dataUrl)
      qrGenerated.current = true
    } catch {
      setError('Failed to generate QR code.')
      setState('error')
    }
  }

  const reset = () => {
    setState('idle')
    setResult(null)
    setError('')
    // Clear ?uid from URL without reload
    if (searchParams.get('uid')) {
      router.replace('/connect')
    }
  }

  const initials = result ? `${result.first_name[0]}${result.last_name[0]}` : '?'

  return (
    <div style={{
      minHeight: '100vh', background: '#080808', color: '#e0e0e0',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-dm-sans)', padding: '40px 24px',
      cursor: 'none',
    }}>
      <style>{`
        body { background:#080808; cursor:none; }
        @keyframes ping { 0%{transform:scale(1);opacity:.8} 70%{transform:scale(2.4);opacity:0} 100%{transform:scale(2.4);opacity:0} }
        @keyframes popIn { from{transform:scale(.85);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes qrGlow { 0%,100%{box-shadow:0 0 20px rgba(207,255,0,0.08)} 50%{box-shadow:0 0 40px rgba(207,255,0,0.18)} }
        @keyframes scanPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        .ping-ring { position:absolute;inset:0;border-radius:50%;border:2px solid rgba(207,255,0,0.35);animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite; }
      `}</style>

      {/* Navbar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(8,8,8,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #111', zIndex: 10 }}>
        <Link href="/dashboard" style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', textDecoration: 'none', letterSpacing: '.06em' }}>← Dashboard</Link>
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#2a2a2a', letterSpacing: '.15em', textTransform: 'uppercase' }}>Tap · Connect</div>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>

        {/* ── IDLE ── */}
        {state === 'idle' && (
          <div style={{ animation: 'fadeUp .5s ease' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain', marginBottom: 24, filter: 'drop-shadow(0 0 8px rgba(207,255,0,0.4))' }} />
            <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 28, letterSpacing: '-.05em', marginBottom: 8 }}>
              Tap to Connect
            </h1>
            <p style={{ color: '#555', fontSize: 14, lineHeight: 1.75, marginBottom: 36, maxWidth: 300, margin: '0 auto 36px' }}>
              Hold another member&apos;s NFC card to your phone, or use QR codes if NFC isn&apos;t available.
            </p>

            {/* NFC Scan Button */}
            {nfcSupport ? (
              <>
                <button onClick={startScan} disabled={!memberId} style={{
                  width: '100%', padding: '16px',
                  background: 'rgba(207,255,0,0.06)',
                  border: '1px solid rgba(207,255,0,0.2)',
                  borderRadius: 14, cursor: 'none', transition: 'all .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(207,255,0,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(207,255,0,0.2)'}>
                  <span style={{ fontSize: 22 }}>🃏</span>
                  <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: '#CFFF00', fontSize: 16, letterSpacing: '-.02em' }}>
                    Scan their card
                  </span>
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
                  <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#2a2a2a', letterSpacing: '.08em' }}>or</span>
                  <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
                </div>
              </>
            ) : (
              <div style={{ padding: '14px', background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.15)', borderRadius: 10, fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#ff9800', lineHeight: 1.7, marginBottom: 20 }}>
                NFC not supported on this device. Use QR instead ↓
              </div>
            )}

            {/* QR Show Button */}
            <button onClick={showMyQR} disabled={!myUid} style={{
              width: '100%', padding: '16px',
              background: 'rgba(207,255,0,0.03)',
              border: '1px solid rgba(207,255,0,0.12)',
              borderRadius: 14, cursor: 'none', transition: 'all .2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(207,255,0,0.35)'; e.currentTarget.style.background='rgba(207,255,0,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(207,255,0,0.12)'; e.currentTarget.style.background='rgba(207,255,0,0.03)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CFFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="3" height="3" />
                <line x1="21" y1="14" x2="21" y2="14.01" />
                <line x1="21" y1="21" x2="21" y2="21.01" />
                <line x1="14" y1="21" x2="14" y2="21.01" />
                <line x1="18" y1="18" x2="18" y2="18.01" />
                <line x1="21" y1="18" x2="21" y2="18.01" />
                <line x1="18" y1="14" x2="18" y2="14.01" />
                <line x1="18" y1="21" x2="18" y2="21.01" />
              </svg>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: '#CFFF00', fontSize: 15, letterSpacing: '-.02em' }}>
                Show my QR code
              </span>
            </button>

            {!myUid && memberId && (
              <div style={{ marginTop: 14, fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#333', letterSpacing: '.04em' }}>
                Your NFC card hasn&apos;t been issued yet. QR unavailable.
              </div>
            )}
          </div>
        )}

        {/* ── QR DISPLAY ── */}
        {state === 'qr' && (
          <div style={{ animation: 'popIn .4s ease' }}>
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 20, animation: 'scanPulse 2s ease-in-out infinite' }}>
              ● Your Connect QR
            </div>

            {/* QR Card */}
            <div style={{
              display: 'inline-block',
              background: '#0a0a0a',
              border: '1px solid rgba(207,255,0,0.15)',
              borderRadius: 20,
              padding: '28px',
              animation: 'qrGlow 3s ease-in-out infinite',
              position: 'relative',
            }}>
              {/* Corner accents */}
              {[[0,0],[0,1],[1,0],[1,1]].map(([t,r],i) => (
                <div key={i} style={{
                  position:'absolute',
                  width:16, height:16,
                  ...(t===0?{top:10}:{bottom:10}),
                  ...(r===0?{left:10}:{right:10}),
                  borderTop:   t===0 ? '1.5px solid rgba(207,255,0,0.3)' : 'none',
                  borderBottom:t===1 ? '1.5px solid rgba(207,255,0,0.3)' : 'none',
                  borderLeft:  r===0 ? '1.5px solid rgba(207,255,0,0.3)' : 'none',
                  borderRight: r===1 ? '1.5px solid rgba(207,255,0,0.3)' : 'none',
                }} />
              ))}

              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR Code" style={{
                  width: 240, height: 240,
                  imageRendering: 'pixelated',
                }} />
              ) : (
                <div style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: '2px solid #1a1a1a', borderTopColor: '#CFFF00',
                    animation: 'spin .7s linear infinite',
                  }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}
            </div>

            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 18, letterSpacing: '-.03em', marginTop: 24, marginBottom: 6 }}>
              Have them scan this
            </h2>
            <p style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#444', lineHeight: 1.7, marginBottom: 6, maxWidth: 300, margin: '0 auto 20px' }}>
              The other member opens their phone camera and scans this QR code. The connection is created automatically.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={reset} style={{
                padding: '10px 22px', background: 'transparent',
                border: '1px solid #1a1a1a', borderRadius: 9,
                color: '#444', fontFamily: 'var(--font-jetbrains)',
                fontSize: 11, cursor: 'none', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(207,255,0,0.2)'; e.currentTarget.style.color='#CFFF00' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#1a1a1a'; e.currentTarget.style.color='#444' }}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* ── CONNECTING (auto via ?uid) ── */}
        {state === 'connecting' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '2px solid #1a1a1a', borderTopColor: '#CFFF00',
                animation: 'spin .7s linear infinite',
              }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 20, letterSpacing: '-.03em', marginBottom: 8 }}>
              Connecting...
            </h2>
            <p style={{ color: '#555', fontSize: 13 }}>Creating the connection via QR</p>
          </div>
        )}

        {/* ── SCANNING (NFC) ── */}
        {state === 'scanning' && (
          <div style={{ animation: 'fadeUp .4s ease' }}>
            <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="ping-ring" style={{ animationDelay: '0s' }} />
              <div className="ping-ring" style={{ animationDelay: '.5s' }} />
              <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: '2px solid rgba(207,255,0,0.5)', background: 'rgba(207,255,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 8, color: '#CFFF00', letterSpacing: '.1em', textAlign: 'center' }}>HOLD<br/>CARD</div>
              </div>
            </div>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 20, letterSpacing: '-.03em', marginBottom: 8 }}>
              Waiting for card...
            </h2>
            <p style={{ color: '#555', fontSize: 13 }}>Hold their card to the back of your phone</p>
            <button onClick={reset} style={{ marginTop: 24, background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 8, color: '#333', fontFamily: 'var(--font-jetbrains)', fontSize: 11, padding: '8px 18px', cursor: 'none' }}>
              Cancel
            </button>
          </div>
        )}

        {/* ── SUCCESS / ALREADY ── */}
        {(state === 'success' || state === 'already') && result && (
          <div style={{ animation: 'popIn .4s ease' }}>
            {/* Avatar */}
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: 'linear-gradient(135deg,#CFFF00,#a8cc00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#000', fontSize: 26,
              margin: '0 auto 20px', overflow: 'hidden',
              boxShadow: state === 'success' ? '0 0 0 4px rgba(207,255,0,0.15)' : 'none',
              animation: 'float 4s ease-in-out infinite',
            }}>
              {result.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={result.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>

            {state === 'success' && (
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#00e676', letterSpacing: '.08em', marginBottom: 8, textTransform: 'uppercase' }}>
                ✓ Connected!
              </div>
            )}
            {state === 'already' && (
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#ff9800', letterSpacing: '.08em', marginBottom: 8, textTransform: 'uppercase' }}>
                Already connected
              </div>
            )}

            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 24, letterSpacing: '-.04em', marginBottom: 4 }}>
              {result.first_name} {result.last_name}
            </h2>
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#555', marginBottom: 16 }}>
              {result.stream} · {result.year === 1 ? '1st' : result.year === 2 ? '2nd' : '3rd'} Year
            </div>

            {result.bio && (
              <p style={{ color: '#444', fontSize: 13, lineHeight: 1.7, marginBottom: 16, maxWidth: 320, margin: '0 auto 16px' }}>{result.bio}</p>
            )}

            {result.skills && result.skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
                {result.skills.slice(0, 5).map(s => (
                  <span key={s} style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#555', border: '1px solid rgba(207,255,0,0.1)', padding: '3px 10px', borderRadius: 99 }}>{s}</span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
              {result.github && (
                <a href={`https://github.com/${result.github}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#CFFF00', textDecoration: 'none', border: '1px solid rgba(207,255,0,0.2)', padding: '7px 16px', borderRadius: 8, transition: 'all .2s' }}>
                  GitHub ↗
                </a>
              )}
              {result.linkedin && (
                <a href={`https://linkedin.com/in/${result.linkedin}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#CFFF00', textDecoration: 'none', border: '1px solid rgba(207,255,0,0.2)', padding: '7px 16px', borderRadius: 8, transition: 'all .2s' }}>
                  LinkedIn ↗
                </a>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={reset} style={{ padding: '10px 22px', background: '#CFFF00', border: 'none', borderRadius: 9, color: '#000', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 13, cursor: 'none' }}>
                Scan Another
              </button>
              <Link href="/dashboard" style={{ padding: '10px 22px', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 9, color: '#444', fontFamily: 'var(--font-jetbrains)', fontSize: 12, textDecoration: 'none' }}>
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {state === 'error' && (
          <div style={{ animation: 'popIn .35s ease' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✕</div>
            <p style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#ff4040', marginBottom: 20 }}>{error}</p>
            <button onClick={reset} style={{ padding: '10px 22px', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 9, color: '#555', fontFamily: 'var(--font-jetbrains)', fontSize: 11, cursor: 'none' }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
