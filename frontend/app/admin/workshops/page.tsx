'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface Workshop {
  id: string; title: string; description: string;
  start_at: string; end_at: string;
  daily_start_time: string; daily_end_time: string;
  location: string; xp_for_attend: number;
  late_penalty: number; is_active: boolean;
}


interface Poll {
  id: string
  title: string
  is_active: boolean
  total_votes?: number
}

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [polls,     setPolls]     = useState<Poll[]>([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [creatingPoll, setCreatingPoll] = useState(false)
  const [copiedId,  setCopiedId]  = useState<string | null>(null)
  const [toast,     setToast]     = useState<string | null>(null)

  const [form, setForm] = useState({
  title:'', description:'',
  start_at:'', end_at:'',
  daily_start_time:'09:00', daily_end_time:'17:00',
  location:'', xp_for_attend:50, late_penalty:10,
})

  const [pollForm, setPollForm] = useState({
    title:'', description:'',
    options:['',''],
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(null),3000) }

  const fetchAll = async () => {
    setLoading(true)
    const [wsRes, pollRes] = await Promise.all([
      authFetch('/api/backend/admin/workshops'),
      authFetch('/api/backend/polls/active'),
    ])
    const wsData   = await wsRes.json()
    const pollData = await pollRes.json()
    setWorkshops(wsData.data || [])
    setPolls(pollData.polls || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const createWorkshop = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await authFetch('/api/backend/admin/workshops', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form),
    })
    if (res.ok) {
      showToast('Workshop created ✓')
      setCreating(false)
      setForm({title:'',description:'',start_at:'',end_at:'',daily_start_time:'09:00',daily_end_time:'17:00',location:'',xp_for_attend:50,late_penalty:10})
      fetchAll()
    } else showToast('Failed to create')
  }

  const createPoll = async (e: React.FormEvent) => {
    e.preventDefault()
    const options = pollForm.options
      .filter(o => o.trim())
      .map((o, i) => ({ id: `opt_${i}`, label: o.trim() }))
    if (options.length < 2) { showToast('Add at least 2 options'); return }

    const res = await authFetch('/api/backend/admin/polls', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        title:       pollForm.title,
        description: pollForm.description,
        options,
      }),
    })
    if (res.ok) {
      showToast('Poll created ✓')
      setCreatingPoll(false)
      setPollForm({title:'',description:'',options:['','']})
      fetchAll()
    } else showToast('Failed to create poll')
  }

  const toggleWorkshop = async (id: string, active: boolean) => {
    await authFetch(`/api/backend/admin/workshops/${id}/activate?active=${!active}`, {method:'PATCH'})
    fetchAll()
    showToast(!active ? 'Workshop activated — attendance is live' : 'Workshop deactivated')
  }

  const togglePoll = async (id: string, active: boolean) => {
    await authFetch(`/api/backend/admin/polls/${id}/activate?active=${!active}`, {method:'PATCH'})
    fetchAll()
  }

  const copyAttendURL = (id: string) => {
    const url = `${window.location.origin}/attend/${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    showToast('Attendance URL copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const copyFeedbackURL = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/feedback/${id}`)
    showToast('Feedback URL copied!')
  }

  const copyVoteURL = (id: string) => {
    const url = `${window.location.origin}/vote/${id}`
    navigator.clipboard.writeText(url)
    showToast('Vote URL copied!')
  }

  return (
    <div style={{padding:'32px 36px'}}>
      {toast && (
        <div style={{position:'fixed',top:20,right:20,zIndex:9999,padding:'12px 20px',
          borderRadius:10,background:'rgba(0,230,118,0.12)',border:'1px solid rgba(0,230,118,0.3)',
          color:'#00e676',fontFamily:'var(--font-jetbrains)',fontSize:12}}>
          {toast}
        </div>
      )}

      {/* ── WORKSHOPS ── */}
      <div style={{marginBottom:40}}>
        <div style={{marginBottom:20,display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:8}}>
              // workshops
            </div>
            <h1 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:22,letterSpacing:'-.03em',margin:0}}>
              Workshops
            </h1>
          </div>
          <button onClick={()=>setCreating(p=>!p)}
            style={{background:'#CFFF00',border:'none',borderRadius:9,color:'#000',
              fontFamily:'var(--font-syne)',fontWeight:800,fontSize:13,
              padding:'10px 20px',cursor:'none'}}>
            {creating ? 'Cancel' : '+ New Workshop'}
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <form onSubmit={createWorkshop}
            style={{background:'#0d0d0d',border:'1px solid #1e1e1e',borderRadius:14,padding:24,marginBottom:20}}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',
              letterSpacing:'.12em',textTransform:'uppercase',marginBottom:16}}>
              New Workshop
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              <div><Label>Title</Label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                  required style={inputStyle} placeholder="Workshop title" /></div>
              <div><Label>Location</Label>
                <input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))}
                  style={inputStyle} placeholder="Room / Online" /></div>
              <div><Label>From Date</Label>
                <input type="datetime-local" value={form.start_at}
                  onChange={e=>setForm(f=>({...f,start_at:e.target.value}))}
                  required style={inputStyle} /></div>
              <div><Label>To Date</Label>
                <input type="datetime-local" value={form.end_at}
                  onChange={e=>setForm(f=>({...f,end_at:e.target.value}))}
                  required style={inputStyle} /></div>
              <div><Label>Daily Start Time</Label>
                <input type="time" value={form.daily_start_time}
                  onChange={e=>setForm(f=>({...f,daily_start_time:e.target.value}))}
                  style={inputStyle} /></div>
              <div><Label>Daily End Time</Label>
                <input type="time" value={form.daily_end_time}
                  onChange={e=>setForm(f=>({...f,daily_end_time:e.target.value}))}
                  style={inputStyle} /></div>
              <div><Label>XP per Day</Label>
                <input type="number" value={form.xp_for_attend}
                  onChange={e=>setForm(f=>({...f,xp_for_attend:+e.target.value}))}
                  style={inputStyle} /></div>
              <div><Label>Late Penalty</Label>
                <input type="number" value={form.late_penalty}
                  onChange={e=>setForm(f=>({...f,late_penalty:+e.target.value}))}
                  style={inputStyle} /></div>
            </div>
            <div style={{marginBottom:16}}>
              <Label>Description</Label>
              <textarea value={form.description}
                onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                style={{...inputStyle,minHeight:72,resize:'vertical'}}
                placeholder="What will members learn?" />
            </div>
            <button type="submit"
              style={{background:'#CFFF00',border:'none',borderRadius:8,color:'#000',
                fontFamily:'var(--font-syne)',fontWeight:800,fontSize:13,
                padding:'11px 24px',cursor:'none'}}>
              Create Workshop
            </button>
          </form>
        )}

        {/* Workshop list */}
        {loading ? (
          <div style={{color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>Loading...</div>
        ) : workshops.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>
            No workshops yet
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {workshops.map(w => {
                const start = new Date(w.start_at)
                const end = new Date(w.end_at)
                const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
              return(
              <div key={w.id}
                style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,
                  padding:'18px 22px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',fontSize:14}}>
                      {w.title}
                    </div>
                    {w.is_active && (
                      <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#00e676',
                        background:'rgba(0,230,118,0.08)',padding:'2px 8px',borderRadius:99,
                        letterSpacing:'.06em',animation:'none'}}>
                        ● LIVE
                      </span>
                    )}
            {!w.is_active ? null : new Date(w.end_at) < new Date() && (
  <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#ff9800',
    background:'rgba(255,152,0,0.08)',padding:'2px 8px',borderRadius:99}}>
    ⚠ Ended — consider deactivating
  </span>
)}

                  </div>
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838'}}>
  {start.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
  {days > 1 && ` — ${end.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`}
  {days === 1 && `, ${start.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`}
  {w.location && ` · ${w.location}`}
  {days > 1 && ` · ${days} days`}
</div>
                </div>

                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',
                    background:'rgba(207,255,0,0.06)',padding:'4px 10px',borderRadius:7}}>
                    +{w.xp_for_attend} XP
                  </span>

                  {/* Go Live / Deactivate */}
                  <button onClick={()=>toggleWorkshop(w.id, w.is_active)}
                    style={{
                      background: w.is_active ? 'transparent' : 'rgba(0,230,118,0.08)',
                      border:`1px solid ${w.is_active?'#1e1e1e':'rgba(0,230,118,0.25)'}`,
                      borderRadius:7,color:w.is_active?'#444':'#00e676',
                      fontFamily:'var(--font-jetbrains)',fontSize:11,
                      padding:'6px 14px',cursor:'none',transition:'all .2s',
                    }}>
                    {w.is_active ? 'Deactivate' : '▶ Go Live'}
                  </button>

                  {/* Copy attendance URL */}
                  <button onClick={()=>copyAttendURL(w.id)}
                    style={{
                      background: copiedId===w.id ? 'rgba(207,255,0,0.1)' : 'transparent',
                      border:`1px solid ${copiedId===w.id?'rgba(207,255,0,0.3)':'#1e1e1e'}`,
                      borderRadius:7,
                      color:copiedId===w.id?'#CFFF00':'#444',
                      fontFamily:'var(--font-jetbrains)',fontSize:11,
                      padding:'6px 14px',cursor:'none',transition:'all .2s',
                    }}>
                    {copiedId===w.id ? '✓ Copied' : '⛓ Attend URL'}
                  </button>
                  <button onClick={() => window.open(
  `/api/backend/admin/workshops/${w.id}/attendance/csv`, '_blank'
)} style={{
  background:'transparent', border:'1px solid #1e1e1e', borderRadius:7,
  color:'#444', fontFamily:'var(--font-jetbrains)', fontSize:11,
  padding:'6px 14px', cursor:'none',
}}>⬇ CSV</button>

                  {/* Feedback URL */}
                  <button onClick={() => copyFeedbackURL(w.id)}
                  style={{
                      background: copiedId===w.id ? 'rgba(207,255,0,0.1)' : 'transparent',
                      border:`1px solid ${copiedId===w.id?'rgba(207,255,0,0.3)':'#1e1e1e'}`,
                      borderRadius:7,
                      color:copiedId===w.id?'#CFFF00':'#444',
                      fontFamily:'var(--font-jetbrains)',fontSize:11,
                      padding:'6px 14px',cursor:'none',transition:'all .2s',
                    }}>⛓ Feedback URL</button>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* ── POLLS ── */}
      <div>
        <div style={{marginBottom:20,display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',
              letterSpacing:'.15em',textTransform:'uppercase',marginBottom:8}}>
              // polls & voting
            </div>
            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:22,
              letterSpacing:'-.03em',margin:0}}>
              Polls
            </h2>
          </div>
          <button onClick={()=>setCreatingPoll(p=>!p)}
            style={{background:'transparent',border:'1px solid #1e1e1e',borderRadius:9,color:'#555',
              fontFamily:'var(--font-syne)',fontWeight:700,fontSize:13,
              padding:'10px 20px',cursor:'none',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(207,255,0,0.25)';e.currentTarget.style.color='#CFFF00'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e1e';e.currentTarget.style.color='#555'}}>
            {creatingPoll ? 'Cancel' : '+ New Poll'}
          </button>
        </div>

        {/* Poll create form */}
        {creatingPoll && (
          <form onSubmit={createPoll}
            style={{background:'#0d0d0d',border:'1px solid #1e1e1e',borderRadius:14,padding:24,marginBottom:20}}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',
              letterSpacing:'.12em',textTransform:'uppercase',marginBottom:16}}>
              New Poll
            </div>
            <div style={{marginBottom:12}}>
              <Label>Question</Label>
              <input value={pollForm.title}
                onChange={e=>setPollForm(f=>({...f,title:e.target.value}))}
                required style={inputStyle} placeholder="What should we build next?" />
            </div>
            <div style={{marginBottom:16}}>
              <Label>Description (optional)</Label>
              <input value={pollForm.description}
                onChange={e=>setPollForm(f=>({...f,description:e.target.value}))}
                style={inputStyle} placeholder="Additional context..." />
            </div>
            <div style={{marginBottom:16}}>
              <Label>Options</Label>
              {pollForm.options.map((opt, i) => (
                <div key={i} style={{display:'flex',gap:8,marginBottom:8}}>
                  <input value={opt}
                    onChange={e=>{
                      const opts = [...pollForm.options]
                      opts[i] = e.target.value
                      setPollForm(f=>({...f,options:opts}))
                    }}
                    placeholder={`Option ${i+1}`}
                    style={{...inputStyle,flex:1}} />
                  {pollForm.options.length > 2 && (
                    <button type="button"
                      onClick={()=>setPollForm(f=>({...f,options:f.options.filter((_,j)=>j!==i)}))}
                      style={{background:'transparent',border:'1px solid #1e1e1e',borderRadius:7,
                        color:'#ff4040',fontFamily:'var(--font-jetbrains)',fontSize:11,
                        padding:'0 12px',cursor:'none'}}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button"
                onClick={()=>setPollForm(f=>({...f,options:[...f.options,'']}))}
                style={{background:'transparent',border:'1px dashed #1e1e1e',borderRadius:7,
                  color:'#383838',fontFamily:'var(--font-jetbrains)',fontSize:11,
                  padding:'7px 14px',cursor:'none',width:'100%',marginTop:4}}>
                + Add option
              </button>
            </div>
            <button type="submit"
              style={{background:'#CFFF00',border:'none',borderRadius:8,color:'#000',
                fontFamily:'var(--font-syne)',fontWeight:800,fontSize:13,
                padding:'11px 24px',cursor:'none'}}>
              Create Poll
            </button>
          </form>
        )}

        {/* Polls list */}
        {polls.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:'#2a2a2a',fontFamily:'var(--font-jetbrains)',fontSize:12}}>
            No polls yet
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {polls.map(p => (
              <div key={p.id}
                style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,
                  padding:'18px 22px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',fontSize:14}}>
                      {p.title}
                    </div>
                    {p.is_active && (
                      <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#00e676',
                        background:'rgba(0,230,118,0.08)',padding:'2px 8px',borderRadius:99}}>
                        ● LIVE
                      </span>
                    )}
                  </div>
                  {p.total_votes !== undefined && (
                    <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838'}}>
                      {p.total_votes} vote{p.total_votes !== 1 ? 's' : ''} cast
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>togglePoll(p.id, p.is_active)}
                    style={{
                      background: p.is_active ? 'transparent' : 'rgba(0,230,118,0.08)',
                      border:`1px solid ${p.is_active?'#1e1e1e':'rgba(0,230,118,0.25)'}`,
                      borderRadius:7,color:p.is_active?'#444':'#00e676',
                      fontFamily:'var(--font-jetbrains)',fontSize:11,
                      padding:'6px 14px',cursor:'none',transition:'all .2s',
                    }}>
                    {p.is_active ? 'Close Poll' : '▶ Activate'}
                  </button>
                  <button onClick={()=>copyVoteURL(p.id)}
                    style={{background:'transparent',border:'1px solid #1e1e1e',borderRadius:7,
                      color:'#444',fontFamily:'var(--font-jetbrains)',fontSize:11,
                      padding:'6px 14px',cursor:'none',transition:'all .2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(207,255,0,0.2)';e.currentTarget.style.color='#CFFF00'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e1e';e.currentTarget.style.color='#444'}}>
                    ⛓ Vote URL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',
  letterSpacing:'.06em',textTransform:'uppercase',display:'block',marginBottom:6,
}
function Label({ children }: { children: React.ReactNode }) {
  return <label style={labelStyle}>{children}</label>
}
const inputStyle: React.CSSProperties = {
  width:'100%',background:'#111',border:'1px solid #1e1e1e',borderRadius:8,
  color:'#e0e0e0',fontFamily:'var(--font-dm-sans)',fontSize:13,
  padding:'10px 12px',outline:'none',boxSizing:'border-box',
}
