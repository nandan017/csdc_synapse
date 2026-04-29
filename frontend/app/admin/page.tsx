'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'

interface Overview {
  applications: { total:number; pending:number; approved:number; rejected:number }
  members:   number
  workshops: number
  by_stream: Record<string,number>
  by_year:   Record<string,number>
  leaderboard: { first_name:string; last_name:string; xp:number; member_archetype:string|null }[]
}

export default function AdminOverview() {
  const [data, setData]       = useState<Overview|null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/backend/admin/analytics/overview')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const statCards = data ? [
    { label:'Total Applications', value: data.applications.total,    color:'#CFFF00', sub: 'all time' },
    { label:'Pending Review',     value: data.applications.pending,  color:'#ff9800', sub: 'awaiting action' },
    { label:'Approved',           value: data.applications.approved, color:'#00e676', sub: 'ready to invite' },
    { label:'Active Members',     value: data.members,               color:'#CFFF00', sub: 'onboarded' },
    { label:'Workshops Run',      value: data.workshops,             color:'#888',    sub: 'total' },
    { label:'Rejected',           value: data.applications.rejected, color:'#ff4040', sub: 'not selected' },
  ] : []

  return (
    <div style={{padding:'32px 36px', maxWidth:1200}}>

      {/* Header */}
      <div style={{marginBottom:32}}>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:8}}>
          // admin panel
        </div>
        <h1 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:28,letterSpacing:'-.03em',margin:0}}>
          Overview
        </h1>
        <p style={{color:'#444',fontSize:13,marginTop:6,fontFamily:'var(--font-jetbrains)'}}>
          {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
        </p>
      </div>

      {loading ? (
        <div style={{color:'#333',fontFamily:'var(--font-jetbrains)',fontSize:12}}>Loading...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:32}}>
            {statCards.map(s => (
              <div key={s.label} style={{
                background:'#0d0d0d', border:'1px solid #161616',
                borderRadius:14, padding:'20px 22px',
              }}>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>{s.label}</div>
                <div style={{fontFamily:'var(--font-syne)',fontWeight:800,fontSize:32,color:s.color,letterSpacing:'-.04em',lineHeight:1}}>{s.value}</div>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#2a2a2a',marginTop:6}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Bottom grid */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>

            {/* Stream breakdown */}
            <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:'20px 22px'}}>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>By Stream</div>
              {data && Object.entries(data.by_stream).map(([stream, count]) => (
                <div key={stream} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#888'}}>{stream}</span>
                    <span style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#CFFF00',fontSize:13}}>{count}</span>
                  </div>
                  <div style={{height:3,background:'#161616',borderRadius:2,overflow:'hidden'}}>
                    <div style={{
                      height:'100%',borderRadius:2,background:'#CFFF00',
                      width: data.applications.total ? `${(count/data.applications.total)*100}%` : '0%',
                      transition:'width .5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Year breakdown */}
            <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:'20px 22px'}}>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>By Year</div>
              {data && Object.entries(data.by_year).map(([year, count]) => (
                <div key={year} style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#888'}}>{year === '1' ? '1st Year' : year === '2' ? '2nd Year' : '3rd Year'}</span>
                    <span style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#CFFF00',fontSize:13}}>{count}</span>
                  </div>
                  <div style={{height:3,background:'#161616',borderRadius:2,overflow:'hidden'}}>
                    <div style={{
                      height:'100%',borderRadius:2,background:'rgba(207,255,0,0.6)',
                      width: data.applications.total ? `${(count/data.applications.total)*100}%` : '0%',
                      transition:'width .5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Leaderboard */}
            <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:'20px 22px'}}>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>Top XP</div>
              {data && data.leaderboard.length === 0 && (
                <div style={{color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:11}}>No members yet</div>
              )}
              {data && data.leaderboard.map((m, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{
                    width:24,height:24,borderRadius:'50%',
                    background: i===0?'rgba(207,255,0,0.15)':'#111',
                    border:`1px solid ${i===0?'rgba(207,255,0,0.3)':'#1e1e1e'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontFamily:'var(--font-syne)',fontWeight:800,
                    fontSize:10,color:i===0?'#CFFF00':'#333',flexShrink:0,
                  }}>{i+1}</div>
                  <div style={{flex:1,overflow:'hidden'}}>
                    <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {m.first_name} {m.last_name}
                    </div>
                    {m.member_archetype && (
                      <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#333'}}>{m.member_archetype}</div>
                    )}
                  </div>
                  <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:13,flexShrink:0}}>{m.xp}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{marginTop:14,display:'flex',gap:10}}>
            <Link href="/admin/applications?status=pending" style={{
              fontFamily:'var(--font-jetbrains)',fontSize:11,
              color:'#000',background:'#CFFF00',
              padding:'10px 18px',borderRadius:8,textDecoration:'none',
              letterSpacing:'.02em',fontWeight:700,
            }}>
              Review Pending ({data?.applications.pending ?? 0}) →
            </Link>
            <Link href="/admin/applications" style={{
              fontFamily:'var(--font-jetbrains)',fontSize:11,
              color:'#555',border:'1px solid #1e1e1e',
              padding:'10px 18px',borderRadius:8,textDecoration:'none',
              letterSpacing:'.02em',
            }}>
              All Applications
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
