'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'

/* ── Types ──────────────────────────────────────────────────────────────── */
type GameState = 'idle' | 'countdown' | 'waiting' | 'go' | 'result' | 'false_start'

interface LeaderboardEntry {
  member_name: string
  avatar_url: string | null
  member_archetype: string | null
  reaction_time_ms: number
  created_at: string
}

interface MyStats {
  best_ms: number | null
  attempts: number
  false_starts: number
  rank: number | null
  total_players: number
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function getGrade(ms: number) {
  if (ms < 200) return { label: 'SUPERHUMAN', color: '#00e676', emoji: '⚡' }
  if (ms < 250) return { label: 'LIGHTNING', color: '#CFFF00', emoji: '🏎️' }
  if (ms < 350) return { label: 'QUICK', color: '#ff9800', emoji: '👍' }
  return { label: 'SLOW', color: '#ff4040', emoji: '🐢' }
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function ReactionPage() {
  const [state, setState] = useState<GameState>('idle')
  const [litCount, setLitCount] = useState(0)
  const [reactionMs, setReactionMs] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [myStats, setMyStats] = useState<MyStats | null>(null)
  const [saving, setSaving] = useState(false)
  const [showBoard, setShowBoard] = useState(false)

  const goTimeRef = useRef(0)
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  /* ── Fetch leaderboard + stats on mount ── */
  useEffect(() => {
    fetch('/api/reaction/leaderboard').then(r => r.json()).then(d => setLeaderboard(d.data || []))
    authFetch('/api/reaction/stats').then(r => r.json()).then(d => {
      if (d.best_ms !== undefined) setMyStats(d)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout)
  }, [])

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  /* ── Start game ── */
  const startGame = useCallback(() => {
    clearAllTimeouts()
    setLitCount(0)
    setReactionMs(0)
    setShowBoard(false)
    setState('countdown')

    for (let i = 1; i <= 5; i++) {
      const t = setTimeout(() => setLitCount(i), i * 800)
      timeoutsRef.current.push(t)
    }

    const totalCountdown = 5 * 800
    const randomDelay = 1000 + Math.random() * 4000
    const goTimeout = setTimeout(() => {
      goTimeRef.current = performance.now()
      setState('go')
    }, totalCountdown + randomDelay)
    timeoutsRef.current.push(goTimeout)

    const waitTimeout = setTimeout(() => setState('waiting'), totalCountdown + 50)
    timeoutsRef.current.push(waitTimeout)
  }, [clearAllTimeouts])

  /* ── Handle tap/click ── */
  const handleTap = useCallback(async () => {
    if (state === 'idle' || state === 'result' || state === 'false_start') {
      startGame()
      return
    }

    if (state === 'countdown' || state === 'waiting') {
      clearAllTimeouts()
      setState('false_start')
      setSaving(true)
      try {
        await authFetch('/api/reaction/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction_time_ms: 0, is_false_start: true }),
        })
        const statsRes = await authFetch('/api/reaction/stats')
        const stats = await statsRes.json()
        if (stats.best_ms !== undefined) setMyStats(stats)
      } catch {}
      setSaving(false)
      setShowBoard(true)
      return
    }

    if (state === 'go') {
      const elapsed = Math.round(performance.now() - goTimeRef.current)
      setReactionMs(elapsed)
      setState('result')

      setSaving(true)
      try {
        const res = await authFetch('/api/reaction/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction_time_ms: elapsed, is_false_start: false }),
        })
        const data = await res.json()
        if (data.best_ms !== undefined) setMyStats(data)
        const lbRes = await fetch('/api/reaction/leaderboard')
        const lb = await lbRes.json()
        setLeaderboard(lb.data || [])
      } catch {}
      setSaving(false)
      setShowBoard(true)
    }
  }, [state, startGame, clearAllTimeouts])

  const grade = reactionMs > 0 ? getGrade(reactionMs) : null

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'var(--font-dm-sans)' }}>
      <style>{`
        @keyframes lightOn {
          from { transform: scale(0.8); opacity: 0.2 }
          to   { transform: scale(1); opacity: 1 }
        }
        @keyframes goFlash {
          0%   { background: rgba(207,255,0,0.2) }
          100% { background: transparent }
        }
        @keyframes falseFlash {
          0%   { background: rgba(255,64,64,0.25) }
          100% { background: transparent }
        }
        @keyframes popIn {
          from { transform: scale(0.7) translateY(16px); opacity: 0 }
          to   { transform: scale(1) translateY(0); opacity: 1 }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0 }
          to   { transform: translateY(0); opacity: 1 }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5 }
          50%      { opacity: 1 }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,26,26,0.4), 0 0 60px rgba(255,26,26,0.15) }
          50%      { box-shadow: 0 0 30px rgba(255,26,26,0.7), 0 0 80px rgba(255,26,26,0.25) }
        }
      `}</style>

      {/* ── Nav ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid #111',
      }}>
        <Link href="/dashboard" style={{
          fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#444',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Dashboard
        </Link>
        <div style={{
          fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00',
          letterSpacing: '.15em', textTransform: 'uppercase',
        }}>
          // reaction test
        </div>
      </div>

      {/* ══════════ Game Area (full width, centered) ══════════ */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 53px)', padding: '40px 20px',
      }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800,
            fontSize: state === 'result' ? 28 : 42,
            letterSpacing: '-.04em', margin: '0 0 8px',
            color: state === 'go' ? '#CFFF00' : state === 'false_start' ? '#ff4040' : '#fff',
            transition: 'color 0.15s',
          }}>
            {state === 'false_start' ? 'FALSE START!' :
             state === 'result' ? 'Your Reaction Time' :
             state === 'go' ? 'GO!' :
             'Reaction Test'}
          </h1>
          <p style={{
            fontFamily: 'var(--font-jetbrains)', fontSize: 12,
            color: state === 'false_start' ? '#ff4040' : '#2a2a2a',
            letterSpacing: '.04em', margin: 0,
          }}>
            {state === 'idle' && 'Test your reflexes against the F1 countdown lights'}
            {(state === 'countdown' || state === 'waiting') && 'Wait for it...'}
            {state === 'go' && 'TAP NOW!'}
            {state === 'result' && grade && `${grade.emoji} ${grade.label}`}
            {state === 'false_start' && 'You tapped too early!'}
          </p>
        </div>

        {/* ── F1 Lights — wide panel ── */}
        <div style={{
          display: 'flex', gap: 28, marginBottom: 48,
          padding: '32px 56px', borderRadius: 24,
          background: '#080808',
          border: '1px solid #1a1a1a',
          boxShadow: '0 8px 60px rgba(0,0,0,0.6)',
          animation: state === 'go' ? 'goFlash 0.5s ease forwards' :
                     state === 'false_start' ? 'falseFlash 0.5s ease forwards' : 'none',
        }}>
          {[0, 1, 2, 3, 4].map(i => {
            const isLit = state === 'go' ? false : litCount > i
            return (
              <div key={i} style={{
                width: 72, height: 72, borderRadius: '50%',
                background: isLit
                  ? 'radial-gradient(circle at 40% 35%, #ff6b6b 0%, #ff1a1a 40%, #cc0000 100%)'
                  : 'radial-gradient(circle at 40% 35%, #1a1a1a 0%, #111 60%, #0a0a0a 100%)',
                border: `3px solid ${isLit ? '#ff4444' : '#1e1e1e'}`,
                boxShadow: isLit
                  ? '0 0 24px rgba(255,26,26,0.5), 0 0 80px rgba(255,26,26,0.2), inset 0 -6px 12px rgba(0,0,0,0.4)'
                  : 'inset 0 2px 6px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02)',
                transition: isLit ? 'none' : 'all 0.15s ease',
                animation: isLit ? 'lightOn 0.12s ease forwards, glowPulse 1.5s ease-in-out infinite' : 'none',
                position: 'relative',
              }}>
                {/* Inner highlight */}
                {isLit && (
                  <div style={{
                    position: 'absolute', top: 10, left: 14,
                    width: 18, height: 12, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,200,200,0.6), transparent)',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── Result big number ── */}
        {state === 'result' && grade && (
          <div style={{
            textAlign: 'center', marginBottom: 32,
            animation: 'popIn 0.3s ease forwards',
          }}>
            <div style={{
              fontFamily: 'var(--font-syne)', fontWeight: 800,
              fontSize: 96, color: grade.color,
              letterSpacing: '-.06em', lineHeight: 1,
            }}>
              {reactionMs}<span style={{ fontSize: 28, color: '#2a2a2a', marginLeft: 4 }}>ms</span>
            </div>

            {myStats && (
              <div style={{
                display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24,
              }}>
                {[
                  { label: 'Personal Best', value: myStats.best_ms ? `${myStats.best_ms}ms` : '—' },
                  { label: 'Rank', value: myStats.rank ? `#${myStats.rank}` : '—' },
                  { label: 'Attempts', value: String(myStats.attempts) },
                  { label: 'False Starts', value: String(myStats.false_starts) },
                ].map(s => (
                  <div key={s.label} style={{
                    background: '#0a0a0a', border: '1px solid #161616',
                    borderRadius: 10, padding: '10px 18px', minWidth: 80,
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-jetbrains)', fontSize: 9,
                      color: '#333', letterSpacing: '.08em',
                      textTransform: 'uppercase', marginBottom: 4,
                    }}>{s.label}</div>
                    <div style={{
                      fontFamily: 'var(--font-syne)', fontWeight: 800,
                      fontSize: 20, color: '#CFFF00', letterSpacing: '-.03em',
                    }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}
            {saving && (
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#1e1e1e', marginTop: 10 }}>
                Saving...
              </div>
            )}
          </div>
        )}

        {/* ── Tap Button ── */}
        <button
          onClick={handleTap}
          style={{
            width: 280, padding: '20px 0',
            background: state === 'go' ? '#CFFF00'
                      : state === 'false_start' ? 'rgba(255,64,64,0.08)'
                      : state === 'result' ? 'rgba(207,255,0,0.06)'
                      : 'rgba(207,255,0,0.05)',
            border: `1.5px solid ${
              state === 'go' ? '#CFFF00'
              : state === 'false_start' ? 'rgba(255,64,64,0.3)'
              : 'rgba(207,255,0,0.15)'
            }`,
            borderRadius: 16,
            color: state === 'go' ? '#000'
                 : state === 'false_start' ? '#ff6b6b'
                 : '#CFFF00',
            fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 18,
            cursor: 'pointer', letterSpacing: '-.01em',
            transition: 'all 0.15s',
            animation: state === 'go' ? 'pulse 0.35s ease infinite' : 'none',
          }}
        >
          {state === 'idle' && '🏎️ Start'}
          {(state === 'countdown' || state === 'waiting') && 'Wait...'}
          {state === 'go' && 'TAP!'}
          {state === 'result' && 'Try Again'}
          {state === 'false_start' && 'Retry'}
        </button>

        {/* ── Personal best (idle only) ── */}
        {state === 'idle' && myStats && myStats.best_ms && (
          <div style={{
            marginTop: 24, textAlign: 'center',
            fontFamily: 'var(--font-jetbrains)', fontSize: 11,
          }}>
            <span style={{ color: '#2a2a2a' }}>Your best: </span>
            <span style={{ color: '#CFFF00', fontWeight: 700 }}>{myStats.best_ms}ms</span>
            {myStats.rank && (
              <>
                <span style={{ color: '#1a1a1a' }}> · </span>
                <span style={{ color: '#2a2a2a' }}>Rank </span>
                <span style={{ color: '#666' }}>#{myStats.rank}</span>
                <span style={{ color: '#1a1a1a' }}> / {myStats.total_players}</span>
              </>
            )}
          </div>
        )}

        {/* ══════════ Leaderboard (shown after game ends) ══════════ */}
        {showBoard && (
          <div style={{
            width: '100%', maxWidth: 520, marginTop: 40,
            background: '#0a0a0a', border: '1px solid #141414',
            borderRadius: 18, padding: '24px 24px 20px',
            animation: 'slideUp 0.4s ease forwards',
          }}>
            <div style={{
              fontFamily: 'var(--font-jetbrains)', fontSize: 10,
              color: '#CFFF00', letterSpacing: '.12em',
              textTransform: 'uppercase', marginBottom: 18,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              🏆 Leaderboard
              <span style={{ color: '#222', fontSize: 9 }}>Top 20</span>
            </div>

            {leaderboard.length === 0 ? (
              <div style={{
                padding: '28px 0', textAlign: 'center',
                fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#1e1e1e',
              }}>
                No scores yet. You could be first!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {leaderboard.map((entry, i) => {
                  const g = getGrade(entry.reaction_time_ms)
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10,
                      background: i === 0 ? 'rgba(207,255,0,0.04)' : 'transparent',
                      border: i === 0 ? '1px solid rgba(207,255,0,0.1)' : '1px solid transparent',
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: i === 0 ? 'rgba(207,255,0,0.12)'
                                  : i === 1 ? 'rgba(192,192,192,0.08)'
                                  : i === 2 ? 'rgba(205,127,50,0.08)' : '#0f0f0f',
                        border: `1px solid ${
                          i === 0 ? 'rgba(207,255,0,0.3)'
                          : i === 1 ? 'rgba(192,192,192,0.2)'
                          : i === 2 ? 'rgba(205,127,50,0.2)' : '#1a1a1a'
                        }`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 11,
                        color: i === 0 ? '#CFFF00' : i < 3 ? '#888' : '#333',
                      }}>
                        {i + 1}
                      </div>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,#CFFF00,#a8cc00)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#000', fontSize: 11,
                        overflow: 'hidden',
                      }}>
                        {entry.avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={entry.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : entry.member_name.split(' ').map(w => w[0]).join('').slice(0, 2)
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-syne)', fontWeight: 700,
                          color: '#d0d0d0', fontSize: 13,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {entry.member_name}
                        </div>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-syne)', fontWeight: 800,
                        fontSize: 16, color: g.color, flexShrink: 0,
                        letterSpacing: '-.02em',
                      }}>
                        {entry.reaction_time_ms}<span style={{ fontSize: 10, color: '#2a2a2a' }}>ms</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
