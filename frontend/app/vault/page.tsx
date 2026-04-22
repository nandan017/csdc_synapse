'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Resource {
  id: string
  title: string
  description: string
  category: string
  url: string
  tags: string[]
  view_count: number
  created_at: string
  members?: { first_name: string; last_name: string }
}

const CATEGORIES = [
  { key: 'all',       label: 'All',        icon: '◈' },
  { key: 'workshop',  label: 'Workshops',  icon: '⚡' },
  { key: 'project',   label: 'Projects',   icon: '🔨' },
  { key: 'tool',      label: 'Tools',      icon: '🛠' },
  { key: 'reference', label: 'References', icon: '📚' },
  { key: 'template',  label: 'Templates',  icon: '📋' },
]

const CAT_COLOR: Record<string, string> = {
  workshop:  'rgba(207,255,0,0.12)',
  project:   'rgba(0,230,118,0.1)',
  tool:      'rgba(100,180,255,0.1)',
  reference: 'rgba(255,152,0,0.1)',
  template:  'rgba(200,100,255,0.1)',
}

export default function VaultPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading,   setLoading]   = useState(true)
  const [category,  setCategory]  = useState('all')
  const [search,    setSearch]    = useState('')

  const fetchResources = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category !== 'all') params.set('category', category)
    if (search)             params.set('search', search)
    const res = await fetch(`/api/backend/vault/?${params}`)
    const data = await res.json()
    setResources(data.data || [])
    setLoading(false)
  }, [category, search])

  useEffect(() => { fetchResources() }, [fetchResources])

  const handleResourceClick = async (r: Resource) => {
    // Fire-and-forget view count increment
    fetch(`/api/backend/vault/${r.id}`)
    window.open(r.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080808', color: '#e0e0e0',
      fontFamily: 'var(--font-dm-sans)', cursor: 'none',
    }}>
      <style>{`
        body{background:#080808;cursor:none}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#CFFF00;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .resource-card{
          background:#0d0d0d;border:1px solid #161616;border-radius:14px;
          padding:20px;cursor:none;transition:all .2s;
          display:flex;flex-direction:column;gap:10px;
        }
        .resource-card:hover{border-color:rgba(207,255,0,0.18);transform:translateY(-2px);background:rgba(207,255,0,0.02)}
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #111', padding: '14px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 14, letterSpacing: '-.02em' }}>Chathurya</span>
        </Link>
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#333', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Resource Vault
        </div>
        <Link href="/dashboard" style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#444', textDecoration: 'none', border: '1px solid #1e1e1e', padding: '6px 14px', borderRadius: 7, transition: 'all .2s' }}
          onMouseEnter={(e: any) => { e.currentTarget.style.color = '#CFFF00'; e.currentTarget.style.borderColor = 'rgba(207,255,0,0.2)' }}
          onMouseLeave={(e: any) => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = '#1e1e1e' }}>
          Dashboard
        </Link>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40, animation: 'fadeUp .6s ease' }}>
          <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10 }}>
            Member Resource Vault
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 'clamp(2rem,5vw,3.5rem)', letterSpacing: '-.05em', lineHeight: .9, margin: '0 0 12px' }}>
            Knowledge left<br /><span style={{ color: '#CFFF00' }}>by seniors.</span>
          </h1>
          <p style={{ color: '#555', fontSize: 14, lineHeight: 1.75, maxWidth: 480 }}>
            Workshop materials, project starters, tools and references — curated by Chathurya leads and alumni.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 28, marginBottom: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCategory(c.key)}
                style={{
                  background: category === c.key ? 'rgba(207,255,0,0.08)' : 'transparent',
                  border: `1px solid ${category === c.key ? 'rgba(207,255,0,0.25)' : '#1e1e1e'}`,
                  borderRadius: 8, color: category === c.key ? '#CFFF00' : '#444',
                  fontFamily: 'var(--font-jetbrains)', fontSize: 11,
                  padding: '7px 14px', cursor: 'none', transition: 'all .2s',
                }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search resources..."
            style={{
              marginLeft: 'auto', background: '#0d0d0d',
              border: '1px solid #1a1a1a', borderRadius: 9,
              color: '#888', fontFamily: 'var(--font-jetbrains)',
              fontSize: 11, padding: '8px 14px', outline: 'none', width: 220,
            }}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12, padding: 40, textAlign: 'center' }}>
            Loading vault...
          </div>
        ) : resources.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 16, opacity: .3 }}>📦</div>
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 12, color: '#2a2a2a' }}>
              {search || category !== 'all' ? 'No resources match your filter.' : 'Vault is empty — leads can add resources from the admin panel.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {resources.map((r, i) => (
              <div key={r.id} className="resource-card"
                onClick={() => handleResourceClick(r)}
                style={{ animationDelay: `${i * 0.05}s` }}>

                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--font-jetbrains)', fontSize: 9,
                    letterSpacing: '.08em', textTransform: 'uppercase',
                    padding: '3px 9px', borderRadius: 99,
                    background: CAT_COLOR[r.category] ?? 'rgba(255,255,255,0.05)',
                    color: '#888',
                  }}>
                    {r.category}
                  </span>
                  <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#2a2a2a' }}>
                    {r.view_count} views
                  </span>
                </div>

                {/* Title */}
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: '#fff', fontSize: 14, letterSpacing: '-.02em', lineHeight: 1.3 }}>
                  {r.title}
                </div>

                {/* Description */}
                <p style={{ color: '#484848', fontSize: 12, lineHeight: 1.7, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {r.description}
                </p>

                {/* Tags */}
                {r.tags && r.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {r.tags.slice(0, 4).map(tag => (
                      <span key={tag} style={{
                        fontFamily: 'var(--font-jetbrains)', fontSize: 9,
                        color: '#383838', border: '1px solid #1a1a1a',
                        padding: '2px 8px', borderRadius: 99,
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#2a2a2a' }}>
                    {r.members ? `${r.members.first_name} ${r.members.last_name}` : 'Chathurya SDC'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00' }}>
                    Open ↗
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
