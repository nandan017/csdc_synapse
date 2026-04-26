'use client'

import { useEffect, useState, useCallback } from 'react'

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  year: number
  section: string
  stream: string
  xp: number
  role: string
  is_alumni: boolean
  tshirt_size: string
  tshirt_dispatched: boolean
  encrypted_uid: string | null
  nfc_written_at: string | null
  linkedin: string
  github: string
  created_at: string
}

const ROLES = [
  { key: 'member',    label: 'Member',    color: '#555',    bg: 'rgba(85,85,85,0.1)' },
  { key: 'core_team', label: 'Core Team', color: '#00b4ff', bg: 'rgba(0,180,255,0.08)' },
  { key: 'co_lead',   label: 'Co-Lead',   color: '#ff9800', bg: 'rgba(255,152,0,0.08)' },
  { key: 'club_lead', label: 'Club Lead', color: '#CFFF00', bg: 'rgba(207,255,0,0.08)' },
]

const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.key, r]))

// CoC-style hierarchy icon
const ROLE_ICON: Record<string, string> = {
  club_lead: '👑',
  co_lead:   '⭐',
  core_team: '🔷',
  member:    '●',
}

export default function MembersPage() {
  const [members,      setMembers]      = useState<Member[]>([])
  const [total,        setTotal]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [expanded,     setExpanded]     = useState<string | null>(null)
  const [actionLoading,setActionLoading] = useState<string | null>(null)
  const [roleLoading,  setRoleLoading]  = useState<string | null>(null)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/backend/admin/members?${params}`)
    const data = await res.json()
    setMembers(data.data || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [search])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const markTshirt = async (id: string) => {
    setActionLoading(id)
    const res = await fetch(`/api/backend/admin/members/${id}/tshirt`, { method: 'PATCH' })
    if (res.ok) { showToast('T-shirt marked as dispatched'); fetchMembers() }
    else showToast('Failed', false)
    setActionLoading(null)
  }

  const updateRole = async (id: string, role: string) => {
    setRoleLoading(id)
    try {
      const res = await fetch(`/api/backend/admin/members/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Role updated to ${data.label}`)
        fetchMembers()
      } else {
        showToast(data.detail || 'Failed to update role', false)
      }
    } catch (err) {
      showToast('Network error — please try again', false)
    }
    setRoleLoading(null)
  }

  // Sort by role hierarchy then XP
  const roleOrder = { club_lead: 0, co_lead: 1, core_team: 2, member: 3 }
  const sorted = [...members].sort((a, b) => {
    const ra = roleOrder[a.role as keyof typeof roleOrder] ?? 4
    const rb = roleOrder[b.role as keyof typeof roleOrder] ?? 4
    return ra !== rb ? ra - rb : b.xp - a.xp
  })

  return (
    <div style={{ padding: '32px 36px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: toast.ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,64,64,0.08)',
          border: `1px solid ${toast.ok ? 'rgba(0,230,118,0.3)' : 'rgba(255,64,64,0.2)'}`,
          color: toast.ok ? '#00e676' : '#ff6b6b',
          fontFamily: 'var(--font-jetbrains)', fontSize: 12,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>
          // members
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 24, letterSpacing: '-.03em', margin: '0 0 4px' }}>
          Members <span style={{ color: '#333', fontSize: 18 }}>({total})</span>
        </h1>

        {/* Role legend */}
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          {ROLES.map(r => (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11 }}>{ROLE_ICON[r.key]}</span>
              <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: r.color }}>{r.label}</span>
              <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#2a2a2a' }}>
                ({members.filter(m => m.role === r.key).length})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search members..."
          style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 8, color: '#888', fontFamily: 'var(--font-jetbrains)', fontSize: 11, padding: '9px 14px', outline: 'none', width: 260 }} />
      </div>

      {/* Table */}
      <div style={{ background: '#0a0a0a', border: '1px solid #141414', borderRadius: 14, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 120px 120px', padding: '10px 16px', borderBottom: '1px solid #141414', background: '#0d0d0d' }}>
          {['Member', 'Role', 'XP', 'Year', 'NFC', 'T-Shirt'].map(h => (
            <div key={h} style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#383838', letterSpacing: '.08em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>Loading...</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>No members yet</div>
        ) : sorted.map((m, i) => {
          const roleInfo = ROLE_MAP[m.role] ?? ROLE_MAP['member']
          return (
            <div key={m.id}>
              <div
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 120px 120px',
                  padding: '12px 16px', borderBottom: '1px solid #0f0f0f',
                  background: expanded === m.id ? '#0f0f0f' : i % 2 === 0 ? '#0a0a0a' : 'transparent',
                  alignItems: 'center', cursor: 'none', transition: 'background .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0e0e0e')}
                onMouseLeave={e => (e.currentTarget.style.background = expanded === m.id ? '#0f0f0f' : i % 2 === 0 ? '#0a0a0a' : 'transparent')}
              >
                {/* Name */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 12 }}>{ROLE_ICON[m.role] ?? '●'}</span>
                    <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: '#e0e0e0', fontSize: 13, letterSpacing: '-.01em' }}>
                      {m.first_name} {m.last_name}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#383838', marginTop: 2 }}>
                    {m.email}
                  </div>
                </div>

                {/* Role badge */}
                <div>
                  <span style={{
                    fontFamily: 'var(--font-jetbrains)', fontSize: 10, letterSpacing: '.04em',
                    color: roleInfo.color, background: roleInfo.bg,
                    padding: '3px 8px', borderRadius: 99,
                  }}>
                    {roleInfo.label}
                  </span>
                </div>

                {/* XP */}
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#CFFF00', fontSize: 14 }}>{m.xp}</div>

                {/* Year */}
                <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#555' }}>
                  {m.year === 1 ? '1st' : m.year === 2 ? '2nd' : '3rd'} · {m.section}
                </div>

                {/* NFC */}
                <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10,
                  color: m.nfc_written_at ? '#00e676' : m.encrypted_uid ? '#ff9800' : '#383838' }}>
                  {m.nfc_written_at ? 'Written ✓' : m.encrypted_uid ? 'UID ready' : 'Pending'}
                </div>

                {/* T-shirt */}
                <div>
                  <span style={{
                    fontFamily: 'var(--font-jetbrains)', fontSize: 10,
                    color: m.tshirt_dispatched ? '#00e676' : '#ff9800',
                    background: m.tshirt_dispatched ? 'rgba(0,230,118,0.08)' : 'rgba(255,152,0,0.08)',
                    padding: '3px 8px', borderRadius: 99,
                  }}>
                    {m.tshirt_dispatched ? `${m.tshirt_size} ✓` : m.tshirt_size}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === m.id && (
                <div style={{ padding: '16px 20px 20px', background: '#0c0c0c', borderBottom: '1px solid #0f0f0f' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                    {/* Links */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {m.linkedin && (
                        <a href={`https://linkedin.com/in/${m.linkedin}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#CFFF00', textDecoration: 'none' }}>
                          LinkedIn ↗
                        </a>
                      )}
                      {m.github && (
                        <a href={`https://github.com/${m.github}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#CFFF00', textDecoration: 'none' }}>
                          GitHub ↗
                        </a>
                      )}
                      <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#383838' }}>
                        Joined {new Date(m.created_at).toLocaleDateString('en-IN')}
                      </span>
                      {!m.tshirt_dispatched && (
                        <button onClick={e => { e.stopPropagation(); markTshirt(m.id) }}
                          disabled={actionLoading === m.id}
                          style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 7, color: '#00e676', fontFamily: 'var(--font-jetbrains)', fontSize: 11, padding: '5px 12px', cursor: 'none' }}>
                          Mark T-shirt Dispatched
                        </button>
                      )}
                    </div>

                    {/* Role assignment */}
                    <div>
                      <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                        Assign Role
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {ROLES.map(r => (
                          <button key={r.key}
                            onClick={e => { e.stopPropagation(); updateRole(m.id, r.key) }}
                            disabled={roleLoading === m.id || m.role === r.key}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 8, cursor: 'none',
                              border: `1px solid ${m.role === r.key ? r.color : '#1e1e1e'}`,
                              background: m.role === r.key ? r.bg : 'transparent',
                              fontFamily: 'var(--font-jetbrains)', fontSize: 10,
                              color: m.role === r.key ? r.color : '#444',
                              transition: 'all .2s',
                              opacity: roleLoading === m.id ? 0.5 : 1,
                            }}>
                            <span>{ROLE_ICON[r.key]}</span>
                            {r.label}
                            {m.role === r.key && <span style={{ color: r.color }}>✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
