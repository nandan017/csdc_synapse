'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type State = 'idle' | 'scanning' | 'success' | 'already' | 'error'

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
  const [state,      setState]     = useState<State>('idle')
  const [memberId,   setMemberId]  = useState<string | null>(null)
  const [result,     setResult]    = useState<ConnectedMember | null>(null)
  const [error,      setError]     = useState('')
  const [nfcSupport, setNfcSupport] = useState(true)

  useEffect(() => {
    if (!('NDEFReader' in window)) setNfcSupport(false)
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      sb.from('members').select('id').eq('auth_user_id', data.user.id).single()
        .then(({ data: m }) => { if (m) setMemberId(m.id); else router.push('/onboard') })
    })
  }, [router])

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

  const reset = () => { setState('idle'); setResult(null); setError('') }

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
        .ping-ring { position:absolute;inset:0;border-radius:50%;border:2px solid rgba(207,255,0,0.35);animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite; }
      `}</style>

      {/* Navbar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(8,8,8,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #111', zIndex: 10 }}>
        <Link href="/dashboard" style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', textDecoration: 'none', letterSpacing: '.06em' }}>← Dashboard</Link>
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#2a2a2a', letterSpacing: '.15em', textTransform: 'uppercase' }}>Tap · Connect</div>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>

        {/* IDLE */}
        {state === 'idle' && (
          <div style={{ animation: 'fadeUp .5s ease' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain', marginBottom: 24, filter: 'drop-shadow(0 0 8px rgba(207,255,0,0.4))' }} />
            <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 28, letterSpacing: '-.05em', marginBottom: 8 }}>
              Tap to Connect
            </h1>
            <p style={{ color: '#555', fontSize: 14, lineHeight: 1.75, marginBottom: 36, maxWidth: 300, margin: '0 auto 36px' }}>
              Hold another member's NFC card to your phone. You'll both be connected instantly.
            </p>

            {nfcSupport ? (
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
            ) : (
              <div style={{ padding: '16px', background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)', borderRadius: 12, fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#ff9800', lineHeight: 1.7 }}>
                NFC not supported here. Use Chrome on Android.
              </div>
            )}
          </div>
        )}

        {/* SCANNING */}
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

        {/* SUCCESS */}
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

        {/* ERROR */}
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
