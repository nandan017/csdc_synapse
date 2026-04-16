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
  linkedin: string
  github: string
  created_at: string
}

export default function MembersPage() {
  const [members, setMembers]   = useState<Member[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<string|null>(null)
  const [actionLoading, setActionLoading] = useState<string|null>(null)
  const [toast, setToast]       = useState<string|null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(null),3000) }

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
    const res = await fetch(`/api/backend/admin/members/${id}/tshirt`, { method:'PATCH' })
    if (res.ok) { showToast('T-shirt marked as dispatched'); fetchMembers() }
    setActionLoading(null)
  }

  return (
    <div style={{padding:'32px 36px'}}>
      {toast && (
        <div style={{position:'fixed',top:20,right:20,zIndex:9999,padding:'12px 20px',borderRadius:10,background:'rgba(0,230,118,0.12)',border:'1px solid rgba(0,230,118,0.3)',color:'#00e676',fontFamily:'var(--font-jetbrains)',fontSize:12}}>
          {toast}
        </div>
      )}

      <div style={{marginBottom:24}}>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:8}}>// members</div>
        <h1 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:24,letterSpacing:'-.03em',margin:0}}>
          Members <span style={{color:'#333',fontSize:18}}>({total})</span>
        </h1>
      </div>

      <div style={{marginBottom:20}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search members..."
          style={{background:'#0d0d0d',border:'1px solid #1a1a1a',borderRadius:8,color:'#888',fontFamily:'var(--font-jetbrains)',fontSize:11,padding:'9px 14px',outline:'none',width:260}} />
      </div>

      <div style={{background:'#0a0a0a',border:'1px solid #141414',borderRadius:14,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 120px 100px 80px 80px 120px',padding:'10px 16px',borderBottom:'1px solid #141414',background:'#0d0d0d'}}>
          {['Member','Stream','XP','Year','T-Shirt','NFC'].map(h=>(
            <div key={h} style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.08em',textTransform:'uppercase'}}>{h}</div>
          ))}
        </div>
        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>Loading...</div>
        ) : members.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>No members yet</div>
        ) : members.map((m, i) => (
          <div key={m.id}>
            <div
              style={{display:'grid',gridTemplateColumns:'1fr 120px 100px 80px 80px 120px',padding:'12px 16px',borderBottom:'1px solid #0f0f0f',background:i%2===0?'#0a0a0a':'transparent',alignItems:'center',cursor:'none'}}
              onClick={()=>setExpanded(expanded===m.id?null:m.id)}
              onMouseEnter={e=>(e.currentTarget.style.background='#0e0e0e')}
              onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?'#0a0a0a':'transparent')}
            >
              <div>
                <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#e0e0e0',fontSize:13}}>{m.first_name} {m.last_name}</div>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',marginTop:2}}>{m.email}</div>
              </div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#555'}}>{m.stream}</div>
              <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:14}}>{m.xp}</div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#555'}}>{m.year} · {m.section}</div>
              <div>
                <span style={{
                  fontFamily:'var(--font-jetbrains)',fontSize:10,
                  color: m.tshirt_dispatched ? '#00e676' : '#ff9800',
                  background: m.tshirt_dispatched ? 'rgba(0,230,118,0.08)' : 'rgba(255,152,0,0.08)',
                  padding:'3px 8px',borderRadius:99,
                }}>
                  {m.tshirt_dispatched ? `${m.tshirt_size} ✓` : m.tshirt_size}
                </span>
              </div>
              <div>
                <span style={{
                  fontFamily:'var(--font-jetbrains)',fontSize:10,
                  color: m.encrypted_uid ? '#00e676' : '#383838',
                }}>
                  {m.encrypted_uid ? 'Assigned' : 'Pending'}
                </span>
              </div>
            </div>
            {expanded === m.id && (
              <div style={{padding:'16px 20px',background:'#0c0c0c',borderBottom:'1px solid #0f0f0f',display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
                <a href={`https://linkedin.com/in/${m.linkedin}`} target="_blank" rel="noopener noreferrer" style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#CFFF00',textDecoration:'none'}}>LinkedIn ↗</a>
                <a href={`https://github.com/${m.github}`} target="_blank" rel="noopener noreferrer" style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#CFFF00',textDecoration:'none'}}>GitHub ↗</a>
                <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838'}}>Joined {new Date(m.created_at).toLocaleDateString('en-IN')}</span>
                {!m.tshirt_dispatched && (
                  <button onClick={e=>{e.stopPropagation();markTshirt(m.id)}}
                    disabled={actionLoading===m.id}
                    style={{background:'rgba(0,230,118,0.08)',border:'1px solid rgba(0,230,118,0.2)',borderRadius:7,color:'#00e676',fontFamily:'var(--font-jetbrains)',fontSize:11,padding:'6px 14px',cursor:'none'}}>
                    Mark T-shirt Dispatched
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
