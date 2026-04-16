'use client'

import { useEffect, useState } from 'react'

interface Workshop {
  id: string
  title: string
  description: string
  scheduled_at: string
  location: string
  xp_for_attend: number
  late_penalty: number
  is_active: boolean
}

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [toast, setToast]         = useState<string|null>(null)
  const [form, setForm]           = useState({
    title:'', description:'', scheduled_at:'',
    location:'', xp_for_attend:50, late_penalty:10,
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(null),3000) }

  const fetchWorkshops = async () => {
    setLoading(true)
    const res = await fetch('/api/backend/admin/workshops')
    const data = await res.json()
    setWorkshops(data.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchWorkshops() }, [])

  const createWorkshop = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/backend/admin/workshops', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form),
    })
    if (res.ok) {
      showToast('Workshop created')
      setCreating(false)
      setForm({title:'',description:'',scheduled_at:'',location:'',xp_for_attend:50,late_penalty:10})
      fetchWorkshops()
    } else showToast('Failed to create')
  }

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/backend/admin/workshops/${id}/activate?active=${!active}`, { method:'PATCH' })
    fetchWorkshops()
  }

  return (
    <div style={{padding:'32px 36px'}}>
      {toast && (
        <div style={{position:'fixed',top:20,right:20,zIndex:9999,padding:'12px 20px',borderRadius:10,background:'rgba(0,230,118,0.12)',border:'1px solid rgba(0,230,118,0.3)',color:'#00e676',fontFamily:'var(--font-jetbrains)',fontSize:12}}>
          {toast}
        </div>
      )}

      <div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:8}}>// workshops</div>
          <h1 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:24,letterSpacing:'-.03em',margin:0}}>Workshops</h1>
        </div>
        <button onClick={()=>setCreating(p=>!p)} style={{background:'#CFFF00',border:'none',borderRadius:9,color:'#000',fontFamily:'var(--font-syne)',fontWeight:800,fontSize:13,padding:'10px 20px',cursor:'none'}}>
          {creating ? 'Cancel' : '+ New Workshop'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={createWorkshop} style={{background:'#0d0d0d',border:'1px solid #1e1e1e',borderRadius:14,padding:24,marginBottom:24}}>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:18}}>New Workshop</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div>
              <label style={labelStyle}>Title</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required style={inputStyle} placeholder="Workshop title" />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} style={inputStyle} placeholder="Room / Online" />
            </div>
            <div>
              <label style={labelStyle}>Scheduled Date & Time</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(f=>({...f,scheduled_at:e.target.value}))} required style={inputStyle} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={labelStyle}>XP for Attending</label>
                <input type="number" value={form.xp_for_attend} onChange={e=>setForm(f=>({...f,xp_for_attend:+e.target.value}))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Late Penalty</label>
                <input type="number" value={form.late_penalty} onChange={e=>setForm(f=>({...f,late_penalty:+e.target.value}))} style={inputStyle} />
              </div>
            </div>
          </div>
          <div style={{marginBottom:18}}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{...inputStyle,minHeight:80,resize:'vertical'}} placeholder="Workshop description" />
          </div>
          <button type="submit" style={{background:'#CFFF00',border:'none',borderRadius:8,color:'#000',fontFamily:'var(--font-syne)',fontWeight:800,fontSize:13,padding:'11px 24px',cursor:'none'}}>
            Create Workshop
          </button>
        </form>
      )}

      {/* Workshop list */}
      {loading ? (
        <div style={{color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>Loading...</div>
      ) : workshops.length === 0 ? (
        <div style={{padding:60,textAlign:'center',color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>No workshops yet</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {workshops.map(w => (
            <div key={w.id} style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:'20px 24px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                  <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',fontSize:15}}>{w.title}</div>
                  {w.is_active && (
                    <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#00e676',background:'rgba(0,230,118,0.08)',padding:'2px 8px',borderRadius:99,letterSpacing:'.06em'}}>LIVE</span>
                  )}
                </div>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838'}}>
                  {new Date(w.scheduled_at).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                  {w.location && ` · ${w.location}`}
                </div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',background:'rgba(207,255,0,0.06)',padding:'4px 10px',borderRadius:7}}>+{w.xp_for_attend} XP</span>
                <button onClick={()=>toggleActive(w.id, w.is_active)} style={{
                  background:'transparent',
                  border:`1px solid ${w.is_active?'rgba(0,230,118,0.25)':'#1e1e1e'}`,
                  borderRadius:7,
                  color:w.is_active?'#00e676':'#444',
                  fontFamily:'var(--font-jetbrains)',fontSize:11,
                  padding:'6px 14px',cursor:'none',transition:'all .2s',
                }}>
                  {w.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',
  letterSpacing:'.06em',textTransform:'uppercase',display:'block',marginBottom:6,
}
const inputStyle: React.CSSProperties = {
  width:'100%',background:'#111',border:'1px solid #1e1e1e',borderRadius:8,
  color:'#e0e0e0',fontFamily:'var(--font-dm-sans)',fontSize:13,
  padding:'10px 12px',outline:'none',boxSizing:'border-box',
}
