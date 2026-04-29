'use client'
import { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'

interface Application {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  year: number
  section: string
  stream: string
  linkedin: string
  github: string
  tshirt_size: string
  why_join: string
  suggestions: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  invite_sent_at: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending:  '#ff9800',
  approved: '#00e676',
  rejected: '#ff4040',
}

const STATUS_BG: Record<string, string> = {
  pending:  'rgba(255,152,0,0.08)',
  approved: 'rgba(0,230,118,0.08)',
  rejected: 'rgba(255,64,64,0.08)',
}

function ApplicationsContent() {
  const searchParams = useSearchParams()
  const [apps, setApps]           = useState<Application[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [expanded, setExpanded]   = useState<string|null>(null)
  const [actionLoading, setActionLoading] = useState<string|null>(null)
  const [toast, setToast]         = useState<{msg:string;type:'ok'|'err'}|null>(null)

  // Filters
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [stream, setStream] = useState('')
  const [year,   setYear]   = useState('')
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(0)
  const [confirmAction, setConfirmAction] = useState<{id:string; name:string; action:'approved'|'rejected'}|null>(null)
  const LIMIT = 20

  const showToast = (msg: string, type: 'ok'|'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchApps = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (stream) params.set('stream', stream)
    if (year)   params.set('year', year)
    if (search) params.set('search', search)
    params.set('limit', String(LIMIT))
    params.set('offset', String(page * LIMIT))

    const res = await authFetch(`/api/backend/admin/applications?${params}`)
    const data = await res.json()
    setApps(data.data || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [status, stream, year, search, page])

  useEffect(() => { fetchApps() }, [fetchApps])

  const doAction = async (id: string, action: 'approved'|'rejected') => {
    setActionLoading(id)
    const res = await authFetch(`/api/backend/admin/applications/${id}`, {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status: action }),
    })
    if (res.ok) {
      showToast(`Application ${action}`)
      fetchApps()
    } else {
      showToast('Action failed', 'err')
    }
    setActionLoading(null)
  }

  const sendInvite = async (id: string) => {
    setActionLoading(id + '_invite')
    const res = await authFetch(`/api/backend/admin/applications/${id}/invite`, { method:'POST' })
    if (res.ok) {
      showToast('Invite sent ✓')
      fetchApps()
    } else {
      const d = await res.json().catch(()=>({}))
      showToast(d.detail || 'Failed to send invite', 'err')
    }
    setActionLoading(null)
  }

  const bulkAction = async (action: 'approved'|'rejected') => {
    for (const id of Array.from(selected)) await doAction(id, action)
    setSelected(new Set())
  }

  const bulkInvite = async () => {
    const ids = Array.from(selected)
    setActionLoading('bulk')
    const res = await authFetch('/api/backend/admin/applications/bulk-invite', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ application_ids: ids }),
    })
    if (res.ok) showToast(`Invites sent to ${ids.length} applicants`)
    else showToast('Bulk invite failed', 'err')
    setActionLoading(null)
    setSelected(new Set())
    fetchApps()
  }

  const toggleSelect = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const toggleAll = () => {
    if (selected.size === apps.length) setSelected(new Set())
    else setSelected(new Set(apps.map(a => a.id)))
  }
  const exportCSV = () => {
  const headers = ['Name','Email','Phone','Year','Section','Stream','T-Shirt','Status','Applied','Why Join']
  const rows = apps.map(a => [
    `${a.first_name} ${a.last_name}`,
    a.email, a.phone,
    a.year, a.section, a.stream,
    a.tshirt_size, a.status,
    new Date(a.created_at).toLocaleDateString('en-IN'),
    `"${a.why_join.replace(/"/g,'""')}"`,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], {type:'text/csv'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `applications_${Date.now()}.csv`
  a.click(); URL.revokeObjectURL(url)
}

  return (
    <div style={{padding:'32px 36px'}}>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:9999,
          padding:'12px 20px', borderRadius:10,
          background: toast.type==='ok' ? 'rgba(0,230,118,0.12)' : 'rgba(255,64,64,0.12)',
          border: `1px solid ${toast.type==='ok' ? 'rgba(0,230,118,0.3)' : 'rgba(255,64,64,0.3)'}`,
          color: toast.type==='ok' ? '#00e676' : '#ff6b6b',
          fontFamily:'var(--font-jetbrains)', fontSize:12,
          animation:'fadeIn .2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:24, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12}}>
        <div>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:8}}>// applications</div>
          <h1 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:24,letterSpacing:'-.03em',margin:0}}>
            Applications <span style={{color:'#333',fontSize:18}}>({total})</span>
          </h1>
        </div>
        {selected.size > 0 && (
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#555'}}>{selected.size} selected</span>
            <button onClick={()=>bulkAction('approved')} style={bulkBtnStyle('#00e676')}>Approve All</button>
            <button onClick={()=>bulkAction('rejected')} style={bulkBtnStyle('#ff4040')}>Reject All</button>
            <button onClick={bulkInvite} disabled={actionLoading==='bulk'} style={bulkBtnStyle('#CFFF00','#000')}>
              {actionLoading==='bulk' ? 'Sending...' : 'Send Invites'}
            </button>
          </div>
        )}
        <button onClick={exportCSV}
  style={{background:'transparent',border:'1px solid #1e1e1e',borderRadius:7,color:'#444',fontFamily:'var(--font-jetbrains)',fontSize:11,padding:'8px 14px',cursor:'none'}}>
  Export CSV ↓
</button>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}
          placeholder="Search name or email..."
          style={filterInputStyle} />
        <select value={status} onChange={e=>{setStatus(e.target.value);setPage(0)}} style={filterSelectStyle}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={stream} onChange={e=>{setStream(e.target.value);setPage(0)}} style={filterSelectStyle}>
          <option value="">All Streams</option>
          <option value="BCA">BCA</option>
          <option value="BCom">BCom</option>
          <option value="BBA">BBA</option>
        </select>
        <select value={year} onChange={e=>{setYear(e.target.value);setPage(0)}} style={filterSelectStyle}>
          <option value="">All Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
        </select>
      </div>

      {/* Table */}
      <div style={{background:'#0a0a0a',border:'1px solid #141414',borderRadius:14,overflow:'hidden'}}>

        {/* Table header */}
        <div style={{
          display:'grid', gridTemplateColumns:'36px 1fr 140px 80px 80px 120px 160px',
          padding:'10px 16px', borderBottom:'1px solid #141414',
          background:'#0d0d0d',
        }}>
          <input type="checkbox"
            checked={selected.size === apps.length && apps.length > 0}
            onChange={toggleAll}
            style={{accentColor:'#CFFF00',cursor:'none',width:14,height:14}}
          />
          {['Applicant','Stream','Year','Status','Applied','Actions'].map(h => (
            <div key={h} style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.08em',textTransform:'uppercase'}}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{padding:'40px',textAlign:'center',color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>Loading...</div>
        ) : apps.length === 0 ? (
          <div style={{padding:'60px',textAlign:'center',color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>
            No applications found
          </div>
        ) : apps.map((app, i) => (
          <div key={app.id}>
            {/* Row */}
            <div
              style={{
                display:'grid', gridTemplateColumns:'36px 1fr 140px 80px 80px 120px 160px',
                padding:'12px 16px', borderBottom:'1px solid #0f0f0f',
                background: expanded===app.id ? '#0f0f0f' : i%2===0 ? '#0a0a0a' : 'transparent',
                alignItems:'center', transition:'background .15s',
              }}
              onMouseEnter={e=>(e.currentTarget.style.background='#0e0e0e')}
              onMouseLeave={e=>(e.currentTarget.style.background=expanded===app.id?'#0f0f0f':i%2===0?'#0a0a0a':'transparent')}
            >
              <input type="checkbox"
                checked={selected.has(app.id)}
                onChange={()=>toggleSelect(app.id)}
                style={{accentColor:'#CFFF00',cursor:'none',width:14,height:14}}
                onClick={e=>e.stopPropagation()}
              />
              {/* Name + email */}
              <div style={{cursor:'none'}} onClick={()=>setExpanded(expanded===app.id?null:app.id)}>
                <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#e0e0e0',fontSize:13,letterSpacing:'-.01em'}}>
                  {app.first_name} {app.last_name}
                </div>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',marginTop:2}}>{app.email}</div>
              </div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#555'}}>{app.stream}</div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#555'}}>{app.year === 1 ? '1st' : app.year === 2 ? '2nd' : '3rd'} · {app.section}</div>
              <div>
                <span style={{
                  fontFamily:'var(--font-jetbrains)',fontSize:10,letterSpacing:'.04em',
                  color:STATUS_COLORS[app.status], background:STATUS_BG[app.status],
                  padding:'3px 8px',borderRadius:99,
                }}>
                  {app.status}
                </span>
              </div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#2a2a2a'}}>
                {new Date(app.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
              </div>
              {/* Action buttons */}
              <div style={{display:'flex',gap:5}}>
                {app.status === 'pending' && (
  <>
    <button onClick={()=>setConfirmAction({id:app.id, name:`${app.first_name} ${app.last_name}`, action:'approved'})}
      style={actionBtnStyle('#00e676')}>✓</button>
    <button onClick={()=>setConfirmAction({id:app.id, name:`${app.first_name} ${app.last_name}`, action:'rejected'})}
      style={actionBtnStyle('#ff4040')}>✕</button>
  </>
)}
{app.status === 'approved' && (
  <>
    <button onClick={()=>sendInvite(app.id)}
      disabled={actionLoading===app.id+'_invite'}
      style={actionBtnStyle('#CFFF00','#000')}>
      {app.invite_sent_at ? 'Resend' : 'Invite'}
    </button>
    <button onClick={()=>setConfirmAction({id:app.id, name:`${app.first_name} ${app.last_name}`, action:'rejected'})}
      style={actionBtnStyle('#383838')}>✕</button>
  </>
)}
{app.status === 'rejected' && (
  <button onClick={()=>setConfirmAction({id:app.id, name:`${app.first_name} ${app.last_name}`, action:'approved'})}
    style={actionBtnStyle('#555')}>↩</button>
)}
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === app.id && (
              <div style={{
                padding:'20px 52px', background:'#0c0c0c',
                borderBottom:'1px solid #0f0f0f',
                display:'grid', gridTemplateColumns:'1fr 1fr', gap:20,
              }}>
                <div>
                  <DetailRow label="Phone"    value={app.phone} />
                  <DetailRow label="T-Shirt"  value={app.tshirt_size} />
                  <DetailRow label="LinkedIn" value={app.linkedin} link={`https://linkedin.com/in/${app.linkedin}`} />
                  <DetailRow label="GitHub"   value={app.github}   link={`https://github.com/${app.github}`} />
                  {app.invite_sent_at && (
                    <DetailRow label="Invite Sent" value={new Date(app.invite_sent_at).toLocaleString('en-IN')} />
                  )}
                </div>
                <div>
                  <div style={{marginBottom:14}}>
                    <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6}}>Why they want to join</div>
                    <p style={{color:'#666',fontSize:13,lineHeight:1.7,margin:0}}>{app.why_join}</p>
                  </div>
                  {app.suggestions && (
                    <div>
                      <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6}}>Suggestions</div>
                      <p style={{color:'#555',fontSize:13,lineHeight:1.7,margin:0}}>{app.suggestions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16}}>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#383838'}}>
            Showing {page*LIMIT+1}–{Math.min((page+1)*LIMIT,total)} of {total}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={pageBtnStyle}>← Prev</button>
            <button onClick={()=>setPage(p=>p+1)} disabled={(page+1)*LIMIT>=total} style={pageBtnStyle}>Next →</button>
          </div>
        </div>
      )}
      {/* Confirm dialog */}
{confirmAction && (
  <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{background:'#0f0f0f',border:'1px solid #222',borderRadius:16,padding:28,maxWidth:380,width:'100%',margin:'0 24px'}}>
      <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:16,marginBottom:8}}>
        {confirmAction.action === 'approved' ? 'Approve' : 'Reject'} applicant?
      </div>
      <div style={{fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#555',marginBottom:24}}>
        <span style={{color:confirmAction.action==='approved'?'#00e676':'#ff4040'}}>{confirmAction.name}</span> will be marked as <span style={{color:confirmAction.action==='approved'?'#00e676':'#ff4040'}}>{confirmAction.action}</span>.
      </div>
      <div style={{display:'flex',gap:10}}>
        <button
          onClick={async()=>{await doAction(confirmAction.id, confirmAction.action);setConfirmAction(null)}}
          style={{
            flex:1,padding:'10px',borderRadius:8,border:'none',cursor:'none',
            fontFamily:'var(--font-syne)',fontWeight:800,fontSize:13,
            background:confirmAction.action==='approved'?'#00e676':'#ff4040',
            color:'#000',
          }}>
          Confirm
        </button>
        <button onClick={()=>setConfirmAction(null)}
          style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #222',background:'transparent',cursor:'none',fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#555'}}>
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
    </div>
    
  )
}

function DetailRow({ label, value, link }: { label:string; value:string; link?:string }) {
  return (
    <div style={{display:'flex',gap:10,marginBottom:8,alignItems:'baseline'}}>
      <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.06em',textTransform:'uppercase',minWidth:80,flexShrink:0}}>{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer"
          style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#CFFF00',textDecoration:'none'}}>
          {value} ↗
        </a>
      ) : (
        <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#666'}}>{value}</span>
      )}
      
    </div>
  )
}

// Styles
const filterInputStyle: React.CSSProperties = {
  background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:8,
  color:'#888', fontFamily:'var(--font-jetbrains)', fontSize:11,
  padding:'9px 14px', outline:'none', width:220,
}
const filterSelectStyle: React.CSSProperties = {
  background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:8,
  color:'#555', fontFamily:'var(--font-jetbrains)', fontSize:11,
  padding:'9px 12px', outline:'none', cursor:'none',
  WebkitAppearance:'none',
}
const actionBtnStyle = (color: string, textColor = color): React.CSSProperties => ({
  background:'transparent', border:`1px solid ${color}22`,
  borderRadius:6, color, fontFamily:'var(--font-jetbrains)',
  fontSize:10, padding:'5px 10px', cursor:'none',
  transition:'all .15s',
})
const bulkBtnStyle = (bg: string, text = '#fff'): React.CSSProperties => ({
  background:bg, border:'none', borderRadius:7,
  color:text, fontFamily:'var(--font-jetbrains)',
  fontSize:11, padding:'8px 14px', cursor:'none',
  fontWeight:700,
})
const pageBtnStyle: React.CSSProperties = {
  background:'#0d0d0d', border:'1px solid #1a1a1a',
  borderRadius:7, color:'#555',
  fontFamily:'var(--font-jetbrains)', fontSize:11,
  padding:'7px 14px', cursor:'none',
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div style={{padding:40,color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>Loading...</div>}>
      <ApplicationsContent />
    </Suspense>
  )
}