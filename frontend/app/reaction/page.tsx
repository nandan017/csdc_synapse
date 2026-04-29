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

  const goTimeRef = useRef(0)
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  /* ── Fetch leaderboard + stats on mount ── */
  useEffect(() => {
    fetch('/api/reaction/leaderboard').then(r => r.json()).then(d => setLeaderboard(d.data || []))
    authFetch('/api/reaction/stats').then(r => r.json()).then(d => {
      if (d.best_ms !== undefined) setMyStats(d)
    }).catch(() => {})
  }, [])

  /* ── Cleanup timeouts on unmount ── */
  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout)
  }, [])

  /* ── Clear all pending timeouts ── */
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  /* ── Start game ── */
  const startGame = useCallback(() => {
    clearAllTimeouts()
    setLitCount(0)
    setReactionMs(0)
    setState('countdown')

    // Light up each of the 5 lights one by one
    for (let i = 1; i <= 5; i++) {
      const t = setTimeout(() => setLitCount(i), i * 800)
      timeoutsRef.current.push(t)
    }

    // After all 5 lights are on, wait a random delay then GO
    const totalCountdown = 5 * 800
    const randomDelay = 1000 + Math.random() * 4000
    const goTimeout = setTimeout(() => {
      goTimeRef.current = performance.now()
      setState('go')
    }, totalCountdown + randomDelay)
    timeoutsRef.current.push(goTimeout)

    // Switch to 'waiting' after all lights are lit
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
      // FALSE START
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
        // Refresh leaderboard
        const lbRes = await fetch('/api/reaction/leaderboard')
        const lb = await lbRes.json()
        setLeaderboard(lb.data || [])
      } catch {}
      setSaving(false)
    }
  }, [state, startGame, clearAllTimeouts])

  const grade = reactionMs > 0 ? getGrade(reactionMs) : null

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'var(--font-dm-sans)' }}>
      <style>{`
        @keyframes lightOn {
          from { transform: scale(0.85); opacity: 0.3 }
          to   { transform: scale(1); opacity: 1 }
        }
        @keyframes goFlash {
          0%   { background: rgba(207,255,0,0.15) }
          50%  { background: rgba(207,255,0,0.03) }
          100% { background: rgba(207,255,0,0) }
        }
        @keyframes falseFlash {
          0%   { background: rgba(255,64,64,0.2) }
          50%  { background: rgba(255,64,64,0.05) }
          100% { background: transparent }
        }
        @keyframes popIn {
          from { transform: scale(0.6); opacity: 0 }
          to   { transform: scale(1); opacity: 1 }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4 }
          50%      { opacity: 1 }
        }
        .grid-bg {
          background-image: 
            linear-gradient(rgba(207,255,0,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(207,255,0,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
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

      <div className="grid-bg" style={{
        display: 'grid', gridTemplateColumns: '1fr 320px',
        maxWidth: 1100, margin: '0 auto', padding: '40px 28px', gap: 32,
        minHeight: 'calc(100vh - 53px)',
      }}>

        {/* ══════════ LEFT: Game Area ══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{
              fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 36,
              letterSpacing: '-.04em', margin: '0 0 8px',
              color: state === 'go' ? '#CFFF00' : '#fff',
              transition: 'color 0.15s',
            }}>
              {state === 'false_start' ? 'FALSE START!' :
               state === 'result' ? `${reactionMs}ms` :
               state === 'go' ? 'GO!' :
               'Reaction Test'}
            </h1>
            <p style={{
              fontFamily: 'var(--font-jetbrains)', fontSize: 11,
              color: state === 'false_start' ? '#ff4040' : '#383838',
              letterSpacing: '.04em', margin: 0,
            }}>
              {state === 'idle' && 'Test your reflexes. Tap when the lights go out.'}
              {state === 'countdown' && 'Wait for it...'}
              {state === 'waiting' && 'Wait for it...'}
              {state === 'go' && 'TAP NOW!'}
              {state === 'result' && grade && `${grade.emoji} ${grade.label}`}
              {state === 'false_start' && 'You tapped too early! Try again.'}
            </p>
          </div>

          {/* ── F1 Lights ── */}
          <div style={{
            display: 'flex', gap: 20, marginBottom: 48,
            padding: '28px 40px', borderRadius: 20,
            background: '#0a0a0a', border: '1px solid #161616',
            animation: state === 'go' ? 'goFlash 0.6s ease forwards' :
                       state === 'false_start' ? 'falseFlash 0.6s ease forwards' : 'none',
          }}>
            {[0, 1, 2, 3, 4].map(i => {
              const isLit = state === 'go' ? false : litCount > i
              return (
                <div key={i} style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: isLit
                    ? 'radial-gradient(circle, #ff1a1a 30%, #cc0000 100%)'
                    : '#111',
                  border: `2px solid ${isLit ? '#ff3333' : '#1a1a1a'}`,
                  boxShadow: isLit
                    ? '0 0 20px rgba(255,26,26,0.6), 0 0 60px rgba(255,26,26,0.2), inset 0 -4px 8px rgba(0,0,0,0.3)'
                    : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                  transition: isLit ? 'none' : 'all 0.15s ease',
                  animation: isLit ? 'lightOn 0.15s ease forwards' : 'none',
                }}>
                  {/* Inner glow dot */}
                  {isLit && (
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'radial-gradient(circle, #ff6b6b, transparent)',
                      margin: '12px auto 0',
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Tap Zone ── */}
          <button
            onClick={handleTap}
            style={{
              width: 260, padding: '18px 0',
              background: state === 'go' ? '#CFFF00'
                        : state === 'false_start' ? 'rgba(255,64,64,0.1)'
                        : state === 'result' ? 'rgba(207,255,0,0.08)'
                        : 'rgba(207,255,0,0.06)',
              border: `1px solid ${
                state === 'go' ? '#CFFF00'
                : state === 'false_start' ? 'rgba(255,64,64,0.3)'
                : 'rgba(207,255,0,0.2)'
              }`,
              borderRadius: 14,
              color: state === 'go' ? '#000'
                   : state === 'false_start' ? '#ff6b6b'
                   : '#CFFF00',
              fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 16,
              cursor: 'pointer', letterSpacing: '-.01em',
              transition: 'all 0.15s',
              animation: state === 'go' ? 'pulse 0.4s ease infinite' : 'none',
            }}
          >
            {state === 'idle' && 'Start'}
            {(state === 'countdown' || state === 'waiting') && 'Wait...'}
            {state === 'go' && 'TAP!'}
            {state === 'result' && 'Try Again'}
            {state === 'false_start' && 'Retry'}
          </button>

          {/* ── Result details ── */}
          {state === 'result' && grade && (
            <div style={{
              marginTop: 28, textAlign: 'center',
              animation: 'popIn 0.3s ease forwards',
            }}>
              <div style={{
                fontFamily: 'var(--font-syne)', fontWeight: 800,
                fontSize: 64, color: grade.color,
                letterSpacing: '-.06em', lineHeight: 1,
              }}>
                {reactionMs}<span style={{ fontSize: 24, color: '#383838' }}>ms</span>
              </div>

              {myStats && (
                <div style={{
                  display: 'flex', gap: 20, justifyContent: 'center', marginTop: 20,
                }}>
                  {[
                    { label: 'Personal Best', value: myStats.best_ms ? `${myStats.best_ms}ms` : '—' },
                    { label: 'Rank', value: myStats.rank ? `#${myStats.rank}` : '—' },
                    { label: 'Attempts', value: String(myStats.attempts) },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: '#0d0d0d', border: '1px solid #161616',
                      borderRadius: 10, padding: '10px 16px', minWidth: 80,
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-jetbrains)', fontSize: 9,
                        color: '#383838', letterSpacing: '.08em',
                        textTransform: 'uppercase', marginBottom: 4,
                      }}>{s.label}</div>
                      <div style={{
                        fontFamily: 'var(--font-syne)', fontWeight: 800,
                        fontSize: 18, color: '#CFFF00', letterSpacing: '-.03em',
                      }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {saving && (
                <div style={{
                  fontFamily: 'var(--font-jetbrains)', fontSize: 10,
                  color: '#2a2a2a', marginTop: 12,
                }}>Saving...</div>
              )}
            </div>
          )}

          {/* ── My stats (idle) ── */}
          {state === 'idle' && myStats && myStats.best_ms && (
            <div style={{
              marginTop: 28, textAlign: 'center',
              fontFamily: 'var(--font-jetbrains)', fontSize: 11,
            }}>
              <span style={{ color: '#383838' }}>Your best: </span>
              <span style={{ color: '#CFFF00', fontWeight: 700 }}>{myStats.best_ms}ms</span>
              {myStats.rank && (
                <>
                  <span style={{ color: '#1e1e1e' }}> · </span>
                  <span style={{ color: '#383838' }}>Rank </span>
                  <span style={{ color: '#888' }}>#{myStats.rank}</span>
                  <span style={{ color: '#1e1e1e' }}> / {myStats.total_players}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ══════════ RIGHT: Leaderboard ══════════ */}
        <div style={{
          background: '#0a0a0a', border: '1px solid #141414',
          borderRadius: 16, padding: '20px 22px',
          alignSelf: 'start', position: 'sticky', top: 20,
        }}>
          <div style={{
            fontFamily: 'var(--font-jetbrains)', fontSize: 10,
            color: '#CFFF00', letterSpacing: '.12em',
            textTransform: 'uppercase', marginBottom: 18,
          }}>
            🏆 Leaderboard
          </div>

          {leaderboard.length === 0 ? (
            <div style={{
              padding: '32px 0', textAlign: 'center',
              fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#2a2a2a',
            }}>
              No scores yet. Be the first!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {leaderboard.map((entry, i) => {
                const g = getGrade(entry.reaction_time_ms)
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10,
                    background: i === 0 ? 'rgba(207,255,0,0.04)' : 'transparent',
                    border: i === 0 ? '1px solid rgba(207,255,0,0.1)' : '1px solid transparent',
                  }}>
                    {/* Rank */}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: i === 0 ? 'rgba(207,255,0,0.12)'
                                : i === 1 ? 'rgba(192,192,192,0.08)'
                                : i === 2 ? 'rgba(205,127,50,0.08)'
                                : '#111',
                      border: `1px solid ${
                        i === 0 ? 'rgba(207,255,0,0.3)'
                        : i === 1 ? 'rgba(192,192,192,0.2)'
                        : i === 2 ? 'rgba(205,127,50,0.2)'
                        : '#1e1e1e'
                      }`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 10,
                      color: i === 0 ? '#CFFF00' : i < 3 ? '#888' : '#333',
                    }}>
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#CFFF00,#a8cc00)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#000', fontSize: 10,
                      overflow: 'hidden',
                    }}>
                      {entry.avatar_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={entry.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : entry.member_name.split(' ').map(w => w[0]).join('').slice(0, 2)
                      }
                    </div>

                    {/* Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-syne)', fontWeight: 700,
                        color: '#e0e0e0', fontSize: 12,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {entry.member_name}
                      </div>
                      {entry.member_archetype && (
                        <div style={{
                          fontFamily: 'var(--font-jetbrains)', fontSize: 8,
                          color: '#2a2a2a',
                        }}>
                          {entry.member_archetype}
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    <div style={{
                      fontFamily: 'var(--font-syne)', fontWeight: 800,
                      fontSize: 14, color: g.color, flexShrink: 0,
                      letterSpacing: '-.02em',
                    }}>
                      {entry.reaction_time_ms}<span style={{ fontSize: 9, color: '#383838' }}>ms</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
