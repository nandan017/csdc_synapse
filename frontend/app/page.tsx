'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

/* ── Pac-Man Zigzag Component ────────────────────────────────────────── */
const ZIG_COLS  = 3      // number of zigzag columns
const ZIG_ROWS  = 6      // peaks per column
const DOT_SPACING = 28   // px between dots
const PAC_SIZE  = 28

function buildZigzagPath(width: number, height: number) {
  const colW = width / ZIG_COLS
  const rowH = height / (ZIG_ROWS * 2)
  const points: {x:number; y:number; angle:number}[] = []

  for (let col = 0; col < ZIG_COLS; col++) {
    const cx = colW * col + colW / 2
    const goingDown = col % 2 === 0
    for (let row = 0; row <= ZIG_ROWS * 2; row++) {
      const r = goingDown ? row : ZIG_ROWS * 2 - row
      points.push({ x: cx, y: r * rowH, angle: goingDown ? 90 : 270 })
    }
  }
  return points
}

function PacManZigzag() {
  const [t, setT]           = useState(0)
  const [mouth, setMouth]   = useState(true)
  const containerRef        = useRef<HTMLDivElement>(null)
  const [dims, setDims]     = useState({ w: 400, h: 600 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDims({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setDims({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const path = buildZigzagPath(dims.w, dims.h)
  const totalPts = path.length

  useEffect(() => {
    let frame: number
    let pos = 0
    const run = () => {
      pos = (pos + 0.004) % 1
      setT(pos)
      frame = requestAnimationFrame(run)
    }
    frame = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setMouth(p => !p), 160)
    return () => clearInterval(iv)
  }, [])

  const pacIdx  = Math.floor(t * totalPts)
  const pac     = path[pacIdx] ?? path[0]
  const mouthDeg = mouth ? 28 : 4

  // dot eaten if pac is close
  const isEaten = (i: number) => {
    const diff = ((i / totalPts) - t + 1) % 1
    return diff < 0.06 || diff > 0.96
  }

  return (
    <div ref={containerRef} style={{
      position:'relative', height:'100vh',
      display:'flex', alignItems:'center', justifyContent:'center',
      overflow:'hidden',
    }}>
      {/* dots */}
      {path.map((pt, i) => (
        <div key={i} style={{
          position:'absolute',
          left: pt.x - 3,
          top:  pt.y - 3,
          width: 6, height: 6,
          borderRadius:'50%',
          background: '#CFFF00',
          opacity: isEaten(i) ? 0 : 0.28,
          transition:'opacity .08s',
          boxShadow: isEaten(i) ? 'none' : '0 0 5px rgba(207,255,0,0.55)',
        }} />
      ))}

      {/* Pac-Man */}
      <div style={{
        position:'absolute',
        left: pac.x - PAC_SIZE / 2,
        top:  pac.y - PAC_SIZE / 2,
        width: PAC_SIZE, height: PAC_SIZE,
        transform: `rotate(${pac.angle}deg)`,
        filter: 'drop-shadow(0 0 10px rgba(207,255,0,0.95))',
        zIndex: 3,
      }}>
        <svg width={PAC_SIZE} height={PAC_SIZE} viewBox={`0 0 ${PAC_SIZE} ${PAC_SIZE}`}>
          <path
            d={`M${PAC_SIZE/2},${PAC_SIZE/2} L${PAC_SIZE/2 + PAC_SIZE/2 * Math.cos(mouthDeg * Math.PI/180)},${PAC_SIZE/2 - PAC_SIZE/2 * Math.sin(mouthDeg * Math.PI/180)} A${PAC_SIZE/2},${PAC_SIZE/2} 0 1,1 ${PAC_SIZE/2 + PAC_SIZE/2 * Math.cos(mouthDeg * Math.PI/180)},${PAC_SIZE/2 + PAC_SIZE/2 * Math.sin(mouthDeg * Math.PI/180)} Z`}
            fill="#CFFF00"
          />
          {/* Eye */}
          <circle
            cx={PAC_SIZE/2 + 4}
            cy={PAC_SIZE/2 - 6}
            r={2}
            fill="#000"
          />
        </svg>
      </div>

      {/* Subtle vertical lines connecting zigzag columns */}
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',opacity:.06}} >
        {Array.from({length: ZIG_COLS}).map((_,i) => {
          const cx = dims.w / ZIG_COLS * i + dims.w / ZIG_COLS / 2
          return <line key={i} x1={cx} y1={0} x2={cx} y2={dims.h} stroke="#CFFF00" strokeWidth={1} strokeDasharray="4 8" />
        })}
      </svg>
    </div>
  )
}

/* ── Data ──────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '⚡', title: 'NFC Identity Cards', desc: 'Every member gets a physical NFC card — your digital identity in your pocket. Tap to login, share contacts, mark attendance.' },
  { icon: '🏆', title: 'XP & Leaderboards', desc: 'Earn points for attending workshops, completing tasks and contributing. Climb the real-time leaderboard and unlock badges.' },
  { icon: '🔨', title: 'Real Projects', desc: 'Work on actual projects with your peers. Not just tutorials — real code, real problems, real experience.' },
  { icon: '🎓', title: 'Alumni Network', desc: 'Graduate but never leave. Alumni cards, mentorship slots and resource vault access — the community stays with you.' },
  { icon: '📦', title: 'Resource Vault', desc: 'Access curated code modules, repos and ongoing projects left by seniors. Pick up where they left off.' },
  { icon: '🎯', title: 'Workshop Missions', desc: 'Every workshop comes with tasks — daily and weekly. Complete them, get reviewed, earn XP and grow fast.' },
]

const WORKSHOPS = [
  {
    tag: 'Workshop 01',
    title: 'Web Development',
    desc: 'A hands-on workshop covering the fundamentals of modern web development — HTML, CSS, JavaScript and building real projects from scratch.',
    status: 'Completed',
    icon: '🌐',
  },
  {
    tag: 'Workshop 02',
    title: 'Python · CS50',
    desc: "Based on Harvard's CS50 course material — video lectures, problem sets and guided sessions. Algorithmic thinking meets Python fundamentals.",
    status: 'Completed',
    icon: '🐍',
  },
  {
    tag: 'Workshop 03',
    title: 'Coming Soon',
    desc: "The next workshop is being planned. Stay tuned — it's going to be something special.",
    status: 'Upcoming',
    icon: '⏳',
  },
]

const TEAM = [
  { name: 'Lead 1', role: 'Club Lead', bio: 'Placeholder bio — update with real info.' },
  { name: 'Lead 2', role: 'Co-Lead', bio: 'Placeholder bio — update with real info.' },
  { name: 'Lead 3', role: 'Lead', bio: 'Placeholder bio — update with real info.' },
  { name: 'Lead 4', role: 'Lead', bio: 'Placeholder bio — update with real info.' },
  { name: 'Lead 5', role: 'Lead', bio: 'Placeholder bio — update with real info.' },
  { name: 'Prof. Name', role: 'Teacher Coordinator', bio: "Faculty mentor guiding Chathurya's vision at Seshadripuram College." },
]

const TESTIMONIALS = [
  { quote: "Chathurya changed how I think about building things. The NFC card alone made me feel like I was part of something real.", name: 'Member Name', role: '2nd Year, BCA' },
  { quote: "The workshops are different here — you're not just watching, you're doing. CS50 sessions were genuinely challenging and fun.", name: 'Member Name', role: '1st Year, BCA' },
  { quote: "Being part of a club that actually has systems, leaderboards and identity cards — it felt like a startup, not a college club.", name: 'Member Name', role: '2nd Year, BCA' },
]

const PATH_W = 420
const PATH_H = 180
const DOT_COUNT = 32

/* ── Loader ──────────────────────────────────────────────────────────── */
function Loader() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('csdc_loaded')
    if (seen) { setDone(true); return }
    const t = setTimeout(() => {
      setDone(true)
      sessionStorage.setItem('csdc_loaded', '1')
    }, 3200)
    return () => clearTimeout(t)
  }, [])

  if (done) return null

  return (
    <div id="loader">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Chathurya"
        className="logo-glitch"
        style={{
          width: 80, height: 80,
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 12px rgba(207,255,0,0.8))',
        }}
      />
      <div className="loader-text">Chathurya</div>
    </div>
  )
}

/* ── Cursor ──────────────────────────────────────────────────────────── */
function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + 'px'
        dotRef.current.style.top  = e.clientY + 'px'
        dotRef.current.style.opacity = '1'
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div ref={dotRef} style={{
      position:'fixed', zIndex:10000, pointerEvents:'none',
      width:8, height:8, borderRadius:'50%',
      background:'#CFFF00',
      transform:'translate(-50%,-50%)',
      boxShadow:'0 0 8px rgba(207,255,0,0.7)',
      opacity:0,
      transition:'opacity .2s',
    }} />
  )
}

/* ── Glitch Logo ─────────────────────────────────────────────────────── */
function GlitchLogo() {
  return (
    <div style={{position:'relative', display:'inline-block'}}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Chathurya"
        className="logo-glitch"
        style={{
          width:'clamp(120px,14vw,180px)',
          height:'clamp(120px,14vw,180px)',
          objectFit:'contain',
          display:'block',
          filter:'drop-shadow(0 0 14px rgba(207,255,0,0.75)) drop-shadow(0 0 3px #CFFF00)',
        }}
      />
    </div>
  )
}

/* ── Hero Canvas (dots + pac-man + ghost) ────────────────────────────── */
function HeroCanvas() {
  useEffect(() => {
    const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const SPACING  = 36
    const REPEL_R  = 110
    const REPEL_F  = 38
    const PAC_SIZE = 14
    const DOT_R    = 1.4

    let W = 0, H = 0
    let mouse = { x: -999, y: -999 }

    type Dot = { ox:number; oy:number; x:number; y:number; eaten:boolean; regen:number }
    let dots: Dot[] = []
    let cols: number[] = []   // x positions of dot columns

    // Two pac+ghost pairs on separate columns
    type Walker = {
      colIdx: number   // which column they walk
      y: number        // current y
      speed: number
      isGhost: boolean
      pacImg: HTMLImageElement
      ghostImg: HTMLImageElement
    }

    const pacImg   = new Image(); pacImg.src   = 'https://ytohucehzdlsfpfxzvkj.supabase.co/storage/v1/object/public/media/pacman/pacman.png'
    const ghostImg = new Image(); ghostImg.src = 'https://ytohucehzdlsfpfxzvkj.supabase.co/storage/v1/object/public/media//pacman/ghost.png'

    // pair state: ghost leads, pac follows
    type Pair = { ghostY: number; pacY: number; colIdx: number; speed: number }
    let pairs: Pair[] = []

    const build = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width  = W
      canvas.height = H

      dots = []
      cols = []

      let ci = 0
      for (let x = SPACING / 2; x < W; x += SPACING) {
        cols.push(x)
        for (let y = SPACING / 2; y < H; y += SPACING) {
          dots.push({ ox:x, oy:y, x, y, eaten:false, regen:0 })
        }
        ci++
      }

     const c1 = Math.floor(cols.length * 0.10)
    pairs = [
        { ghostY: SPACING * 3, pacY: SPACING * 7, colIdx: c1, speed: 0.65 },
    ]

    }
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onLeave = () => { mouse = { x:-999, y:-999 } }

    // use section element as event target so it covers full hero
    const section = canvas.parentElement!
    section.addEventListener('mousemove', onMove)
    section.addEventListener('mouseleave', onLeave)

    let frame: number
    const now = () => performance.now()

    const draw = () => {
      frame = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, W, H)

      const t = now()

      // move pairs
      pairs.forEach(p => {
        p.ghostY += p.speed
        p.pacY   += p.speed
        // loop back when ghost exits bottom
        if (p.ghostY > H + PAC_SIZE * 2) {
          p.ghostY = -PAC_SIZE * 4
          p.pacY   = -PAC_SIZE * 8
        }
        // eat dots near pac
        const cx = cols[p.colIdx]
        dots.forEach(d => {
          if (Math.abs(d.ox - cx) < 2 && Math.abs(d.oy - p.pacY) < SPACING * 0.6) {
            d.eaten = true
            d.regen = t + 3000   // regenerate after 3s
          }
          if (d.eaten && t > d.regen) d.eaten = false
        })
      })

      // draw dots
      dots.forEach(d => {
        if (d.eaten) return
        const dx = d.x - mouse.x, dy = d.y - mouse.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if (dist < REPEL_R && dist > 0) {
          const push = (1 - dist / REPEL_R) * REPEL_F
          d.x += (dx / dist) * push * 0.09
          d.y += (dy / dist) * push * 0.09
        }
        d.x += (d.ox - d.x) * 0.07
        d.y += (d.oy - d.y) * 0.07

        ctx.beginPath()
        ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(207,255,0,0.2)'
        ctx.fill()
      })

      // draw pac+ghost pairs
      pairs.forEach(p => {
        const cx = cols[p.colIdx]

        // pac-man — mouth open/close via canvas rotation trick
        if (pacImg.complete) {
          const mouth = Math.abs(Math.sin(t * 0.01)) * 0.4  // 0–0.4 radians
          ctx.save()
          ctx.translate(cx, p.pacY)
          ctx.rotate(Math.PI / 2)   // facing down (moving downward)
          // draw pac as circle with mouth cutout
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.arc(0, 0, PAC_SIZE/2, mouth, Math.PI * 2 - mouth)
          ctx.closePath()
          ctx.fillStyle = '#CFFF00'
          ctx.shadowColor = 'rgba(207,255,0,0.9)'
          ctx.shadowBlur  = 6
          ctx.fill()
          ctx.shadowBlur  = 0
          ctx.restore()
        }
        if (ghostImg.complete) {
            ctx.drawImage(ghostImg, cx - PAC_SIZE/2, p.ghostY - PAC_SIZE/2, PAC_SIZE, PAC_SIZE)
        }
      })
    }

    build()
    window.addEventListener('resize', build)
    draw()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', build)
      section.removeEventListener('mousemove', onMove)
      section.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return null
}
function StatCard({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState('0')
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !triggered) {
        setTriggered(true)
        obs.disconnect()
        // numeric values only — animate count up
        const num = parseInt(value.replace(/\D/g,''))
        if (!num) { setDisplay(value); return }
        const suffix = value.replace(/[0-9]/g,'')
        const duration = 1200
        const start = performance.now()
        const tick = (now: number) => {
          const elapsed = now - start
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setDisplay(Math.floor(eased * num) + suffix)
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [triggered, value])

  return (
    <div ref={ref} className="reveal" style={{textAlign:'center'}}>
      <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:'1.7rem',lineHeight:1,letterSpacing:'-.04em',transition:'all .1s'}}>
        {triggered ? display : '0'}
      </div>
      <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.1em',textTransform:'uppercase',marginTop:4}}>{label}</div>
    </div>
  )
}

function getPacXY(t: number, W: number, H: number) {
  const perim = 2 * (W + H)
  const d = t * perim
  if (d < W)       return { x: d,           y: 0,       angle: 0   }
  if (d < W + H)   return { x: W,           y: d - W,   angle: 90  }
  if (d < 2*W + H) return { x: W-(d-W-H),   y: H,       angle: 180 }
  return                   { x: 0,           y: H-(d-2*W-H), angle: 270 }
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [pacPos, setPacPos]                 = useState(0)
  const [mouthOpen, setMouthOpen]           = useState(true)
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)
  const [navUser, setNavUser]               = useState<any>(null)
  const [navAvatar, setNavAvatar]           = useState<string | null>(null)
  const [navInitials, setNavInitials]       = useState('U')

  // Check if user is logged in for nav avatar
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setNavUser(data.user)
      // Try to get member info for avatar/initials
      sb.from('members').select('first_name, last_name, avatar_url')
        .eq('auth_user_id', data.user.id).single()
        .then(({ data: m }) => {
          if (m) {
            setNavAvatar(m.avatar_url)
            setNavInitials(`${(m.first_name||'U')[0]}${(m.last_name||'')[0]}`)
          }
        })
    })
  }, [])

  // Supabase fallback: if password reset redirect lands here instead of /reset-password
  useEffect(() => {
    // Handle ?code= (PKCE) or #access_token= (implicit) landing on wrong page
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash
    if (params.get('code') || (hash && hash.includes('type=recovery'))) {
      window.location.href = `/reset-password${window.location.search}${hash}`
    }
  }, [])

  useEffect(() => {
    let frame: number
    let t = 0
    const animate = () => {
      t = (t + 0.0014) % 1
      setPacPos(t)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setMouthOpen(p => !p), 160)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setActiveTestimonial(t => (t + 1) % TESTIMONIALS.length), 4200)
    return () => clearInterval(iv)
  }, [])

  const { x: px, y: py, angle: pAngle } = getPacXY(pacPos, PATH_W, PATH_H)
  const mouth = mouthOpen ? 28 : 4

  return (
    <div style={{background:'#080808', color:'#e0e0e0', minHeight:'100vh', overflowX:'hidden', cursor:'none'}}>

     <Loader />
     <Cursor />

      <div className="noise-bg" />

      {/* ── NAVBAR ── */}

        <nav style={{
        position:'sticky', top:0, left:0, right:0, zIndex:100,
        padding:'14px 48px',
        background:'rgba(8,8,8,0.95)',
        backdropFilter:'blur(16px)',
        borderBottom:'1px solid #161616',
        }} className="nav-pad">
        <div style={{maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <Link href="/" style={{display:'flex',alignItems:'center',gap:12,textDecoration:'none'}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Chathurya" style={{width:32,height:32,objectFit:'contain'}} />
            <div>
              <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:15,letterSpacing:'-.02em'}}>Chathurya</div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#444',letterSpacing:'.08em'}}>Student Developers Club</div>
            </div>
          </Link>
          <div style={{display:'flex',alignItems:'center',gap:32}}>
            {['About','Features','Workshops','Team'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hide-mobile"
                style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#555',textDecoration:'none',letterSpacing:'.06em',textTransform:'uppercase',transition:'color .2s'}}
                onMouseEnter={e=>(e.currentTarget.style.color='#CFFF00')}
                onMouseLeave={e=>(e.currentTarget.style.color='#555')}>
                {item}
              </a>
            ))}
            <Link href="/reaction" className="hide-mobile"
              style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#ff3333',textDecoration:'none',letterSpacing:'.06em',textTransform:'uppercase',transition:'color .2s',display:'flex',alignItems:'center',gap:5}}
              onMouseEnter={e=>(e.currentTarget.style.color='#CFFF00')}
              onMouseLeave={e=>(e.currentTarget.style.color='#ff3333')}>
              🏎️ Reaction
            </Link>
            {navUser ? (
              <Link href="/dashboard" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
                <div style={{
                  width:34,height:34,borderRadius:'50%',
                  background:'linear-gradient(135deg,#CFFF00,#a8cc00)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'var(--font-syne)',fontWeight:800,color:'#000',fontSize:12,
                  overflow:'hidden',border:'2px solid rgba(207,255,0,0.3)',
                  transition:'border-color .2s',cursor:'pointer',
                }}>
                  {navAvatar
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={navAvatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                    : navInitials}
                </div>
              </Link>
            ) : (
              <>
                <Link href="/login" style={{
                  fontFamily:'var(--font-syne)',fontWeight:700,fontSize:13,
                  color:'#CFFF00',background:'transparent',
                  padding:'7px 18px',borderRadius:10,
                  border:'1.5px solid #CFFF00',
                  textDecoration:'none',transition:'all .2s',
                  letterSpacing:'-.01em',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(207,255,0,0.07)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                  Login
                </Link>
                <Link href="/register" style={{
                  fontFamily:'var(--font-syne)',fontWeight:800,fontSize:13,
                  color:'#000',background:'#CFFF00',padding:'8px 20px',borderRadius:10,
                  textDecoration:'none',transition:'opacity .2s',
                }}
                onMouseEnter={e=>(e.currentTarget.style.opacity='.85')}
                onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                  Apply →
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
<section id="hero" style={{
  minHeight:'100vh',
  display:'flex',
  flexDirection:'column',
  alignItems:'center',
  justifyContent:'center',
  position:'relative',
  overflow:'hidden',
  padding:'80px 16px 80px',
}}>
  <canvas id="hero-canvas" style={{
  position:'absolute', inset:0,
  width:'100%', height:'100%',
  pointerEvents:'none', zIndex:0,
}} />
<HeroCanvas />

  {/* Content */}
  <div style={{position:'relative', zIndex:2, textAlign:'center', width:'100%'}}>

    {/* Eyebrow */}
    <div className="fade-up d1" style={{
      fontFamily:'var(--font-jetbrains)', fontSize:10,
      color:'#CFFF00', letterSpacing:'.2em',
      textTransform:'uppercase', marginBottom:32,
      display:'flex', alignItems:'center', justifyContent:'center', gap:14, flexWrap:'wrap',
    }}>
      <span className="hide-mobile" style={{width:32, height:1, background:'#CFFF00', display:'inline-block'}} />
      Est. 2025 · Seshadripuram College · Invite-Only
      <span className="hide-mobile" style={{width:32, height:1, background:'#CFFF00', display:'inline-block'}} />
    </div>

    {/* Logo — glitch flicker */}
    <div className="fade-up d2" style={{
      display:'flex', justifyContent:'center', marginBottom:28,
    }}>
      <GlitchLogo />
    </div>

    {/* Wordmark */}
    <h1 className="fade-up d2" style={{
      fontFamily:'var(--font-syne)', fontWeight:800,
      color:'#fff', lineHeight:.88,
      letterSpacing:'-.05em', textAlign:'center',
      fontSize:'clamp(2.5rem,9vw,8rem)', 
      wordBreak:'break-word',
      marginBottom:16,
    }}>
      Chathurya
    </h1>

    {/* Shimmer tagline */}
    <p className="fade-up d3 shimmer-text" suppressHydrationWarning style={{
  fontFamily:'var(--font-syne)', fontWeight:700,
  fontSize:'clamp(1rem,1.8vw,1.5rem)',
  letterSpacing:'-.02em',
  marginBottom:20,
}}>
  Build. Connect. Belong.
</p>

    <p className="fade-up d3" style={{
      color:'#484848', fontWeight:300,
      maxWidth:400, margin:'0 auto 40px',
      lineHeight:1.8, fontSize:14,
    }}>
      The student developers club at Seshadripuram College — where curiosity meets code and community.
    </p>

    {/* CTAs */}
    <div className="fade-up d4" style={{
      display:'flex', alignItems:'center',
      justifyContent:'center', gap:14, flexWrap:'wrap',
      marginBottom:64,
    }}>
      <Link href="/register" style={{
        fontFamily:'var(--font-syne)', fontWeight:800, fontSize:13,
        color:'#000', background:'#CFFF00',
        padding:'13px 28px', borderRadius:11,
        textDecoration:'none', transition:'all .25s',
        letterSpacing:'-.01em',
      }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(207,255,0,0.14)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
        Apply for Membership →
      </Link>
      <a href="#about" style={{
        fontFamily:'var(--font-jetbrains)', fontSize:11, color:'#3a3a3a',
        border:'1px solid #1a1a1a', padding:'13px 20px', borderRadius:11,
        textDecoration:'none', transition:'all .25s',
      }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(207,255,0,0.2)';e.currentTarget.style.color='#CFFF00'}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='#1a1a1a';e.currentTarget.style.color='#3a3a3a'}}>
        Learn more ↓
      </a>
    </div>
  </div>

  {/* Bottom fade */}
  <div style={{
    position:'absolute', bottom:0, left:0, right:0, height:100,
    background:'linear-gradient(to bottom, transparent, #080808)',
    pointerEvents:'none', zIndex:3,
  }} />
</section>

      {/* ── STATS BAR ── */}
      <div style={{borderTop:'1px solid #111',borderBottom:'1px solid #111',padding:'20px 24px',background:'rgba(10,10,10,0.9)'}}>
        <div className="stats-grid" style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,textAlign:'center'}}>
          {[['2025','Founded'],['5','Club Leads'],['2+','Workshops'],['Invite-Only','Membership']].map(([v,l]) => (
  <StatCard key={l} value={v} label={l} />
))}
        </div>
      </div>

      {/* ── ABOUT ── */}
      <section id="about" style={{padding:'112px 24px',position:'relative'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center'}} className="about-grid">
          <div className="reveal">
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
              <span style={{width:20,height:1,background:'#CFFF00',display:'inline-block'}} />About
            </div>
            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',lineHeight:.95,letterSpacing:'-.04em',fontSize:'clamp(2.2rem,4vw,3.5rem)',marginBottom:24}}>
              Not just a club.<br/><span style={{color:'#CFFF00'}}>A community.</span>
            </h2>
            <p style={{color:'#555',lineHeight:1.85,fontWeight:300,marginBottom:14,fontSize:15}}>
              Chathurya is Seshadripuram College's Student Developers Club — a tight-knit circle of curious minds who love building things, breaking things, and learning from both.
            </p>
            <p style={{color:'#444',lineHeight:1.85,fontWeight:300,fontSize:14}}>
              We run workshops, build real projects, and give every member a physical NFC identity card. It's invite-only because we care about the community we're building — not the headcount.
            </p>
            <div style={{marginTop:28,display:'flex',flexWrap:'wrap',gap:8}}>
              {['CS Students','Builders','Curious Minds','Collaborative'].map(tag => (
                <span key={tag} style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',border:'1px solid #1a1a1a',padding:'4px 12px',borderRadius:99,letterSpacing:'.04em'}}>{tag}</span>
              ))}
            </div>
          </div>
          {/* 3D card */}
          <div className="reveal" style={{display:'flex',justifyContent:'center'}}>
            <div className="card-hover" style={{
              position:'relative',width:260,height:320,borderRadius:20,
              border:'1px solid #1e1e1e',display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:16,
              background:'linear-gradient(135deg,#0f0f0f 0%,#0a0a0a 100%)',
            }}>
              <div style={{position:'absolute',inset:0,borderRadius:20,background:'radial-gradient(ellipse at 50% 0%,rgba(207,255,0,0.055) 0%,transparent 60%)',pointerEvents:'none'}} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" style={{width:72,height:72,objectFit:'contain',position:'relative',zIndex:1,animation:'floatY 4s ease-in-out infinite',filter:'drop-shadow(0 0 14px rgba(207,255,0,0.45))'}} />
              <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
                <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:17,letterSpacing:'-.02em'}}>Chathurya</div>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#383838',letterSpacing:'.1em',marginTop:4}}>Student Developers Club</div>
              </div>
              <div style={{position:'relative',zIndex:1,fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#2a2a2a',letterSpacing:'.1em',border:'1px solid #191919',padding:'4px 12px',borderRadius:99}}>Est. 2025 · Seshadripuram</div>
              {/* Corner marks */}
              {[['top-3 left-3','border-t border-l'],['top-3 right-3','border-t border-r'],['bottom-3 left-3','border-b border-l'],['bottom-3 right-3','border-b border-r']].map(([pos,brd],i) => (
                <div key={i} style={{position:'absolute',width:14,height:14,
                  ...(i===0?{top:12,left:12,borderTop:'1px solid rgba(207,255,0,0.15)',borderLeft:'1px solid rgba(207,255,0,0.15)'}:{}),
                  ...(i===1?{top:12,right:12,borderTop:'1px solid rgba(207,255,0,0.15)',borderRight:'1px solid rgba(207,255,0,0.15)'}:{}),
                  ...(i===2?{bottom:12,left:12,borderBottom:'1px solid rgba(207,255,0,0.15)',borderLeft:'1px solid rgba(207,255,0,0.15)'}:{}),
                  ...(i===3?{bottom:12,right:12,borderBottom:'1px solid rgba(207,255,0,0.15)',borderRight:'1px solid rgba(207,255,0,0.15)'}:{}),
                }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{padding:'112px 24px',borderTop:'1px solid #0f0f0f'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="reveal" style={{textAlign:'center',marginBottom:64}}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:14}}>What We Offer</div>
            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',letterSpacing:'-.04em',lineHeight:.95,fontSize:'clamp(2rem,4vw,3.2rem)'}}>
              Built different.<br/><span style={{color:'#CFFF00'}}>By design.</span>
            </h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}} className="features-grid">
            {FEATURES.map((f,i) => (
              <div key={f.title} className="reveal card-hover"
                style={{
                  padding:24,borderRadius:18,border:'1px solid',
                  borderColor: hoveredFeature===i ? 'rgba(207,255,0,0.18)' : '#141414',
                  background: hoveredFeature===i ? 'rgba(207,255,0,0.025)' : '#0b0b0b',
                  cursor:'default',
                }}
                onMouseEnter={()=>setHoveredFeature(i)}
                onMouseLeave={()=>setHoveredFeature(null)}>
                <div style={{fontSize:24,marginBottom:16}}>{f.icon}</div>
                <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',fontSize:14,marginBottom:8,letterSpacing:'-.02em'}}>{f.title}</div>
                <div style={{color:'#484848',fontSize:13,lineHeight:1.75,fontWeight:300}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKSHOPS ── */}
      <section id="workshops" style={{padding:'112px 24px',borderTop:'1px solid #0f0f0f'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="reveal" style={{textAlign:'center',marginBottom:64}}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:14}}>Events & Workshops</div>
            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',letterSpacing:'-.04em',lineHeight:.95,fontSize:'clamp(2rem,4vw,3.2rem)'}}>
              Learn by doing.<br/><span style={{color:'#CFFF00'}}>Always.</span>
            </h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}} className="workshops-grid">
            {WORKSHOPS.map((w,i) => (
              <div key={w.title} className="reveal card-hover"
                style={{
                  padding:28,borderRadius:18,
                  border:`1px ${w.status==='Upcoming'?'dashed':'solid'} ${w.status==='Upcoming'?'#191919':'#1a1a1a'}`,
                  background: w.status==='Upcoming' ? 'transparent' : '#0b0b0b',
                  display:'flex',flexDirection:'column',gap:16,
                }}>
                <div style={{fontSize:28}}>{w.icon}</div>
                <div>
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:4}}>{w.tag}</div>
                  <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',fontSize:18,letterSpacing:'-.02em'}}>{w.title}</div>
                </div>
                <p style={{color:'#484848',fontSize:13,lineHeight:1.75,fontWeight:300,flex:1}}>{w.desc}</p>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:w.status==='Completed'?'#CFFF00':'#282828'}} />
                  <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,letterSpacing:'.08em',color:w.status==='Completed'?'#CFFF00':'#383838'}}>{w.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section id="team" style={{padding:'112px 24px',borderTop:'1px solid #0f0f0f'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="reveal" style={{textAlign:'center',marginBottom:64}}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:14}}>The Team</div>
            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',letterSpacing:'-.04em',lineHeight:.95,fontSize:'clamp(2rem,4vw,3.2rem)'}}>
              The people<br/><span style={{color:'#CFFF00'}}>behind it all.</span>
            </h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}} className="team-grid">
            {TEAM.map((m,i) => (
              <div key={i} className="reveal card-hover"
                style={{padding:24,borderRadius:18,border:'1px solid #141414',background:'#0b0b0b',display:'flex',flexDirection:'column',gap:12}}>
                <div style={{width:44,height:44,borderRadius:'50%',border:'1px solid #222',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#141414,#0f0f0f)'}}>
                  <span style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:16}}>{m.name.charAt(0)}</span>
                </div>
                <div>
                  <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',fontSize:14,letterSpacing:'-.02em'}}>{m.name}</div>
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.06em',marginTop:2}}>{m.role}</div>
                </div>
                <p style={{color:'#3a3a3a',fontSize:12,lineHeight:1.7,fontWeight:300}}>{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{padding:'112px 24px',borderTop:'1px solid #0f0f0f',background:'radial-gradient(ellipse 70% 50% at 50% 50%,rgba(207,255,0,0.02) 0%,transparent 65%)'}}>
        <div style={{maxWidth:740,margin:'0 auto',textAlign:'center'}}>
          <div className="reveal" style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:48}}>
            What Members Say
          </div>
          <div style={{position:'relative',minHeight:180,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {TESTIMONIALS.map((t,i) => (
              <div key={i} style={{
                position:'absolute',inset:0,display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',
                opacity: activeTestimonial===i ? 1 : 0,
                transform: activeTestimonial===i ? 'translateY(0)' : 'translateY(10px)',
                transition:'opacity .5s ease, transform .5s ease',
                pointerEvents: activeTestimonial===i ? 'auto' : 'none',
              }}>
                <p style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',lineHeight:1.45,letterSpacing:'-.02em',marginBottom:20,fontSize:'clamp(1.05rem,2.2vw,1.35rem)'}}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#383838'}}>
                  {t.name} · <span style={{color:'#2e2e2e'}}>{t.role}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:48}}>
            {TESTIMONIALS.map((_,i) => (
              <button key={i} onClick={()=>setActiveTestimonial(i)}
                style={{borderRadius:99,border:'none',cursor:'pointer',transition:'all .3s',
                  width: activeTestimonial===i ? 20 : 6,
                  height:6,
                  background: activeTestimonial===i ? '#CFFF00' : '#1e1e1e',
                }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── APPLY CTA ── */}
      <section style={{padding:'128px 24px',borderTop:'1px solid #0f0f0f',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 70% 55% at 50% 50%,rgba(207,255,0,0.04) 0%,transparent 60%)',pointerEvents:'none'}} />
        <div style={{maxWidth:680,margin:'0 auto',textAlign:'center',position:'relative',zIndex:1}}>
          <div className="reveal" style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:20}}>Ready to join?</div>
          <h2 className="reveal" style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',lineHeight:.92,letterSpacing:'-.05em',marginBottom:20,fontSize:'clamp(2.8rem,7vw,5.5rem)'}}>
            Your invite<br/>is waiting.
          </h2>
          <p className="reveal" style={{color:'#484848',fontSize:15,lineHeight:1.8,fontWeight:300,marginBottom:40,maxWidth:400,margin:'0 auto 40px'}}>
            Applications are reviewed by our leads. If selected, you get a personal invite. Exclusive because it means something.
          </p>
          <div className="reveal">
            <Link href="/register" style={{
              display:'inline-flex',alignItems:'center',gap:12,
              fontFamily:'var(--font-syne)',fontWeight:800,fontSize:15,
              color:'#000',background:'#CFFF00',
              padding:'16px 40px',borderRadius:14,textDecoration:'none',
              transition:'all .25s',letterSpacing:'-.01em',
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(207,255,0,0.12)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
              Apply for Membership <span style={{fontSize:18}}>→</span>
            </Link>
          </div>
          <div className="reveal" style={{marginTop:20,fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#252525',letterSpacing:'.08em'}}>
            // invite-only · reviewed by leads · seshadripuram college
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{borderTop:'1px solid #0f0f0f',padding:'40px 24px'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:20}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Chathurya" style={{width:28,height:28,objectFit:'contain',opacity:.7}} />
            <div>
              <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:13,letterSpacing:'-.02em'}}>Chathurya</div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#2a2a2a',letterSpacing:'.06em'}}>Student Developers Club · Est. 2025</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:24}}>
            {[
              {label:'Email', href:'mailto:chathuryastudentdevclub@gmail.com'},
              {label:'LinkedIn', href:'https://www.linkedin.com/company/106989066/'},
              {label:'Instagram', href:'https://instagram.com/chathuryasdc'},
            ].map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#333',textDecoration:'none',letterSpacing:'.04em',transition:'color .2s'}}
                onMouseEnter={e=>(e.currentTarget.style.color='#CFFF00')}
                onMouseLeave={e=>(e.currentTarget.style.color='#333')}>
                {s.label}
              </a>
            ))}
          </div>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#1e1e1e',letterSpacing:'.06em',width:'100%',textAlign:'center'}}>
            © 2025 Chathurya SDC
          </div>
        </div>
      </footer>

      <SectionReveal />
    </div>
  )
}

function SectionReveal() {
  useEffect(() => {
    const run = () => {
      const els = document.querySelectorAll('.reveal')
      const obs = new IntersectionObserver(
        entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target) } }),
        { threshold: 0.1 }
      )
      els.forEach(el => obs.observe(el))
      return () => obs.disconnect()
    }
    const t = setTimeout(run, 100)
    return () => clearTimeout(t)
  }, [])
  return null
}