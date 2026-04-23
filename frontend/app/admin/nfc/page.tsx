'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  stream: string
  year: number
  encrypted_uid: string
  nfc_written_at: string | null
  avatar_url: string | null
}

type WriteState = 'idle' | 'writing' | 'success' | 'error'

export default function NFCWritePage() {
  const [members,    setMembers]   = useState<Member[]>([])
  const [loading,    setLoading]   = useState(true)
  const [selected,   setSelected]  = useState<Member | null>(null)
  const [writeState, setWriteState] = useState<WriteState>('idle')
  const [errorMsg,   setErrorMsg]  = useState('')
  const [filter,     setFilter]    = useState<'all' | 'pending' | 'written'>('pending')
  const [search,     setSearch]    = useState('')
  const [toast,      setToast]     = useState<string | null>(null)
  const nfcSupported = typeof window !== 'undefined' && 'NDEFWriter' in window ||
                       typeof window !== 'undefined' && 'NDEFReader' in window

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb
      .from('members')
      .select('id, first_name, last_name, email, stream, year, encrypted_uid, nfc_written_at, avatar_url')
      .order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const writeCard = async (member: Member) => {
    if (!member.encrypted_uid) {
      setErrorMsg('This member has no UID assigned yet.')
      setWriteState('error')
      return
    }

    setWriteState('writing')
    setErrorMsg('')

    const profileUrl = `${window.location.origin}/u/${member.encrypted_uid}`
    const memberName = `${member.first_name} ${member.last_name}`

    try {
      // NDEFWriter is the older API, NDEFReader with write is the newer one
      const ndef = new (window as any).NDEFReader()

      await ndef.write({
        records: [
          // Primary record — URL (opens public profile when tapped)
          {
            recordType: 'url',
            data: profileUrl,
          },
          // Second record — member name as text
          {
            recordType: 'text',
            data: memberName,
            lang: 'en',
          },
        ],
      })

      // Mark as written in Supabase
      await fetch(`/api/backend/admin/members/${member.id}/nfc-written`, {
  method: 'PATCH',
})

      setWriteState('success')
      showToast(`Card written for ${memberName} ✓`)
      fetchMembers()

      // Reset after 3s
      setTimeout(() => {
        setWriteState('idle')
        setSelected(null)
      }, 3000)

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setErrorMsg('NFC permission denied. Allow NFC access in Chrome settings.')
      } else if (err.name === 'NotSupportedError') {
        setErrorMsg('NFC not supported on this device.')
      } else {
        setErrorMsg(err.message || 'Failed to write card. Make sure NFC is enabled.')
      }
      setWriteState('error')
    }
  }

  const filtered = members.filter(m => {
    const matchSearch = search
      ? `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase())
      : true
    const matchFilter = filter === 'all' ? true
      : filter === 'pending' ? !m.nfc_written_at
      : !!m.nfc_written_at
    return matchSearch && matchFilter
  })

  const pendingCount = members.filter(m => !m.nfc_written_at).length
  const writtenCount = members.filter(m => !!m.nfc_written_at).length

  return (
    <div style={{ padding: '32px 36px' }}>
      <style>{`
        @keyframes ping {
          0%   { transform:scale(1);   opacity:.8 }
          70%  { transform:scale(2.2); opacity:0  }
          100% { transform:scale(2.2); opacity:0  }
        }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes popIn {
          from { transform:scale(.85); opacity:0 }
          to   { transform:scale(1);   opacity:1 }
        }
        .member-row {
          display:flex; align-items:center; gap:14px;
          padding:12px 16px; border-radius:10px;
          border:1px solid #141414; background:#0d0d0d;
          cursor:none; transition:all .2s;
        }
        .member-row:hover { border-color:rgba(207,255,0,0.15); background:rgba(207,255,0,0.02); }
        .member-row.selected { border-color:rgba(207,255,0,0.35); background:rgba(207,255,0,0.04); }
        .ping-ring {
          position:absolute; inset:0; border-radius:50%;
          border:2px solid rgba(207,255,0,0.4);
          animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite;
        }
      `}</style>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)',
          color: '#00e676', fontFamily: 'var(--font-jetbrains)', fontSize: 12,
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>
          // nfc · card writer
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 24, letterSpacing: '-.03em', margin: '0 0 6px' }}>
          Issue NFC Cards
        </h1>
        <p style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#444', margin: 0 }}>
          Select a member → tap blank NTAG216 card to your Android phone → card written.
          Requires Chrome on Android with NFC enabled.
        </p>
      </div>

      {/* Not supported banner */}
      {!nfcSupported && (
        <div style={{
          padding: '14px 18px', marginBottom: 24,
          background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)',
          borderRadius: 10,
          fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#ff9800',
          lineHeight: 1.7,
        }}>
          ⚠ Web NFC is not supported in this browser. Open this page on <strong>Chrome for Android</strong> with NFC enabled to write cards.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* ── Left: member list ── */}
        <div>
          {/* Stats + filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { key: 'pending', label: `Pending (${pendingCount})`, color: '#ff9800' },
              { key: 'written', label: `Written (${writtenCount})`, color: '#00e676' },
              { key: 'all',     label: `All (${members.length})`,   color: '#555'    },
            ].map(f => (
              <button key={f.key}
                onClick={() => setFilter(f.key as any)}
                style={{
                  background: filter === f.key ? 'rgba(207,255,0,0.08)' : 'transparent',
                  border: `1px solid ${filter === f.key ? 'rgba(207,255,0,0.25)' : '#1e1e1e'}`,
                  borderRadius: 7, color: filter === f.key ? '#CFFF00' : '#444',
                  fontFamily: 'var(--font-jetbrains)', fontSize: 11,
                  padding: '6px 14px', cursor: 'none', transition: 'all .2s',
                }}>
                {f.label}
              </button>
            ))}
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search member..."
              style={{
                marginLeft: 'auto', background: '#0d0d0d', border: '1px solid #1a1a1a',
                borderRadius: 8, color: '#888', fontFamily: 'var(--font-jetbrains)',
                fontSize: 11, padding: '7px 12px', outline: 'none', width: 180,
              }}
            />
          </div>

          {/* List */}
          {loading ? (
            <div style={{ color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>
              {filter === 'pending' ? 'All cards have been written!' : 'No members found'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map(m => (
                <div key={m.id}
                  className={`member-row${selected?.id === m.id ? ' selected' : ''}`}
                  onClick={() => { setSelected(m); setWriteState('idle'); setErrorMsg('') }}>

                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#CFFF00,#a8cc00)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#000', fontSize: 13,
                    overflow: 'hidden',
                  }}>
                    {m.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : `${m.first_name[0]}${m.last_name[0]}`}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: '#e0e0e0', fontSize: 13 }}>
                      {m.first_name} {m.last_name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#383838', marginTop: 1 }}>
                      {m.email} · {m.stream} · {m.year === 1 ? '1st' : m.year === 2 ? '2nd' : '3rd'} Year
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{
                    fontFamily: 'var(--font-jetbrains)', fontSize: 9, letterSpacing: '.06em',
                    padding: '3px 8px', borderRadius: 99, flexShrink: 0,
                    color: m.nfc_written_at ? '#00e676' : '#ff9800',
                    background: m.nfc_written_at ? 'rgba(0,230,118,0.08)' : 'rgba(255,152,0,0.08)',
                  }}>
                    {m.nfc_written_at ? '✓ Written' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: writer panel ── */}
        <div style={{
          background: '#0a0a0a', border: '1px solid #161616',
          borderRadius: 16, padding: 24, position: 'sticky', top: 20,
        }}>
          {!selected ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: .3 }}>🃏</div>
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#2a2a2a', letterSpacing: '.06em' }}>
                Select a member to write their card
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                Writing card for
              </div>

              {/* Member summary */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', background: '#0d0d0d',
                border: '1px solid #1a1a1a', borderRadius: 10, marginBottom: 20,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#CFFF00,#a8cc00)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#000', fontSize: 14,
                  overflow: 'hidden',
                }}>
                  {selected.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={selected.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : `${selected.first_name[0]}${selected.last_name[0]}`}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: '#fff', fontSize: 14 }}>
                    {selected.first_name} {selected.last_name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', marginTop: 2 }}>
                    {selected.stream} · {selected.year === 1 ? '1st' : selected.year === 2 ? '2nd' : '3rd'} Year
                  </div>
                </div>
              </div>

              {/* What will be written */}
              <div style={{
                padding: '12px 14px', background: '#060606',
                border: '1px solid #111', borderRadius: 8, marginBottom: 20,
                fontFamily: 'var(--font-jetbrains)', fontSize: 10,
              }}>
                <div style={{ color: '#383838', marginBottom: 8, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  Card contents
                </div>
                <div style={{ color: '#444', marginBottom: 4 }}>
                  <span style={{ color: '#2a2a2a' }}>URL → </span>
                  <span style={{ color: '#CFFF00', wordBreak: 'break-all' }}>
                    {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/u/{selected.encrypted_uid?.slice(0, 20)}...
                  </span>
                </div>
                <div style={{ color: '#444' }}>
                  <span style={{ color: '#2a2a2a' }}>Text → </span>
                  {selected.first_name} {selected.last_name}
                </div>
              </div>

              {/* Write states */}
              {writeState === 'idle' && (
                <>
                  {selected.nfc_written_at && (
                    <div style={{
                      padding: '8px 12px', marginBottom: 12,
                      background: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.2)',
                      borderRadius: 8, fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#ff9800',
                    }}>
                      Card previously written on {new Date(selected.nfc_written_at).toLocaleDateString('en-IN')}. Writing again will overwrite it.
                    </div>
                  )}
                  <button
                    onClick={() => nfcSupported && writeCard(selected)}
                    disabled={!nfcSupported}
                    style={{
                      width: '100%', padding: '13px',
                      background: nfcSupported ? '#CFFF00' : '#1a1a1a',
                      color: nfcSupported ? '#000' : '#333',
                      border: 'none', borderRadius: 10,
                      fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 14,
                      cursor: nfcSupported ? 'none' : 'not-allowed',
                      letterSpacing: '-.01em',
                    }}>
                    {nfcSupported ? 'Write Card →' : 'NFC not supported'}
                  </button>
                </>
              )}

              {writeState === 'writing' && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 16px' }}>
                    <div className="ping-ring" style={{ animationDelay: '0s' }} />
                    <div className="ping-ring" style={{ animationDelay: '.6s' }} />
                    <div style={{
                      position: 'absolute', inset: 12, borderRadius: '50%',
                      border: '2px solid #CFFF00',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-jetbrains)', fontSize: 8,
                      color: '#CFFF00', letterSpacing: '.08em', textAlign: 'center',
                    }}>
                      HOLD<br />CARD
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#555', letterSpacing: '.04em' }}>
                    Hold card steady to phone...
                  </div>
                </div>
              )}

              {writeState === 'success' && (
                <div style={{ textAlign: 'center', padding: '16px 0', animation: 'popIn .35s ease forwards' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                  <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#CFFF00', fontSize: 16, marginBottom: 6 }}>
                    Card written!
                  </div>
                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.04em' }}>
                    {selected.first_name}&apos;s card is ready to use
                  </div>
                </div>
              )}

              {writeState === 'error' && (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{
                    padding: '10px 14px', marginBottom: 12,
                    background: 'rgba(255,64,64,0.06)', border: '1px solid rgba(255,64,64,0.2)',
                    borderRadius: 8, fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#ff6b6b',
                  }}>
                    {errorMsg}
                  </div>
                  <button onClick={() => writeCard(selected)}
                    style={{
                      width: '100%', padding: '11px', background: 'transparent',
                      border: '1px solid #CFFF00', borderRadius: 10, color: '#CFFF00',
                      fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 13, cursor: 'none',
                    }}>
                    Try Again
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
