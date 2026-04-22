'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Step = 'tap' | 'form' | 'submitting' | 'done' | 'duplicate' | 'error'

function extractUID(url: string): string | null {
  const match = url.match(/\/u\/([^/?#]+)/)
  return match ? match[1] : null
}

export default function FeedbackPage() {
  const { workshop_id } = useParams<{ workshop_id: string }>()
  const [step,      setStep]      = useState<Step>('tap')
  const [uid,       setUid]       = useState<string | null>(null)
  const [rating,    setRating]    = useState(0)
  const [highlight, setHighlight] = useState('')
  const [improve,   setImprove]   = useState('')
  const [wouldReturn, setWouldReturn] = useState(true)
  const [errorMsg,  setErrorMsg]  = useState('')
  const [wsTitle,   setWsTitle]   = useState('')

  useEffect(() => {
    fetch(`/api/backend/admin/workshops`)
      .then(r => r.json())
      .then(d => {
        const ws = (d.data || []).find((w: any) => w.id === workshop_id)
        if (ws) setWsTitle(ws.title)
      })
  }, [workshop_id])

  const startNFC = async () => {
    if (!('NDEFReader' in window)) {
      setErrorMsg('NFC not supported. Use Chrome on Android.')
      setStep('error')
      return
    }
    try {
      const reader = new (window as any).NDEFReader()
      await reader.scan()
      reader.onreading = (event: any) => {
        let found: string | null = null
        for (const record of event.message.records) {
          if (record.recordType === 'url') {
            found = extractUID(new TextDecoder().decode(record.data))
            if (found) break
          }
          if (record.recordType === 'text') {
            found = new TextDecoder().decode(record.data).trim()
            break
          }
        }
        if (!found) { setErrorMsg('Could not read card.'); setStep('error'); return }
        setUid(found)
        setStep('form')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'NFC error.')
      setStep('error')
    }
  }

  const submitFeedback = async () => {
    if (!rating) return
    setStep('submitting')
    const res = await fetch('/api/backend/feedback/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encrypted_uid: uid, workshop_id, rating, highlight, improve, would_return: wouldReturn }),
    })
    const data = await res.json()
    if (data.duplicate) setStep('duplicate')
    else if (data.success) setStep('done')
    else { setErrorMsg(data.detail || data.message || 'Error.'); setStep('error') }
  }

  const STARS = [1, 2, 3, 4, 5]

  return (
    <div style={{
      minHeight: '100vh', background: '#080808', color: '#e0e0e0',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px',
      fontFamily: 'var(--font-dm-sans)',
    }}>
      <style>{`
        body{background:#080808;cursor:none}
        @keyframes ping{0%{transform:scale(1);opacity:.8}70%{transform:scale(2.2);opacity:0}100%{transform:scale(2.2);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes popIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
        .ping-ring{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(207,255,0,0.3);animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite}
        .star-btn{background:none;border:none;cursor:none;font-size:28px;transition:transform .15s}
        .star-btn:hover{transform:scale(1.2)}
      `}</style>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', marginBottom: 8, filter: 'drop-shadow(0 0 8px rgba(207,255,0,0.4))' }} />
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#2a2a2a', letterSpacing: '.15em', textTransform: 'uppercase' }}>
          Workshop Feedback
        </div>
        {wsTitle && <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#444', marginTop: 4 }}>{wsTitle}</div>}
      </div>

      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* TAP */}
        {step === 'tap' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="ping-ring" style={{ animationDelay: '0s' }} />
              <div className="ping-ring" style={{ animationDelay: '.6s' }} />
              <div style={{
                position: 'absolute', inset: 16, borderRadius: '50%',
                border: '2px solid rgba(207,255,0,0.4)',
                background: 'rgba(207,255,0,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 8, color: '#CFFF00', letterSpacing: '.1em', textAlign: 'center' }}>
                  TAP<br />CARD
                </div>
              </div>
            </div>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 20, letterSpacing: '-.03em', marginBottom: 8 }}>
              Give feedback
            </h2>
            <p style={{ color: '#555', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
              Tap your NFC card to identify yourself, then share your thoughts on the workshop.
            </p>
            <button onClick={startNFC} style={{
              width: '100%', padding: '13px', background: '#CFFF00', color: '#000',
              border: 'none', borderRadius: 10, fontFamily: 'var(--font-syne)',
              fontWeight: 800, fontSize: 14, cursor: 'none',
            }}>
              Tap Card to Start →
            </button>
          </div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <div style={{ animation: 'popIn .35s ease' }}>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 20, letterSpacing: '-.03em', marginBottom: 24 }}>
              Your feedback
            </h2>

            {/* Rating */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Overall Rating *
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {STARS.map(s => (
                  <button key={s} className="star-btn" onClick={() => setRating(s)}>
                    {s <= rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Highlight */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                What was the best part?
              </div>
              <textarea value={highlight} onChange={e => setHighlight(e.target.value)}
                rows={2} maxLength={300}
                placeholder="Something you enjoyed or found useful..."
                style={textareaStyle} />
            </div>

            {/* Improve */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                What could be better?
              </div>
              <textarea value={improve} onChange={e => setImprove(e.target.value)}
                rows={2} maxLength={300}
                placeholder="Suggestions for improvement..."
                style={textareaStyle} />
            </div>

            {/* Would return */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {[true, false].map(val => (
                <button key={String(val)}
                  onClick={() => setWouldReturn(val)}
                  style={{
                    flex: 1, padding: '10px',
                    background: wouldReturn === val ? 'rgba(207,255,0,0.08)' : 'transparent',
                    border: `1px solid ${wouldReturn === val ? 'rgba(207,255,0,0.3)' : '#1e1e1e'}`,
                    borderRadius: 9, color: wouldReturn === val ? '#CFFF00' : '#444',
                    fontFamily: 'var(--font-jetbrains)', fontSize: 12,
                    cursor: 'none', transition: 'all .2s',
                  }}>
                  {val ? '👍 Would attend again' : '👎 Maybe not'}
                </button>
              ))}
            </div>

            <button onClick={submitFeedback} disabled={!rating} style={{
              width: '100%', padding: '13px',
              background: rating ? '#CFFF00' : '#1a1a1a',
              color: rating ? '#000' : '#333',
              border: 'none', borderRadius: 10,
              fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 14,
              cursor: rating ? 'none' : 'not-allowed',
            }}>
              Submit Feedback →
            </button>
          </div>
        )}

        {/* SUBMITTING */}
        {step === 'submitting' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 36, height: 36, border: '2px solid #1a1a1a', borderTopColor: '#CFFF00', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#444', letterSpacing: '.06em' }}>Submitting...</div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0', animation: 'popIn .35s ease' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#CFFF00', fontSize: 22, letterSpacing: '-.03em', marginBottom: 8 }}>
              Thanks for the feedback!
            </h2>
            <p style={{ color: '#555', fontSize: 13 }}>It helps us run better workshops.</p>
            <Link href="/" style={{ display: 'inline-block', marginTop: 24, fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#333', textDecoration: 'none', border: '1px solid #1a1a1a', padding: '8px 16px', borderRadius: 8 }}>
              ← Back to Chathurya
            </Link>
          </div>
        )}

        {/* DUPLICATE */}
        {step === 'duplicate' && (
          <div style={{ textAlign: 'center', padding: '20px 0', animation: 'popIn .35s ease' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>↩</div>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#555', fontSize: 20, marginBottom: 8 }}>Already submitted</h2>
            <p style={{ color: '#444', fontSize: 13 }}>You've already given feedback for this workshop.</p>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✕</div>
            <p style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#ff4040', marginBottom: 20 }}>{errorMsg}</p>
            <button onClick={() => setStep('tap')} style={{
              background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 8,
              color: '#555', fontFamily: 'var(--font-jetbrains)', fontSize: 11,
              padding: '8px 16px', cursor: 'none',
            }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const textareaStyle: React.CSSProperties = {
  width: '100%', background: '#0d0d0d', border: '1px solid #1a1a1a',
  borderRadius: 8, color: '#e0e0e0', fontFamily: 'var(--font-dm-sans)',
  fontSize: 13, padding: '11px 14px', outline: 'none',
  resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
}
