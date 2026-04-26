'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  year: number
  section: string
  stream: string
  bio: string
  github: string
  linkedin: string
  skills: string[]
  avatar_url: string | null
  xp: number
  role: string
  is_alumni: boolean
  encrypted_uid: string | null
  member_archetype: string | null
  batch_year: number
  created_at: string
}

interface Badge {
  badge_definitions: {
    slug: string
    name: string
    description: string
    icon: string
    xp_threshold: number | null
  }
  awarded_at: string
}

interface AttendanceRecord {
  tapped_at: string
  is_late: boolean
  xp_awarded: number
  workshops: { title: string }
}

interface Task {
  id: string
  title: string
  description: string
  xp_reward: number
  due_date: string | null
  task_type: string
  github_repo: string | null
  workshops: { id: string; title: string }
}

interface TaskSubmission {
  task_id: string
  status: string
  submission_url: string | null
  xp_awarded: number | null
}

interface LeaderboardEntry {
  first_name: string
  last_name: string
  xp: number
  member_archetype: string | null
  avatar_url: string | null
}

/* ── XP milestones ───────────────────────────────────────────────────────── */
const MILESTONES = [
  { xp: 100,  label: 'Century',      icon: '💯' },
  { xp: 250,  label: 'Rising',       icon: '📈' },
  { xp: 500,  label: 'Achiever',     icon: '🏆' },
  { xp: 1000, label: 'Legend',       icon: '👑' },
  { xp: 2500, label: 'Mythic',       icon: '⚡' },
]

function getNextMilestone(xp: number) {
  return MILESTONES.find(m => m.xp > xp) ?? MILESTONES[MILESTONES.length - 1]
}

function getPrevMilestone(xp: number) {
  const idx = MILESTONES.findIndex(m => m.xp > xp)
  return idx > 0 ? MILESTONES[idx - 1] : { xp: 0, label: 'Start', icon: '🌱' }
}

/* ── Counter hook ────────────────────────────────────────────────────────── */
function useCounter(target: number, duration = 1200, started = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!started || target === 0) return
    let start: number | null = null
    const tick = (now: number) => {
      if (!start) start = now
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, started])
  return val
}

/* ── Orbital ring canvas ─────────────────────────────────────────────────── */
function OrbitalRing({ xp, maxXp, size = 160 }: { xp: number; maxXp: number; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width  = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const r1 = size / 2 - 6   // outer track
    const r2 = size / 2 - 18  // inner track
    let angle = -Math.PI / 2
    let xpAngle = -Math.PI / 2
    const targetXpAngle = -Math.PI / 2 + (Math.PI * 2 * Math.min(xp / maxXp, 1))

    const draw = () => {
      ctx.clearRect(0, 0, size, size)

      // Outer track
      ctx.beginPath()
      ctx.arc(cx, cy, r1, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(207,255,0,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Inner track
      ctx.beginPath()
      ctx.arc(cx, cy, r2, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(207,255,0,0.05)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Rotating scanner line
      angle += 0.012
      const sx = cx + r1 * Math.cos(angle)
      const sy = cy + r1 * Math.sin(angle)
      const grad = ctx.createLinearGradient(cx, cy, sx, sy)
      grad.addColorStop(0, 'rgba(207,255,0,0)')
      grad.addColorStop(1, 'rgba(207,255,0,0.35)')
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(sx, sy)
      ctx.strokeStyle = grad
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Scanner dot
      ctx.beginPath()
      ctx.arc(sx, sy, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#CFFF00'
      ctx.shadowColor = '#CFFF00'
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.shadowBlur = 0

      // XP arc progress
      xpAngle += (targetXpAngle - xpAngle) * 0.04
      if (xpAngle > -Math.PI / 2) {
        ctx.beginPath()
        ctx.arc(cx, cy, r2, -Math.PI / 2, xpAngle)
        ctx.strokeStyle = '#CFFF00'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.lineCap = 'butt'

        // XP arc glow
        ctx.beginPath()
        ctx.arc(cx, cy, r2, -Math.PI / 2, xpAngle)
        ctx.strokeStyle = 'rgba(207,255,0,0.2)'
        ctx.lineWidth = 6
        ctx.stroke()
      }

      // Corner tick marks
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const ox = cx + (r1 + 4) * Math.cos(a)
        const oy = cy + (r1 + 4) * Math.sin(a)
        const ix = cx + (r1 - 4) * Math.cos(a)
        const iy = cy + (r1 - 4) * Math.sin(a)
        ctx.beginPath()
        ctx.moveTo(ox, oy)
        ctx.lineTo(ix, iy)
        ctx.strokeStyle = 'rgba(207,255,0,0.2)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [xp, maxXp, size])

  return (
    <canvas ref={canvasRef}
      style={{ width: size, height: size, position: 'absolute', inset: 0 }}
    />
  )
}

/* ── UID scramble effect ─────────────────────────────────────────────────── */
function ScrambleUID({ uid }: { uid: string }) {
  const [display, setDisplay] = useState('████████████████████████')
  const chars = 'ABCDEF0123456789'

  useEffect(() => {
    if (!uid) return
    const short = uid.slice(0, 24).toUpperCase()
    let iter = 0
    const iv = setInterval(() => {
      setDisplay(
        short.split('').map((c, i) =>
          i < iter ? c : chars[Math.floor(Math.random() * chars.length)]
        ).join('')
      )
      iter += 0.5
      if (iter >= short.length) clearInterval(iv)
    }, 40)
    return () => clearInterval(iv)
  }, [uid])

  return <span>{display}</span>
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const router = useRouter()

  const [member,     setMember]     = useState<Member | null>(null)
  const [badges,     setBadges]     = useState<Badge[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [submissions,setSubmissions]= useState<TaskSubmission[]>([])
  const [leaderboard,setLeaderboard]= useState<LeaderboardEntry[]>([])
  const [activity,    setActivity]    = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [submitUrl,  setSubmitUrl]  = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [submitToast,setSubmitToast]= useState<{ msg: string; ok: boolean } | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [booting,    setBooting]    = useState(true)
  const [bootLine,   setBootLine]   = useState(0)
  const [revealed,   setRevealed]   = useState(false)

  const BOOT_LINES = [
    '> Initialising CSDC Synapse...',
    '> Authenticating member identity...',
    '> Fetching NFC profile...',
    '> Decrypting UID...',
    '> Loading engagement data...',
    '> All systems nominal.',
  ]

  /* ── Boot sequence ── */
  useEffect(() => {
    let i = 0
    const iv = setInterval(() => {
      i++
      setBootLine(i)
      if (i >= BOOT_LINES.length) {
        clearInterval(iv)
        setTimeout(() => { setBooting(false); setTimeout(() => setRevealed(true), 100) }, 400)
      }
    }, 320)
    return () => clearInterval(iv)
  }, [])

  /* ── Fetch data ── */
  useEffect(() => {
    const load = async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/admin/login'); return }

      // Get member
      const { data: m } = await sb
        .from('members')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!m) { router.push('/onboard'); return }
      setMember(m)

      // Get badges
      const { data: b } = await sb
        .from('member_badges')
        .select('awarded_at, badge_definitions(slug,name,description,icon,xp_threshold)')
        .eq('member_id', m.id)
        .order('awarded_at', { ascending: false })

      setBadges((b as any) || [])

      // Get attendance
      const { data: a } = await sb
        .from('attendance')
        .select('tapped_at, is_late, xp_awarded, workshops(id, title)')
        .eq('member_id', m.id)
        .order('tapped_at', { ascending: false })
        .limit(5)

      setAttendance((a as any) || [])
      // Get tasks for workshops this member attended
      const attendedWsIds = (a || []).map((x: any) => x.workshops?.id).filter(Boolean)
      if (attendedWsIds.length > 0) {
        const { data: t } = await sb
          .from('tasks')
          .select('id, title, description, xp_reward, due_date, task_type, github_repo, workshops(id, title)')
          .in('workshop_id', attendedWsIds)
          .eq('is_active', true)
        setTasks((t as any) || [])

        // Get this member's submissions
        if (t && t.length > 0) {
          const { data: subs } = await sb
            .from('task_submissions')
            .select('task_id, status, submission_url, xp_awarded')
            .eq('member_id', m.id)
          setSubmissions(subs || [])
        }
      }

      // Leaderboard — top 10 by XP
      const { data: lb } = await sb
        .from('members')
        .select('first_name, last_name, xp, member_archetype, avatar_url')
        .order('xp', { ascending: false })
        .limit(10)
      setLeaderboard(lb || [])

      // Activity feed
      const actRes = await fetch(`/api/activity/${m.id}`)
      if (actRes.ok) {
        const actData = await actRes.json()
        setActivity(actData.data || [])
      }

      // Upcoming workshops
      const upRes = await fetch('/api/workshops/upcoming')
      if (upRes.ok) {
        const upData = await upRes.json()
        setUpcoming(upData.data || [])
      } 

      // Connections
      const conRes = await fetch(`/api/connect?member_id=${m.id}`)
      if (conRes.ok) {
        const conData = await conRes.json()
        setConnections(conData.data || [])
      } 
      
      setLoading(false)
    } 
    load()
  }, [router])
  const handleTaskSubmit = async (taskId: string) => {
    const url = submitUrl[taskId]?.trim()
    if (!url || !member) return
    setSubmitting(taskId)
    const res = await fetch('/api/tasks/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: taskId,
        member_id: member.id,
        submission_url: url,
        notes: '',
      }),
    })
    const data = await res.json()
    const ok = res.ok && data.success !== false
    setSubmitToast({ msg: ok ? 'Submission received! Leads will review it.' : (data.detail || data.message || 'Error'), ok })
    setTimeout(() => setSubmitToast(null), 4000)
    if (ok) {
      setSubmissions(p => [...p.filter(s => s.task_id !== taskId), { task_id: taskId, status: 'pending', submission_url: url, xp_awarded: null }])
      setSubmitUrl(p => ({ ...p, [taskId]: '' }))
    }
    setSubmitting(null)
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/')
  }

  /* ── Derived ── */
  const next     = member ? getNextMilestone(member.xp) : MILESTONES[0]
  const prev     = member ? getPrevMilestone(member.xp) : { xp: 0 }
  const xpPct    = member ? Math.round(((member.xp - prev.xp) / (next.xp - prev.xp)) * 100) : 0
  const initials = member ? `${member.first_name[0]}${member.last_name[0]}`.toUpperCase() : '??'
  const xpCount  = useCounter(member?.xp ?? 0, 1400, revealed)

  /* ── Boot screen ── */
  if (booting || loading) {
    return (
      <div style={{
        minHeight:'100vh', background:'#080808',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        fontFamily:'var(--font-jetbrains)',
      }}>
        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
          body { background:#080808; cursor:none; }
        `}</style>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" style={{width:36,height:36,objectFit:'contain',marginBottom:28,
          filter:'drop-shadow(0 0 12px rgba(207,255,0,0.6))'}} />
        <div style={{width:320}}>
          {BOOT_LINES.slice(0, bootLine).map((line, i) => (
            <div key={i} style={{
              fontSize:11, color: i === bootLine - 1 ? '#CFFF00' : '#2a2a2a',
              marginBottom:4, letterSpacing:'.04em',
              transition:'color .3s',
            }}>
              {line}
              {i === bootLine - 1 && (
                <span style={{animation:'blink 0.8s infinite'}}>█</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!member) return null

  /* ── Dashboard ── */
  return (
    <div style={{
      minHeight:'100vh', background:'#080808',
      color:'#e0e0e0', fontFamily:'var(--font-dm-sans)',
      overflowX:'hidden', cursor:'none',
    }}>
      <style>{`
        body { background:#080808; cursor:none; }
        ::-webkit-scrollbar { width:3px }
        ::-webkit-scrollbar-thumb { background:#CFFF00; border-radius:2px }

        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scanline {
          0%   { transform:translateY(-100%); }
          100% { transform:translateY(100vh); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow:0 0 0 0 rgba(207,255,0,0); }
          50%      { box-shadow:0 0 24px 4px rgba(207,255,0,0.1); }
        }
        @keyframes liquidFill {
          from { width:0% }
          to   { width:${xpPct}% }
        }
        @keyframes float {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-5px); }
        }
        @keyframes rotateRing {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }

        .reveal { opacity:0; }
        .reveal.on {
          animation: fadeSlideUp .6s cubic-bezier(.16,1,.3,1) forwards;
        }
        .stat-card {
          background:#0d0d0d;
          border:1px solid #161616;
          border-radius:14px;
          padding:20px;
          transition: border-color .25s, transform .25s;
          position:relative;
          overflow:hidden;
        }
        .stat-card::before {
          content:'';
          position:absolute;
          inset:0;
          background:radial-gradient(circle at top left, rgba(207,255,0,0.03) 0%, transparent 60%);
          pointer-events:none;
        }
        .stat-card:hover {
          border-color:rgba(207,255,0,0.18);
          transform:translateY(-2px);
        }
        .badge-chip {
          display:flex; align-items:center; gap:8px;
          background:#0d0d0d; border:1px solid #161616;
          border-radius:10px; padding:10px 14px;
          transition:all .2s;
        }
        .badge-chip:hover {
          border-color:rgba(207,255,0,0.2);
          background:rgba(207,255,0,0.03);
        }
        .noise-overlay {
          position:fixed; inset:0; pointer-events:none; z-index:1;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity:.3;
        }
        .scan-line {
          position:fixed; left:0; right:0; height:1px; z-index:2;
          background:linear-gradient(90deg, transparent, rgba(207,255,0,0.08), transparent);
          animation:scanline 8s linear infinite;
          pointer-events:none;
        }
        .mesh-bg {
          position:fixed; inset:0; pointer-events:none; z-index:0;
          background:
            radial-gradient(ellipse 80% 50% at 20% 20%, rgba(207,255,0,0.025) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(207,255,0,0.015) 0%, transparent 50%);
        }
      `}</style>

      <div className="noise-overlay" />
      <div className="scan-line" />
      <div className="mesh-bg" />

      {/* ── NAVBAR ── */}
      <nav style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(8,8,8,0.92)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid #111',
        padding:'14px 40px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{width:26,height:26,objectFit:'contain'}} />
          <span style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:14,letterSpacing:'-.02em'}}>Chathurya</span>
        </Link>

        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {/* Status dot */}
          <div style={{width:6,height:6,borderRadius:'50%',background:'#CFFF00',boxShadow:'0 0 8px rgba(207,255,0,0.8)'}} />
          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#555',letterSpacing:'.06em'}}>
            MEMBER ACTIVE
          </span>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#444',letterSpacing:'.04em'}}>
            {member.first_name} {member.last_name}
          </span>
          <button onClick={handleLogout} style={{
            background:'transparent', border:'1px solid #1e1e1e',
            borderRadius:7, color:'#333', fontFamily:'var(--font-jetbrains)',
            fontSize:10, padding:'6px 12px', cursor:'none',
            letterSpacing:'.04em', transition:'all .2s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(207,255,0,0.2)';e.currentTarget.style.color='#CFFF00'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e1e';e.currentTarget.style.color='#333'}}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={{position:'relative',zIndex:2,maxWidth:1200,margin:'0 auto',padding:'48px 40px'}}>

        {/* ══════════════════════════════════════════════════════
            HERO — Identity + Stats
        ══════════════════════════════════════════════════════ */}
        <div style={{
          display:'grid', gridTemplateColumns:'380px 1fr',
          gap:24, marginBottom:24,
          opacity: revealed ? 1 : 0,
          transition:'opacity .5s ease',
        }}>

          {/* ── Identity card ── */}
          <div style={{
            background:'#0a0a0a',
            border:'1px solid #1a1a1a',
            borderRadius:20,
            padding:32,
            display:'flex', flexDirection:'column',
            alignItems:'center',
            position:'relative',
            overflow:'hidden',
            animation: revealed ? 'fadeSlideUp .7s cubic-bezier(.16,1,.3,1) forwards' : 'none',
          }}>
            {/* Corner accents */}
            {[[0,0],[0,1],[1,0],[1,1]].map(([t,r],i) => (
              <div key={i} style={{
                position:'absolute',
                width:16, height:16,
                ...(t===0?{top:12}:{bottom:12}),
                ...(r===0?{left:12}:{right:12}),
                borderTop:   t===0 ? '1px solid rgba(207,255,0,0.2)' : 'none',
                borderBottom:t===1 ? '1px solid rgba(207,255,0,0.2)' : 'none',
                borderLeft:  r===0 ? '1px solid rgba(207,255,0,0.2)' : 'none',
                borderRight: r===1 ? '1px solid rgba(207,255,0,0.2)' : 'none',
              }} />
            ))}

            {/* Radial glow behind avatar */}
            <div style={{
              position:'absolute', width:200, height:200,
              borderRadius:'50%',
              background:'radial-gradient(circle, rgba(207,255,0,0.06) 0%, transparent 70%)',
              top:'50%', left:'50%', transform:'translate(-50%,-60%)',
              pointerEvents:'none',
            }} />

            {/* Avatar with orbital ring */}
            <div style={{position:'relative', width:160, height:160, marginBottom:24}}>
              <OrbitalRing xp={member.xp} maxXp={next.xp} size={160} />

              {/* Avatar */}
              <div style={{
                position:'absolute',
                top:'50%', left:'50%',
                transform:'translate(-50%,-50%)',
                width:80, height:80, borderRadius:'50%',
                background: member.avatar_url ? 'transparent' : 'linear-gradient(135deg,#CFFF00,#a8cc00)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-syne)', fontWeight:800,
                color:'#000', fontSize:26,
                animation:'float 5s ease-in-out infinite',
                overflow:'hidden',
              }}>
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                ) : initials}
              </div>
            </div>

            {/* Name + role */}
            <h1 style={{
              fontFamily:'var(--font-syne)', fontWeight:800,
              color:'#fff', fontSize:22, letterSpacing:'-.04em',
              textAlign:'center', margin:'0 0 4px', lineHeight:1,
            }}>
              {member.first_name} {member.last_name}
            </h1>

            <div style={{
              fontFamily:'var(--font-jetbrains)', fontSize:10,
              color:'#CFFF00', letterSpacing:'.12em',
              textTransform:'uppercase', marginBottom:16,
            }}>
              {(() => {
  const ROLE_LABELS: Record<string,string> = {
    club_lead: '👑 Club Lead',
    co_lead:   '⭐ Co-Lead',
    core_team: '🔷 Core Team',
    member:    'Member',
  }
  return member.member_archetype ?? ROLE_LABELS[member.role] ?? member.role
})()} · {member.stream}
            </div>

            {/* NFC UID */}
            <div style={{
              background:'#060606',
              border:'1px solid #1a1a1a',
              borderRadius:8, padding:'8px 14px',
              fontFamily:'var(--font-jetbrains)',
              fontSize:10, color:'#2e2e2e',
              letterSpacing:'.08em',
              marginBottom:20, width:'100%',
              textAlign:'center',
            }}>
              <span style={{color:'#333',marginRight:8}}>UID</span>
              <span style={{color:'#444'}}>
                {member.encrypted_uid
                  ? <ScrambleUID uid={member.encrypted_uid} />
                  : '— PENDING ISSUANCE —'}
              </span>
            </div>

            {/* Member since */}
            <div style={{
              fontFamily:'var(--font-jetbrains)', fontSize:9,
              color:'#2a2a2a', letterSpacing:'.1em',
              textTransform:'uppercase',
            }}>
              Member since {new Date(member.created_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}
              {' · '}Batch {member.batch_year}
            </div>

            {/* Bio */}
            {member.bio && (
              <p style={{
                fontFamily:'var(--font-dm-sans)', fontSize:12,
                color:'#444', textAlign:'center', lineHeight:1.7,
                marginTop:14, maxWidth:260,
              }}>
                {member.bio}
              </p>
            )}

            {/* Socials */}
            <div style={{display:'flex',gap:10,marginTop:16}}>
              {member.github && (
                <a href={`https://github.com/${member.github}`} target="_blank" rel="noopener noreferrer"
                  style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#333',textDecoration:'none',
                    border:'1px solid #1a1a1a',padding:'5px 12px',borderRadius:99,transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.color='#CFFF00';e.currentTarget.style.borderColor='rgba(207,255,0,0.2)'}}
                  onMouseLeave={e=>{e.currentTarget.style.color='#333';e.currentTarget.style.borderColor='#1a1a1a'}}>
                  GitHub ↗
                </a>
              )}
              {member.linkedin && (
                <a href={`https://linkedin.com/in/${member.linkedin}`} target="_blank" rel="noopener noreferrer"
                  style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#333',textDecoration:'none',
                    border:'1px solid #1a1a1a',padding:'5px 12px',borderRadius:99,transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.color='#CFFF00';e.currentTarget.style.borderColor='rgba(207,255,0,0.2)'}}
                  onMouseLeave={e=>{e.currentTarget.style.color='#333';e.currentTarget.style.borderColor='#1a1a1a'}}>
                  LinkedIn ↗
                </a>
              )}
            </div>
          </div>

          {/* ── Right: Stats grid ── */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* XP bar */}
            <div style={{
              background:'#0a0a0a', border:'1px solid #1a1a1a',
              borderRadius:16, padding:'22px 24px',
              animation: revealed ? 'fadeSlideUp .7s .1s cubic-bezier(.16,1,.3,1) forwards' : 'none',
              opacity:0,
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12}}>
                <div>
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>Experience Points</div>
                  <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:36,letterSpacing:'-.05em',lineHeight:1}}>
                    {xpCount.toLocaleString()}
                    <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#333',letterSpacing:'.04em',marginLeft:6,fontWeight:400}}>XP</span>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#333',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:2}}>Next milestone</div>
                  <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#555',fontSize:14}}>
                    {next.icon} {next.label}
                  </div>
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#2a2a2a'}}>
                    {next.xp - member.xp} XP away
                  </div>
                </div>
              </div>
              {/* Progress track */}
              <div style={{height:4,background:'#111',borderRadius:2,overflow:'hidden',position:'relative'}}>
                <div style={{
                  height:'100%', borderRadius:2,
                  background:'linear-gradient(90deg,#a8cc00,#CFFF00)',
                  width:`${xpPct}%`,
                  transition:'width 1.4s cubic-bezier(.4,0,.2,1)',
                  boxShadow:'0 0 8px rgba(207,255,0,0.4)',
                }} />
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}>
                <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#2a2a2a'}}>{prev.xp} XP</span>
                <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#2a2a2a'}}>{next.xp} XP</span>
              </div>
            </div>

            {/* 2×2 stat grid */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,flex:1}}>
              {[
                { label:'Badges Earned',    value: badges.length,      unit:'',      icon:'🏅', delay:'.2s' },
                { label:'Workshops',        value: attendance.length,  unit:'attended',icon:'⚡', delay:'.3s' },
                { label:'Year',             value: `${member.year === 1?'1st':member.year===2?'2nd':'3rd'}`, unit:member.section, icon:'📚', delay:'.35s', noCount:true },
                { label:'NFC Card',         value: member.encrypted_uid ? 'Active' : 'Pending', unit:'', icon:'🃏', delay:'.4s', noCount:true },
              ].map((s,i) => (
                <div key={i} className="stat-card" style={{
                  animation: revealed ? `fadeSlideUp .6s ${s.delay} cubic-bezier(.16,1,.3,1) forwards` : 'none',
                  opacity:0,
                }}>
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    {s.label}
                    <span style={{fontSize:16}}>{s.icon}</span>
                  </div>
                  <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:24,letterSpacing:'-.04em',lineHeight:1}}>
                    {s.value}
                  </div>
                  {s.unit && (
                    <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#2a2a2a',marginTop:4,textTransform:'uppercase',letterSpacing:'.06em'}}>
                      {s.unit}
                    </div>
                  )}
                  <div style={{
                    position:'absolute', bottom:0, left:0, right:0, height:2,
                    background:`linear-gradient(90deg,rgba(207,255,0,0.${i*2+1}),transparent)`,
                    borderRadius:'0 0 14px 14px',
                  }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            SKILLS
        ══════════════════════════════════════════════════════ */}
        {member.skills && member.skills.length > 0 && (
          <div style={{
            background:'#0a0a0a', border:'1px solid #1a1a1a',
            borderRadius:16, padding:'20px 24px',
            marginBottom:24,
            animation: revealed ? 'fadeSlideUp .6s .45s cubic-bezier(.16,1,.3,1) forwards' : 'none',
            opacity:0,
          }}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:14}}>
              Skills
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {member.skills.map(s => (
                <span key={s} style={{
                  fontFamily:'var(--font-jetbrains)', fontSize:11,
                  color:'#555', background:'rgba(207,255,0,0.04)',
                  border:'1px solid rgba(207,255,0,0.1)',
                  padding:'5px 12px', borderRadius:99,
                  letterSpacing:'.04em', transition:'all .2s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.color='#CFFF00';e.currentTarget.style.borderColor='rgba(207,255,0,0.25)'}}
                onMouseLeave={e=>{e.currentTarget.style.color='#555';e.currentTarget.style.borderColor='rgba(207,255,0,0.1)'}}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            BADGES + ATTENDANCE
        ══════════════════════════════════════════════════════ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

          {/* Badges */}
          <div style={{
            background:'#0a0a0a', border:'1px solid #1a1a1a',
            borderRadius:16, padding:'22px 24px',
            animation: revealed ? 'fadeSlideUp .6s .5s cubic-bezier(.16,1,.3,1) forwards' : 'none',
            opacity:0,
          }}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>
              Badges {badges.length > 0 && <span style={{color:'#CFFF00'}}>· {badges.length}</span>}
            </div>
            {badges.length === 0 ? (
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#1e1e1e',letterSpacing:'.04em',padding:'20px 0',textAlign:'center'}}>
                No badges yet — attend workshops to earn them
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {badges.map((b, i) => (
                  <div key={i} className="badge-chip">
                    <span style={{fontSize:18,flexShrink:0}}>{b.badge_definitions.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',fontSize:12,letterSpacing:'-.01em'}}>{b.badge_definitions.name}</div>
                      <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#333',marginTop:1}}>{b.badge_definitions.description}</div>
                    </div>
                    <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#2a2a2a',flexShrink:0}}>
                      {new Date(b.awarded_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent attendance */}
          <div style={{
            background:'#0a0a0a', border:'1px solid #1a1a1a',
            borderRadius:16, padding:'22px 24px',
            animation: revealed ? 'fadeSlideUp .6s .55s cubic-bezier(.16,1,.3,1) forwards' : 'none',
            opacity:0,
          }}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>
              Workshop Attendance
            </div>
            {attendance.length === 0 ? (
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#1e1e1e',letterSpacing:'.04em',padding:'20px 0',textAlign:'center'}}>
                No attendance recorded yet
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {attendance.map((a, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 14px',
                    background:'#0d0d0d', border:'1px solid #141414',
                    borderRadius:10,
                  }}>
                    <div style={{
                      width:6, height:6, borderRadius:'50%', flexShrink:0,
                      background: a.is_late ? '#ff9800' : '#CFFF00',
                      boxShadow: `0 0 6px ${a.is_late?'rgba(255,152,0,0.6)':'rgba(207,255,0,0.6)'}`,
                    }} />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#ccc',fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {a.workshops?.title ?? 'Workshop'}
                      </div>
                      <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#333',marginTop:1}}>
                        {new Date(a.tapped_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                        {a.is_late && <span style={{color:'#ff9800',marginLeft:6}}>Late</span>}
                      </div>
                    </div>
                    <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:13,flexShrink:0}}>
                      +{a.xp_awarded}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ══════════════════════════════════════════════════════
            TASKS + LEADERBOARD
        ══════════════════════════════════════════════════════ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginTop:24}}>

          {/* Tasks */}
          <div style={{
            background:'#0a0a0a', border:'1px solid #1a1a1a',
            borderRadius:16, padding:'22px 24px',
            animation: revealed ? 'fadeSlideUp .6s .6s cubic-bezier(.16,1,.3,1) forwards' : 'none',
            opacity:0,
          }}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>
              Workshop Tasks {tasks.length > 0 && <span style={{color:'#CFFF00'}}>· {tasks.length}</span>}
            </div>

            {/* Submit toast */}
            {submitToast && (
              <div style={{
                marginBottom:12, padding:'9px 14px', borderRadius:8,
                background: submitToast.ok ? 'rgba(0,230,118,0.08)' : 'rgba(255,64,64,0.08)',
                border: `1px solid ${submitToast.ok ? 'rgba(0,230,118,0.25)' : 'rgba(255,64,64,0.2)'}`,
                fontFamily:'var(--font-jetbrains)', fontSize:11,
                color: submitToast.ok ? '#00e676' : '#ff6b6b',
              }}>
                {submitToast.msg}
              </div>
            )}

            {tasks.length === 0 ? (
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#1e1e1e',letterSpacing:'.04em',padding:'20px 0',textAlign:'center'}}>
                No tasks yet — attend a workshop to unlock tasks
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {tasks.map(t => {
                  const sub = submissions.find(s => s.task_id === t.id)
                  const statusColor = sub?.status === 'approved' ? '#00e676'
                    : sub?.status === 'rejected' ? '#ff4040'
                    : sub?.status === 'pending'  ? '#ff9800'
                    : '#2a2a2a'
                  const statusLabel = sub?.status ?? 'not submitted'
                  return (
                    <div key={t.id} style={{
                      background:'#0d0d0d', border:'1px solid #141414',
                      borderRadius:12, padding:'14px 16px',
                    }}>
                      {/* Task header */}
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6}}>
                        <div>
                          <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#e0e0e0',fontSize:13,letterSpacing:'-.01em'}}>
                            {t.title}
                          </div>
                          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#383838',marginTop:2,letterSpacing:'.04em'}}>
                            {t.workshops?.title}
                            {t.due_date && ` · Due ${new Date(t.due_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#CFFF00',background:'rgba(207,255,0,0.06)',padding:'2px 8px',borderRadius:99}}>
                            +{t.xp_reward} XP
                          </span>
                          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,letterSpacing:'.04em',
                            color:statusColor,background:`${statusColor}18`,padding:'2px 8px',borderRadius:99,textTransform:'capitalize'}}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      <p style={{color:'#444',fontSize:12,lineHeight:1.65,margin:'0 0 10px',fontFamily:'var(--font-dm-sans)'}}>
                        {t.description}
                      </p>

                      {/* GitHub repo link if specified */}
                      {t.github_repo && (
                        <a href={`https://github.com/${t.github_repo}`} target="_blank" rel="noopener noreferrer"
                          style={{display:'inline-flex',alignItems:'center',gap:5,fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',textDecoration:'none',marginBottom:10}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                          </svg>
                          {t.github_repo} ↗
                        </a>
                      )}

                      {/* Submission UI */}
                      {sub?.status === 'approved' && (
                        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'rgba(0,230,118,0.06)',border:'1px solid rgba(0,230,118,0.15)',borderRadius:8}}>
                          <span style={{color:'#00e676',fontSize:14}}>✓</span>
                          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#00e676'}}>Approved · +{sub.xp_awarded} XP earned</span>
                        </div>
                      )}
                      {sub?.status === 'rejected' && (
                        <div style={{marginTop:4}}>
                          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#ff4040',marginBottom:8}}>
                            Rejected — resubmit below
                          </div>
                          <div style={{display:'flex',gap:8}}>
                            <input
                              value={submitUrl[t.id] ?? ''}
                              onChange={e => setSubmitUrl(p => ({...p, [t.id]: e.target.value}))}
                              placeholder="https://github.com/you/repo"
                              style={{flex:1,background:'#111',border:'1px solid #1e1e1e',borderRadius:8,color:'#e0e0e0',fontFamily:'var(--font-jetbrains)',fontSize:11,padding:'8px 12px',outline:'none'}}
                            />
                            <button onClick={() => handleTaskSubmit(t.id)}
                              disabled={submitting === t.id || !submitUrl[t.id]?.trim()}
                              style={{padding:'8px 14px',background:'rgba(207,255,0,0.1)',border:'1px solid rgba(207,255,0,0.25)',borderRadius:8,color:'#CFFF00',fontFamily:'var(--font-jetbrains)',fontSize:11,cursor:'none',whiteSpace:'nowrap'}}>
                              {submitting === t.id ? '...' : 'Resubmit'}
                            </button>
                          </div>
                        </div>
                      )}
                      {sub?.status === 'pending' && (
                        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'rgba(255,152,0,0.06)',border:'1px solid rgba(255,152,0,0.15)',borderRadius:8}}>
                          <span style={{color:'#ff9800',fontSize:12}}>⏳</span>
                          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#ff9800'}}>Under review</span>
                          {sub.submission_url && (
                            <a href={sub.submission_url} target="_blank" rel="noopener noreferrer"
                              style={{marginLeft:'auto',fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#555',textDecoration:'none'}}>
                              view ↗
                            </a>
                          )}
                        </div>
                      )}
                      {!sub && (
                        <div style={{display:'flex',gap:8}}>
                          <input
                            value={submitUrl[t.id] ?? ''}
                            onChange={e => setSubmitUrl(p => ({...p, [t.id]: e.target.value}))}
                            placeholder="Paste your GitHub repo URL..."
                            style={{flex:1,background:'#111',border:'1px solid #1e1e1e',borderRadius:8,color:'#e0e0e0',fontFamily:'var(--font-jetbrains)',fontSize:11,padding:'8px 12px',outline:'none',transition:'border-color .2s'}}
                            onFocus={e => e.target.style.borderColor='rgba(207,255,0,0.3)'}
                            onBlur={e  => e.target.style.borderColor='#1e1e1e'}
                          />
                          <button onClick={() => handleTaskSubmit(t.id)}
                            disabled={submitting === t.id || !submitUrl[t.id]?.trim()}
                            style={{
                              padding:'8px 16px',
                              background: submitUrl[t.id]?.trim() ? '#CFFF00' : '#111',
                              border:'none', borderRadius:8,
                              color: submitUrl[t.id]?.trim() ? '#000' : '#333',
                              fontFamily:'var(--font-syne)',fontWeight:800,fontSize:12,
                              cursor:'none',transition:'all .2s',whiteSpace:'nowrap',
                            }}>
                            {submitting === t.id ? '...' : 'Submit →'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div style={{
            background:'#0a0a0a', border:'1px solid #1a1a1a',
            borderRadius:16, padding:'22px 24px',
            animation: revealed ? 'fadeSlideUp .6s .65s cubic-bezier(.16,1,.3,1) forwards' : 'none',
            opacity:0,
          }}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>
              XP Leaderboard
            </div>
            {leaderboard.length === 0 ? (
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#1e1e1e',padding:'20px 0',textAlign:'center'}}>
                No members yet
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {leaderboard.map((entry, i) => {
                  const isMe = member && entry.first_name === member.first_name && entry.last_name === member.last_name
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                  return (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'9px 12px', borderRadius:10,
                      background: isMe ? 'rgba(207,255,0,0.06)' : '#0d0d0d',
                      border: `1px solid ${isMe ? 'rgba(207,255,0,0.2)' : '#141414'}`,
                      transition:'all .2s',
                    }}>
                      {/* Rank */}
                      <div style={{
                        width:22,height:22,borderRadius:'50%',flexShrink:0,
                        background: i < 3 ? 'rgba(207,255,0,0.1)' : '#111',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontFamily:'var(--font-syne)',fontWeight:800,
                        color: i < 3 ? '#CFFF00' : '#2a2a2a',
                        fontSize:10,
                      }}>
                        {medal ?? i + 1}
                      </div>

                      {/* Avatar */}
                      <div style={{
                        width:28,height:28,borderRadius:'50%',flexShrink:0,
                        background:'linear-gradient(135deg,#CFFF00,#a8cc00)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontFamily:'var(--font-syne)',fontWeight:800,color:'#000',fontSize:10,
                        overflow:'hidden',
                      }}>
                        {entry.avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={entry.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : `${entry.first_name[0]}${entry.last_name[0]}`
                        }
                      </div>

                      <div style={{flex:1,minWidth:0}}>
                        <div style={{
                          fontFamily:'var(--font-syne)',fontWeight:700,
                          color: isMe ? '#CFFF00' : '#ccc',
                          fontSize:12,letterSpacing:'-.01em',
                          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                        }}>
                          {entry.first_name} {entry.last_name}
                          {isMe && <span style={{fontFamily:'var(--font-jetbrains)',fontSize:8,color:'#CFFF00',marginLeft:6,letterSpacing:'.06em'}}>(you)</span>}
                        </div>
                        {entry.member_archetype && (
                          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#2a2a2a',marginTop:1}}>{entry.member_archetype}</div>
                        )}
                      </div>

                      <div style={{
                        fontFamily:'var(--font-syne)',fontWeight:800,
                        color: isMe ? '#CFFF00' : '#444',
                        fontSize:14,flexShrink:0,
                      }}>
                        {entry.xp}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
        {/* ══════════════════════════════════════════════════════
            CONNECTIONS + ACTIVITY FEED
        ══════════════════════════════════════════════════════ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginTop:20}}>

          {/* Connections */}
          <div style={{
            background:'#0a0a0a', border:'1px solid #1a1a1a',
            borderRadius:16, padding:'22px 24px',
            animation: revealed ? 'fadeSlideUp .6s .7s cubic-bezier(.16,1,.3,1) forwards' : 'none',
            opacity:0,
          }}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.1em',textTransform:'uppercase'}}>
                Connections {connections.length > 0 && <span style={{color:'#CFFF00'}}>· {connections.length}</span>}
              </div>
              <Link href="/connect" style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',textDecoration:'none',border:'1px solid rgba(207,255,0,0.2)',padding:'4px 10px',borderRadius:6,letterSpacing:'.04em'}}>
                🃏 Tap to connect
              </Link>
            </div>

            {connections.length === 0 ? (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:24,marginBottom:8,opacity:.3}}>🃏</div>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#1e1e1e',letterSpacing:'.04em'}}>
                  No connections yet — tap someone's card
                </div>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {connections.slice(0, 6).map((c: any, i: number) => {
                  const m = c.members
                  if (!m) return null
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#0d0d0d',border:'1px solid #141414',borderRadius:10}}>
                      <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,#CFFF00,#a8cc00)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-syne)',fontWeight:800,color:'#000',fontSize:11,overflow:'hidden'}}>
                        {m.avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={m.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : `${m.first_name[0]}${m.last_name[0]}`}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#ccc',fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {m.first_name} {m.last_name}
                        </div>
                        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#2a2a2a',marginTop:1}}>
                          {m.member_archetype ?? m.stream}
                        </div>
                      </div>
                      {m.id && (
                        <Link href={`/u/${c.members?.encrypted_uid ?? ''}`} target="_blank"
                          style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#383838',textDecoration:'none'}}>
                          ↗
                        </Link>
                      )}
                    </div>
                  )
                })}
                {connections.length > 6 && (
                  <Link href="/members" style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',textDecoration:'none',textAlign:'center',padding:'6px',transition:'color .2s'}}
                    onMouseEnter={(e:any)=>e.currentTarget.style.color='#CFFF00'}
                    onMouseLeave={(e:any)=>e.currentTarget.style.color='#444'}>
                    +{connections.length - 6} more →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div style={{
            background:'#0a0a0a', border:'1px solid #1a1a1a',
            borderRadius:16, padding:'22px 24px',
            animation: revealed ? 'fadeSlideUp .6s .75s cubic-bezier(.16,1,.3,1) forwards' : 'none',
            opacity:0,
          }}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>
              Activity
            </div>

            {activity.length === 0 ? (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#1e1e1e',letterSpacing:'.04em'}}>
                  No activity yet — attend a workshop to start
                </div>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {activity.slice(0, 8).map((a: any, i: number) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'flex-start', gap:12,
                    padding:'10px 0',
                    borderBottom: i < activity.length - 1 ? '1px solid #0f0f0f' : 'none',
                  }}>
                    {/* Icon */}
                    <div style={{
                      width:28,height:28,borderRadius:'50%',flexShrink:0,
                      background:'#0d0d0d',border:'1px solid #161616',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:12,marginTop:1,
                    }}>
                      {a.icon}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:'var(--font-dm-sans)',fontSize:12,color:'#555',lineHeight:1.5}}>
                        {a.description}
                      </div>
                      <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#2a2a2a',marginTop:3}}>
                        {new Date(a.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ══════════════════════════════════════════════════════
            UPCOMING WORKSHOPS
        ══════════════════════════════════════════════════════ */}
        {upcoming.length > 0 && (
          <div style={{
            background:'#0a0a0a',
            border:'1px solid rgba(207,255,0,0.15)',
            borderRadius:16, padding:'22px 24px', marginTop:20,
            animation: revealed ? 'fadeSlideUp .6s .8s cubic-bezier(.16,1,.3,1) forwards' : 'none',
            opacity:0,
            position:'relative', overflow:'hidden',
          }}>
            {/* Top accent line */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,
              background:'linear-gradient(90deg,transparent,rgba(207,255,0,0.5),transparent)'}} />

            {/* Header */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#CFFF00',
                boxShadow:'0 0 8px rgba(207,255,0,0.8)',
                animation:'glowPulse 2s ease-in-out infinite'}} />
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',
                letterSpacing:'.1em',textTransform:'uppercase'}}>
                Upcoming Workshops
              </div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#2a2a2a',
                marginLeft:'auto',letterSpacing:'.04em'}}>
                No signup needed — just tap your NFC card at the door
              </div>
            </div>

            {/* Cards */}
            <div style={{display:'grid',
              gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
              {upcoming.map((w: any) => {
                const date      = new Date(w.scheduled_at)
                const msLeft    = date.getTime() - Date.now()
                const daysUntil = Math.ceil(msLeft / (1000*60*60*24))
                const isToday   = daysUntil <= 0
                const isTomorrow = daysUntil === 1
                const urgencyColor = isToday ? '#CFFF00'
                  : isTomorrow       ? '#ff9800'
                  : '#555'
                const urgencyLabel = isToday   ? '🔴 Today!'
                  : isTomorrow               ? '🟡 Tomorrow'
                  : `In ${daysUntil} days`

                return (
                  <div key={w.id} style={{
                    background:'#0d0d0d',
                    border:`1px solid ${isToday ? 'rgba(207,255,0,0.3)' : '#141414'}`,
                    borderRadius:12, padding:'16px',
                    position:'relative', overflow:'hidden',
                    transition:'border-color .2s',
                  }}>
                    {/* Today accent */}
                    {isToday && (
                      <div style={{position:'absolute',top:0,left:0,right:0,height:2,
                        background:'rgba(207,255,0,0.6)'}} />
                    )}

                    {/* Title row */}
                    <div style={{display:'flex',alignItems:'flex-start',
                      justifyContent:'space-between',gap:8,marginBottom:6}}>
                      <div style={{fontFamily:'var(--font-syne)',fontWeight:700,
                        color:'#fff',fontSize:14,letterSpacing:'-.02em',lineHeight:1.2}}>
                        {w.title}
                      </div>
                      <span style={{
                        fontFamily:'var(--font-jetbrains)',fontSize:9,
                        letterSpacing:'.04em',color:urgencyColor,
                        background:`${urgencyColor}18`,
                        padding:'3px 8px',borderRadius:99,flexShrink:0,whiteSpace:'nowrap',
                      }}>
                        {urgencyLabel}
                      </span>
                    </div>

                    {/* Date + location */}
                    <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,
                      color:'#383838',marginBottom:8,lineHeight:1.6}}>
                      {date.toLocaleDateString('en-IN',{
                        weekday:'short',day:'numeric',month:'short'
                      })}
                      {' · '}
                      {date.toLocaleTimeString('en-IN',{
                        hour:'2-digit',minute:'2-digit'
                      })}
                      {w.location && (
                        <><br/>{w.location}</>
                      )}
                    </div>

                    {/* Description */}
                    {w.description && (
                      <p style={{
                        color:'#444',fontSize:12,lineHeight:1.6,
                        margin:'0 0 10px',
                        display:'-webkit-box',
                        WebkitLineClamp:2,
                        WebkitBoxOrient:'vertical',
                        overflow:'hidden',
                      }}>
                        {w.description}
                      </p>
                    )}

                    {/* XP badge */}
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{
                        fontFamily:'var(--font-jetbrains)',fontSize:10,
                        color:'#CFFF00',background:'rgba(207,255,0,0.06)',
                        padding:'3px 8px',borderRadius:99,
                      }}>
                        +{w.xp_for_attend} XP
                      </span>
                      {isToday && (
                        <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,
                          color:'#CFFF00',letterSpacing:'.04em'}}>
                          Tap card at door →
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop:48, paddingTop:24,
          borderTop:'1px solid #111',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          fontFamily:'var(--font-jetbrains)', fontSize:10,
          color:'#1e1e1e', letterSpacing:'.06em',
        }}>
          <span>// CSDC Synapse · Chathurya SDC · Seshadripuram College</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </div>
  )
}
