'use client'

import { useEffect, useRef, useState } from 'react'

export default function AnalyticsPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const streamRef             = useRef<HTMLCanvasElement>(null)
  const yearRef               = useRef<HTMLCanvasElement>(null)
  const funnelRef             = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch('/api/backend/admin/analytics/overview')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!data) return
    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables)

      const defaults = {
        color: '#444',
        font: { family: 'var(--font-jetbrains)', size: 11 },
      }
      Chart.defaults.color           = defaults.color
      Chart.defaults.font.family     = defaults.font.family
      Chart.defaults.font.size       = defaults.font.size

      const gridColor  = 'rgba(255,255,255,0.04)'
      const accentFull = '#CFFF00'
      const accentDim  = 'rgba(207,255,0,0.25)'

      // Destroy existing before re-render
      const existing = Chart.instances
      Object.values(existing).forEach((c: any) => c.destroy())

      // ── Funnel chart ──
      if (funnelRef.current) {
        new Chart(funnelRef.current, {
          type: 'bar',
          data: {
            labels: ['Total', 'Pending', 'Approved', 'Rejected'],
            datasets: [{
              data: [
                data.applications.total,
                data.applications.pending,
                data.applications.approved,
                data.applications.rejected,
              ],
              backgroundColor: [
                'rgba(207,255,0,0.15)',
                'rgba(255,152,0,0.2)',
                'rgba(0,230,118,0.2)',
                'rgba(255,64,64,0.2)',
              ],
              borderColor: ['#CFFF00', '#ff9800', '#00e676', '#ff4040'],
              borderWidth: 1,
              borderRadius: 6,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: gridColor }, ticks: { color: '#555' } },
              y: { grid: { color: gridColor }, ticks: { color: '#555' }, beginAtZero: true },
            },
          },
        })
      }

      // ── Stream chart ──
      if (streamRef.current) {
        new Chart(streamRef.current, {
          type: 'doughnut',
          data: {
            labels: Object.keys(data.by_stream),
            datasets: [{
              data: Object.values(data.by_stream),
              backgroundColor: [
                'rgba(207,255,0,0.7)',
                'rgba(207,255,0,0.35)',
                'rgba(207,255,0,0.15)',
              ],
              borderColor: '#0d0d0d',
              borderWidth: 3,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#555', padding: 16, font: { size: 11 } },
              },
            },
            cutout: '68%',
          },
        })
      }

      // ── Year chart ──
      if (yearRef.current) {
        new Chart(yearRef.current, {
          type: 'bar',
          data: {
            labels: ['1st Year', '2nd Year', '3rd Year'],
            datasets: [{
              label: 'Applications',
              data: Object.values(data.by_year),
              backgroundColor: accentDim,
              borderColor: accentFull,
              borderWidth: 1,
              borderRadius: 6,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: gridColor }, ticks: { color: '#555' } },
              y: { grid: { color: gridColor }, ticks: { color: '#555' }, beginAtZero: true },
            },
          },
        })
      }
    })
  }, [data])

  if (loading) return (
    <div style={{padding:'32px 36px',color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>
      Loading analytics...
    </div>
  )

  const total = data?.applications?.total || 1

  return (
    <div style={{padding:'32px 36px', maxWidth:1100}}>
      <div style={{marginBottom:32}}>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:8}}>// analytics</div>
        <h1 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:24,letterSpacing:'-.03em',margin:0}}>
          Analytics
        </h1>
      </div>

      {/* Stat cards row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[
          {label:'Total',    value:data?.applications?.total,    color:'#CFFF00'},
          {label:'Pending',  value:data?.applications?.pending,  color:'#ff9800'},
          {label:'Approved', value:data?.applications?.approved, color:'#00e676'},
          {label:'Members',  value:data?.members,                color:'#CFFF00'},
        ].map(s => (
          <div key={s.label} style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:12,padding:'18px 20px'}}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>{s.label}</div>
            <div style={{fontFamily:'var(--font-syne)',fontWeight:800,fontSize:28,color:s.color,letterSpacing:'-.04em',lineHeight:1}}>{s.value ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>

        {/* Funnel */}
        <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:24}}>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>Application Funnel</div>
          <div style={{height:220}}>
            <canvas ref={funnelRef} />
          </div>
        </div>

        {/* Stream doughnut */}
        <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:24}}>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>By Stream</div>
          <div style={{height:220}}>
            <canvas ref={streamRef} />
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>

        {/* Year bar */}
        <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:24}}>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>By Year</div>
          <div style={{height:220}}>
            <canvas ref={yearRef} />
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:24}}>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>XP Leaderboard</div>
          {data?.leaderboard?.length === 0 ? (
            <div style={{color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>No members yet</div>
          ) : data?.leaderboard?.map((m: any, i: number) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12, marginBottom:10,
              padding:'8px 12px', borderRadius:8,
              background: i===0 ? 'rgba(207,255,0,0.04)' : 'transparent',
              border: i===0 ? '1px solid rgba(207,255,0,0.08)' : '1px solid transparent',
            }}>
              <div style={{
                width:24, height:24, borderRadius:'50%', flexShrink:0,
                background: i===0 ? 'rgba(207,255,0,0.12)' : '#111',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-syne)', fontWeight:800,
                color: i===0 ? '#CFFF00' : '#333', fontSize:11,
              }}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#e0e0e0',fontSize:13}}>
                  {m.first_name} {m.last_name}
                </div>
                {m.member_archetype && (
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#333'}}>{m.member_archetype}</div>
                )}
              </div>
              <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:16}}>{m.xp}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}