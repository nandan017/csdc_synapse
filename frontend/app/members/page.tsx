'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Cursor from '@/components/Cursor'

interface Member {
  id: string
  first_name: string
  last_name: string
  stream: string
  year: number
  section: string
  bio: string
  skills: string[]
  avatar_url: string | null
  xp: number
  member_archetype: string | null
  github: string
  linkedin: string
  encrypted_uid: string | null
}

const STREAMS = ['All', 'BCA', 'BCom', 'BBA']
const YEARS   = ['All', '1st', '2nd', '3rd']

export default function MembersDirectory() {
  const [members,   setMembers]   = useState<Member[]>([])
  const [loading,   setLoading]   = useState(true)
  const [stream,    setStream]    = useState('All')
  const [year,      setYear]      = useState('All')
  const [search,    setSearch]    = useState('')
  const [skill,     setSkill]     = useState('')
  const [myId,      setMyId]      = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) return
      sb.from('members').select('id').eq('auth_user_id', data.user.id).single()
        .then(({ data: m }) => { if (m) setMyId(m.id) })
    })
  }, [])

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    let q = sb.from('members')
      .select('id, first_name, last_name, stream, year, section, bio, skills, avatar_url, xp, member_archetype, github, linkedin, encrypted_uid')
      .eq('is_alumni', false)
      .order('xp', { ascending: false })

    if (stream !== 'All') q = q.eq('stream', stream)
    if (year   !== 'All') q = q.eq('year', YEARS.indexOf(year))
    if (search)           q = q.ilike('first_name', `%${search}%`)

    const { data } = await q
    let filtered = data || []

    if (skill.trim()) {
      const s = skill.toLowerCase()
      filtered = filtered.filter(m => m.skills?.some((sk: string) => sk.toLowerCase().includes(s)))
    }

    setMembers(filtered)
    setLoading(false)
  }, [stream, year, search, skill])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const initials = (m: Member) => `${m.first_name[0]}${m.last_name[0]}`

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#e0e0e0', fontFamily: 'var(--font-dm-sans)', cursor: 'none' }}>
      <style>{`
        body { background:#080808; cursor:none; }
        ::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-thumb { background:#CFFF00; border-radius:2px }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .member-card {
          background:#0d0d0d; border:1px solid #161616; border-radius:16px;
          padding:20px; transition:all .22s; display:flex; flex-direction:column; gap:12px;
        }
        .member-card:hover { border-color:rgba(207,255,0,0.2); transform:translateY(-2px); background:rgba(207,255,0,0.02); }
        @media (pointer: coarse) { body { cursor: auto !important; } * { cursor: auto !important; } }
        @media (max-width: 768px) {
          .m-nav { padding: 12px 16px !important; }
          .m-content { padding: 24px 16px !important; }
          .m-grid { grid-template-columns: 1fr !important; }
          .m-nav-right { gap: 8px !important; }
        }
        @media (max-width: 480px) {
          .m-filters { flex-direction: column !important; align-items: stretch !important; }
          .m-filters input { width: 100% !important; margin-left: 0 !important; }
        }
      `}</style>

      <Cursor />

      {/* Navbar */}
      <nav className="m-nav" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #111', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 14, letterSpacing: '-.02em' }}>Chathurya</span>
        </Link>
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#666', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Member Directory
        </div>
        <div className="m-nav-right" style={{ display: 'flex', gap: 12 }}>
          {myId && (
            <Link href="/connect" style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#CFFF00', textDecoration: 'none', border: '1px solid rgba(207,255,0,0.2)', padding: '6px 14px', borderRadius: 7 }}>
              🃏 Tap to Connect
            </Link>
          )}
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#666', textDecoration: 'none', border: '1px solid #1e1e1e', padding: '6px 14px', borderRadius: 7 }}>
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="m-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36, animation: 'fadeUp .5s ease' }}>
          <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10 }}>
            {members.length} Member{members.length !== 1 ? 's' : ''}
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 'clamp(2rem,5vw,3.5rem)', letterSpacing: '-.05em', lineHeight: .9, margin: '0 0 10px' }}>
            The community.
          </h1>
          <p style={{ color: '#555', fontSize: 14, lineHeight: 1.75, maxWidth: 440 }}>
            Every builder, thinker and maker in Chathurya. Tap a card to connect.
          </p>
        </div>

        {/* Filters */}
        <div className="m-filters" style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Stream */}
          <div style={{ display: 'flex', gap: 5 }}>
            {STREAMS.map(s => (
              <button key={s} onClick={() => setStream(s)} style={{
                background: stream === s ? 'rgba(207,255,0,0.08)' : 'transparent',
                border: `1px solid ${stream === s ? 'rgba(207,255,0,0.25)' : '#1e1e1e'}`,
                borderRadius: 7, color: stream === s ? '#CFFF00' : '#444',
                fontFamily: 'var(--font-jetbrains)', fontSize: 11,
                padding: '6px 12px', cursor: 'none', transition: 'all .2s',
              }}>{s}</button>
            ))}
          </div>

          {/* Year */}
          <div style={{ display: 'flex', gap: 5 }}>
            {YEARS.map(y => (
              <button key={y} onClick={() => setYear(y)} style={{
                background: year === y ? 'rgba(207,255,0,0.08)' : 'transparent',
                border: `1px solid ${year === y ? 'rgba(207,255,0,0.25)' : '#1e1e1e'}`,
                borderRadius: 7, color: year === y ? '#CFFF00' : '#444',
                fontFamily: 'var(--font-jetbrains)', fontSize: 11,
                padding: '6px 12px', cursor: 'none', transition: 'all .2s',
              }}>{y}</button>
            ))}
          </div>

          {/* Skill search */}
          <input value={skill} onChange={e => setSkill(e.target.value)}
            placeholder="Filter by skill..."
            style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 8, color: '#888', fontFamily: 'var(--font-jetbrains)', fontSize: 11, padding: '7px 12px', outline: 'none', width: 160 }} />

          {/* Name search */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name..."
            style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 8, color: '#888', fontFamily: 'var(--font-jetbrains)', fontSize: 11, padding: '7px 12px', outline: 'none', width: 160, marginLeft: 'auto' }} />
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#666', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>Loading...</div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 36, marginBottom: 16, opacity: .3 }}>◉</div>
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 12, color: '#666' }}>No members match your filter</div>
          </div>
        ) : (
          <div className="m-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {members.map((m, i) => (
              <div key={m.id} className="member-card" style={{ animationDelay: `${i * 0.04}s` }}>

                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#CFFF00,#a8cc00)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#000', fontSize: 15,
                    overflow: 'hidden',
                    boxShadow: m.id === myId ? '0 0 0 2px #CFFF00' : 'none',
                  }}>
                    {m.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initials(m)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: m.id === myId ? '#CFFF00' : '#fff', fontSize: 14, letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.first_name} {m.last_name}
                      {m.id === myId && <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 8, color: '#CFFF00', marginLeft: 6 }}>(you)</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#777', marginTop: 2, letterSpacing: '.04em' }}>
                      {m.member_archetype ?? m.stream} · {m.year === 1 ? '1st' : m.year === 2 ? '2nd' : '3rd'} Year · {m.section}
                    </div>
                  </div>

                  <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#CFFF00', fontSize: 14, flexShrink: 0 }}>
                    {m.xp}<span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 8, color: '#666', marginLeft: 2 }}>XP</span>
                  </div>
                </div>

                {/* Bio */}
                {m.bio && (
                  <p style={{ color: '#777', fontSize: 12, lineHeight: 1.65, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.bio}
                  </p>
                )}

                {/* Skills */}
                {m.skills && m.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {m.skills.slice(0, 4).map(s => (
                      <span key={s} style={{
                        fontFamily: 'var(--font-jetbrains)', fontSize: 9,
                        color: skill && s.toLowerCase().includes(skill.toLowerCase()) ? '#CFFF00' : '#777',
                        border: `1px solid ${skill && s.toLowerCase().includes(skill.toLowerCase()) ? 'rgba(207,255,0,0.3)' : '#1a1a1a'}`,
                        padding: '2px 8px', borderRadius: 99, transition: 'all .2s',
                      }}>{s}</span>
                    ))}
                    {m.skills.length > 4 && <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#666' }}>+{m.skills.length - 4}</span>}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  {m.encrypted_uid && (
                    <Link href={`/u/${m.encrypted_uid}`} target="_blank"
                      style={{ flex: 1, textAlign: 'center', padding: '7px', background: 'rgba(207,255,0,0.04)', border: '1px solid rgba(207,255,0,0.12)', borderRadius: 8, color: '#CFFF00', fontFamily: 'var(--font-jetbrains)', fontSize: 10, textDecoration: 'none', transition: 'all .2s' }}>
                      View Profile ↗
                    </Link>
                  )}
                  {m.github && (
                    <a href={`https://github.com/${m.github}`} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '7px 12px', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 8, color: '#666', fontFamily: 'var(--font-jetbrains)', fontSize: 10, textDecoration: 'none' }}>
                      GH
                    </a>
                  )}
                  {m.linkedin && (
                    <a href={`https://linkedin.com/in/${m.linkedin}`} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '7px 12px', background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 8, color: '#666', fontFamily: 'var(--font-jetbrains)', fontSize: 10, textDecoration: 'none' }}>
                      LI
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
