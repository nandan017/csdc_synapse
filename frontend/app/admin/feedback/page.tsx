'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface Workshop { id: string; title: string }
interface Aggregate {
  total: number; avg_rating: number
  would_return_pct: number
  distribution: Record<string, number>
}
interface FeedbackRow {
  rating: number; highlight: string; improve: string
  would_return: boolean; submitted_at: string
}

export default function FeedbackAdminPage() {
  const [workshops,  setWorkshops]  = useState<Workshop[]>([])
  const [selectedWS, setSelectedWS] = useState<string>('')
  const [aggregate,  setAggregate]  = useState<Aggregate | null>(null)
  const [rows,       setRows]       = useState<FeedbackRow[]>([])
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    authFetch('/api/backend/admin/workshops')
      .then(r => r.json())
      .then(d => { setWorkshops(d.data || []); if (d.data?.[0]) setSelectedWS(d.data[0].id) })
  }, [])

  useEffect(() => {
    if (!selectedWS) return
    setLoading(true)
    authFetch(`/api/backend/feedback/workshop/${selectedWS}`)
      .then(r => r.json())
      .then(d => { setAggregate(d.aggregate); setRows(d.data || []); setLoading(false) })
  }, [selectedWS])

  const STARS = '★★★★★'

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>// feedback</div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 24, letterSpacing: '-.03em', margin: 0 }}>Workshop Feedback</h1>
      </div>

      {/* Workshop picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {workshops.map(w => (
          <button key={w.id} onClick={() => setSelectedWS(w.id)} style={{
            background: selectedWS === w.id ? 'rgba(207,255,0,0.08)' : 'transparent',
            border: `1px solid ${selectedWS === w.id ? 'rgba(207,255,0,0.25)' : '#1e1e1e'}`,
            borderRadius: 8, color: selectedWS === w.id ? '#CFFF00' : '#444',
            fontFamily: 'var(--font-jetbrains)', fontSize: 11,
            padding: '7px 16px', cursor: 'none', transition: 'all .2s',
          }}>{w.title}</button>
        ))}
      </div>

      {loading && <div style={{ color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>Loading...</div>}

      {!loading && aggregate && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Responses',     value: aggregate.total,            unit: '' },
              { label: 'Avg Rating',    value: `${aggregate.avg_rating}/5`, unit: '' },
              { label: 'Would Return',  value: `${aggregate.would_return_pct}%`, unit: '' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#383838', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#CFFF00', fontSize: 28, letterSpacing: '-.04em' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Star distribution */}
          <div style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>Rating Distribution</div>
            {[5, 4, 3, 2, 1].map(star => {
              const count = aggregate.distribution[String(star)] || 0
              const pct   = aggregate.total > 0 ? Math.round((count / aggregate.total) * 100) : 0
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#CFFF00', width: 20 }}>{star}★</span>
                  <div style={{ flex: 1, height: 6, background: '#111', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'rgba(207,255,0,0.6)', width: `${pct}%`, borderRadius: 3, transition: 'width .6s ease' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#383838', width: 40, textAlign: 'right' }}>{count} ({pct}%)</span>
                </div>
              )
            })}
          </div>

          {/* Individual responses */}
          {rows.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                Responses ({rows.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 12, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: r.highlight || r.improve ? 10 : 0 }}>
                      <span style={{ color: '#CFFF00', fontSize: 14 }}>{STARS.slice(0, r.rating)}<span style={{ color: '#1e1e1e' }}>{STARS.slice(r.rating)}</span></span>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {r.would_return && <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#00e676', background: 'rgba(0,230,118,0.08)', padding: '2px 8px', borderRadius: 99 }}>Would return</span>}
                        <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#2a2a2a' }}>{new Date(r.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                    {r.highlight && <p style={{ color: '#555', fontSize: 12, lineHeight: 1.6, margin: '0 0 6px' }}>👍 {r.highlight}</p>}
                    {r.improve  && <p style={{ color: '#444', fontSize: 12, lineHeight: 1.6, margin: 0 }}>💡 {r.improve}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !aggregate && selectedWS && (
        <div style={{ padding: 60, textAlign: 'center', color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>
          No feedback submitted yet for this workshop
        </div>
      )}
    </div>
  )
}
