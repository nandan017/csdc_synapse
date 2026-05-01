'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Cursor from '@/components/Cursor'

interface Profile {
  first_name:       string
  last_name:        string
  role:             string
  member_archetype: string | null
  stream:           string
  year:             number
  bio:              string
  skills:           string[]
  avatar_url:       string | null
  github:           string
  linkedin:         string
  xp:               number
  visibility_mode:  string
  is_alumni:        boolean
  batch_year:       number
  joined:           string
  badges:           { slug:string; name:string; icon:string }[]
}

/* ── Particle field canvas ───────────────────────────────────────────────── */
function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let W = 0, H = 0
    type P = { x:number; y:number; vx:number; vy:number; size:number; alpha:number }
    let particles: P[] = []

    const build = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight
      canvas.width = W; canvas.height = H
      const count = Math.floor((W * H) / 14000)
      particles = Array.from({ length: count }, () => ({
        x:     Math.random() * W,
        y:     Math.random() * H,
        vx:    (Math.random() - 0.5) * 0.3,
        vy:    (Math.random() - 0.5) * 0.3,
        size:  Math.random() * 1.5 + 0.4,
        alpha: Math.random() * 0.25 + 0.05,
      }))
    }

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        p.x = (p.x + p.vx + W) % W
        p.y = (p.y + p.vy + H) % H
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(207,255,0,${p.alpha})`
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }

    build()
    draw()
    window.addEventListener('resize', build)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', build) }
  }, [])

  return (
    <canvas ref={ref} style={{
      position:'fixed', inset:0, width:'100%', height:'100%',
      pointerEvents:'none', zIndex:0,
    }} />
  )
}

/* ── Tilt card ───────────────────────────────────────────────────────────── */
function TiltCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref  = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r  = el.getBoundingClientRect()
    const x  = (e.clientX - r.left) / r.width  - 0.5
    const y  = (e.clientY - r.top)  / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateZ(4px)`
  }

  const onLeave = () => {
    const el = ref.current
    if (el) el.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)'
  }

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ transition:'transform .15s ease', ...style }}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */
export default function PublicProfile() {
  const { uid }   = useParams<{ uid: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [status,  setStatus]  = useState<'loading'|'found'|'notfound'>('loading')
  const [phase,   setPhase]   = useState(0)  // animation phase 0→4

  useEffect(() => {
    if (!uid) return
    fetch(`/api/u/${uid}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setProfile(d)
        setStatus('found')
        // stagger reveal phases
        setTimeout(() => setPhase(1), 100)
        setTimeout(() => setPhase(2), 500)
        setTimeout(() => setPhase(3), 900)
        setTimeout(() => setPhase(4), 1300)
      })
      .catch(() => setStatus('notfound'))
  }, [uid])

  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : '?'

  /* ── Loading ── */
  if (status === 'loading') return (
    <div style={{
      minHeight:'100vh', background:'#060606',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-jetbrains)',
    }}>
      <style>{`body{background:#060606;cursor:none}`}</style>
      <div style={{textAlign:'center'}}>
        <div style={{
          width:40, height:40, borderRadius:'50%',
          border:'1.5px solid #1a1a1a', borderTopColor:'#CFFF00',
          animation:'spin .7s linear infinite',
          margin:'0 auto 20px',
        }} />
        <div style={{fontSize:10,color:'#666',letterSpacing:'.15em'}}>
          READING NFC SIGNAL...
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  /* ── Not found ── */
  if (status === 'notfound') return (
    <div style={{
      minHeight:'100vh', background:'#060606',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-jetbrains)',
      padding:24,
    }}>
      <style>{`body{background:#060606;cursor:none}`}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" style={{width:32,height:32,objectFit:'contain',marginBottom:24,opacity:.4}} />
      <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#555',fontSize:18,letterSpacing:'-.03em',marginBottom:8}}>
        Signal lost.
      </div>
      <div style={{fontSize:11,color:'#666',letterSpacing:'.08em',marginBottom:24}}>
        This NFC card isn&apos;t registered in our system.
      </div>
      <Link href="/" style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',textDecoration:'none',
        border:'1px solid #1a1a1a',padding:'8px 16px',borderRadius:8,letterSpacing:'.06em'}}>
        ← Chathurya
      </Link>
    </div>
  )

  if (!profile) return null

  const yearLabel = profile.year === 1 ? '1st' : profile.year === 2 ? '2nd' : '3rd'
  const displayRole = profile.member_archetype ?? profile.role

  /* ── Profile ── */
  return (
    <div style={{
      minHeight:'100vh', background:'#060606',
      color:'#e0e0e0', overflowX:'hidden',
      fontFamily:'var(--font-dm-sans)',
      cursor:'none',
      position:'relative',
    }}>
      <style>{`
        body { background:#060606; cursor:none; }
        ::-webkit-scrollbar { width:2px }
        ::-webkit-scrollbar-thumb { background:#CFFF00; border-radius:2px }

        @keyframes spin      { to { transform:rotate(360deg) } }
        @keyframes crashIn   { from{opacity:0;transform:translateY(40px) skewY(2deg)} to{opacity:1;transform:translateY(0) skewY(0)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes revealBar { from{width:0} to{width:100%} }
        @keyframes float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes glowPulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes scanDown  {
          0%   { transform:translateY(-100%); opacity:.6 }
          100% { transform:translateY(100vh); opacity:0 }
        }

        .skill-tag {
          display:inline-block;
          padding:5px 13px;
          border:1px solid rgba(207,255,0,0.12);
          border-radius:99px;
          font-family:var(--font-jetbrains);
          font-size:10px;
          color:#555;
          letter-spacing:.04em;
          transition:all .2s;
          background:rgba(207,255,0,0.03);
        }
        .skill-tag:hover {
          border-color:rgba(207,255,0,0.35);
          color:#CFFF00;
          background:rgba(207,255,0,0.06);
        }
        .social-btn {
          display:inline-flex; align-items:center; gap:8px;
          padding:10px 20px;
          border:1px solid #1a1a1a;
          border-radius:10px;
          font-family:var(--font-jetbrains);
          font-size:11px; color:#666;
          text-decoration:none;
          transition:all .25s;
          letter-spacing:.04em;
          background:#0a0a0a;
        }
        .social-btn:hover {
          border-color:rgba(207,255,0,0.3);
          color:#CFFF00;
          background:rgba(207,255,0,0.04);
          transform:translateY(-2px);
        }
        .noise-layer {
          position:fixed; inset:0; pointer-events:none; z-index:1;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity:.28;
        }
        .scan-sweep {
          position:fixed; left:0; right:0; height:1px; z-index:2; pointer-events:none;
          background:linear-gradient(90deg,transparent,rgba(207,255,0,0.12),transparent);
          animation:scanDown 6s linear infinite;
        }
        @media (pointer: coarse) { body { cursor: auto !important; } * { cursor: auto !important; } }
      `}</style>

      <Cursor />

      <ParticleField />
      <div className="noise-layer" />
      <div className="scan-sweep" />

      {/* Radial glow */}
      <div style={{
        position:'fixed', top:0, left:'50%', transform:'translateX(-50%)',
        width:800, height:600, pointerEvents:'none', zIndex:0,
        background:'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(207,255,0,0.04) 0%, transparent 60%)',
      }} />

      {/* Top bar */}
      <div style={{
        position:'fixed', top:0, left:0, right:0, zIndex:10,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 32px',
        background:'rgba(6,6,6,0.7)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(255,255,255,0.03)',
      }}>
        <Link href="/" style={{
          display:'flex', alignItems:'center', gap:10, textDecoration:'none',
          opacity: phase >= 1 ? 1 : 0,
          transition:'opacity .4s ease',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{width:22,height:22,objectFit:'contain'}} />
          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',letterSpacing:'.08em'}}>
            CHATHURYA SDC
          </span>
        </Link>

        <div style={{
          display:'flex', alignItems:'center', gap:6,
          opacity: phase >= 1 ? 1 : 0,
          transition:'opacity .4s .2s ease',
        }}>
          <div style={{width:5,height:5,borderRadius:'50%',background:'#CFFF00',
            animation:'glowPulse 2s ease-in-out infinite'}} />
          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#666',letterSpacing:'.12em'}}>
            NFC VERIFIED
          </span>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{
        position:'relative', zIndex:2,
        minHeight:'100vh',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'100px 24px 60px',
      }}>

        {/* Avatar */}
        <TiltCard style={{
          marginBottom:28,
          opacity: phase >= 1 ? 1 : 0,
          animation: phase >= 1 ? 'fadeIn .6s ease forwards' : 'none',
        }}>
          <div style={{position:'relative', display:'inline-block'}}>
            {/* Outer glow ring */}
            <div style={{
              position:'absolute', inset:-8, borderRadius:'50%',
              border:'1px solid rgba(207,255,0,0.12)',
              animation:'glowPulse 3s ease-in-out infinite',
            }} />
            <div style={{
              position:'absolute', inset:-16, borderRadius:'50%',
              border:'1px solid rgba(207,255,0,0.05)',
            }} />

            {/* Avatar */}
            <div style={{
              width:110, height:110, borderRadius:'50%',
              background: 'linear-gradient(135deg,#CFFF00,#a8cc00)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-syne)', fontWeight:800,
              color:'#000', fontSize:30,
              overflow:'hidden',
              boxShadow:'0 0 40px rgba(207,255,0,0.15), 0 0 80px rgba(207,255,0,0.05)',
              animation:'float 5s ease-in-out infinite',
            }}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt=""
                  style={{width:'100%',height:'100%',objectFit:'cover'}} />
              ) : initials}
            </div>

            {/* Alumni / role badge */}
            {profile.is_alumni && (
              <div style={{
                position:'absolute', bottom:4, right:-4,
                background:'#CFFF00', color:'#000',
                fontFamily:'var(--font-jetbrains)', fontSize:8,
                fontWeight:700, letterSpacing:'.08em',
                padding:'3px 7px', borderRadius:99,
              }}>
                ALUMNI
              </div>
            )}
          </div>
        </TiltCard>

        {/* Name — crash in */}
        <div style={{
          textAlign:'center', marginBottom:8,
          opacity: phase >= 2 ? 1 : 0,
          animation: phase >= 2 ? 'crashIn .6s cubic-bezier(.16,1,.3,1) forwards' : 'none',
        }}>
          <h1 style={{
            fontFamily:'var(--font-syne)', fontWeight:800,
            color:'#ffffff', lineHeight:.9,
            letterSpacing:'-.05em', margin:0,
            fontSize:'clamp(2.8rem,8vw,5.5rem)',
          }}>
            {profile.first_name}
          </h1>
          <h1 style={{
            fontFamily:'var(--font-syne)', fontWeight:800,
            color:'#CFFF00', lineHeight:.9,
            letterSpacing:'-.05em', margin:0,
            fontSize:'clamp(2.8rem,8vw,5.5rem)',
          }}>
            {profile.last_name}
          </h1>
        </div>

        {/* Role + meta */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          marginBottom:24, flexWrap:'wrap', justifyContent:'center',
          opacity: phase >= 2 ? 1 : 0,
          animation: phase >= 2 ? 'fadeUp .5s .15s ease forwards' : 'none',
        }}>
          <span style={{
            fontFamily:'var(--font-jetbrains)', fontSize:11,
            color:'#CFFF00', letterSpacing:'.1em', textTransform:'uppercase',
          }}>
            {displayRole}
          </span>
          <span style={{width:3,height:3,borderRadius:'50%',background:'#555',display:'inline-block'}} />
          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#777',letterSpacing:'.06em'}}>
            {profile.stream}
          </span>
          <span style={{width:3,height:3,borderRadius:'50%',background:'#2a2a2a',display:'inline-block'}} />
          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#777',letterSpacing:'.06em'}}>
            {yearLabel} Year
          </span>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p style={{
            fontFamily:'var(--font-dm-sans)', fontWeight:300,
            color:'#777', fontSize:14, lineHeight:1.8,
            maxWidth:400, textAlign:'center', marginBottom:28,
            opacity: phase >= 2 ? 1 : 0,
            animation: phase >= 2 ? 'fadeUp .5s .25s ease forwards' : 'none',
          }}>
            {profile.bio}
          </p>
        )}

        {/* Divider line */}
        <div style={{
          width:1, height:32, background:'linear-gradient(to bottom,transparent,#1e1e1e,transparent)',
          marginBottom:28,
          opacity: phase >= 3 ? 1 : 0,
          animation: phase >= 3 ? 'fadeIn .4s ease forwards' : 'none',
        }} />

        {/* Skills */}
        {profile.skills.length > 0 && (
          <div style={{
            display:'flex', flexWrap:'wrap', gap:8,
            justifyContent:'center', maxWidth:480,
            marginBottom:28,
            opacity: phase >= 3 ? 1 : 0,
            animation: phase >= 3 ? 'fadeUp .5s .1s ease forwards' : 'none',
          }}>
            {profile.skills.map((s, i) => (
              <span key={s} className="skill-tag"
                style={{
                  opacity: phase >= 3 ? 1 : 0,
                  animation: phase >= 3
                    ? `fadeUp .4s ${.05 * i + .1}s ease forwards` : 'none',
                }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Badges (minimal) */}
        {profile.badges.length > 0 && (
          <div style={{
            display:'flex', gap:10, flexWrap:'wrap',
            justifyContent:'center', marginBottom:32,
            opacity: phase >= 3 ? 1 : 0,
            animation: phase >= 3 ? 'fadeUp .5s .2s ease forwards' : 'none',
          }}>
            {profile.badges.map((b, i) => (
              <div key={i} title={b.name} style={{
                width:36, height:36, borderRadius:10,
                background:'#0d0d0d', border:'1px solid #1a1a1a',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:17, transition:'all .2s',
                cursor:'default',
              }}
              onMouseEnter={e=>{
                e.currentTarget.style.borderColor='rgba(207,255,0,0.2)'
                e.currentTarget.style.background='rgba(207,255,0,0.04)'
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.borderColor='#1a1a1a'
                e.currentTarget.style.background='#0d0d0d'
              }}>
                {b.icon}
              </div>
            ))}
          </div>
        )}

        {/* Socials */}
        <div style={{
          display:'flex', gap:12, flexWrap:'wrap',
          justifyContent:'center',
          opacity: phase >= 4 ? 1 : 0,
          animation: phase >= 4 ? 'fadeUp .5s ease forwards' : 'none',
        }}>
          {profile.github && (
            <a href={`https://github.com/${profile.github}`}
              target="_blank" rel="noopener noreferrer"
              className="social-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
          )}
          {profile.linkedin && (
            <a href={`https://linkedin.com/in/${profile.linkedin}`}
              target="_blank" rel="noopener noreferrer"
              className="social-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
          )}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop:56,
          display:'flex', flexDirection:'column', alignItems:'center', gap:8,
          opacity: phase >= 4 ? 1 : 0,
          animation: phase >= 4 ? 'fadeIn .6s .3s ease forwards' : 'none',
        }}>
          <div style={{
            width:1, height:24,
            background:'linear-gradient(to bottom,transparent,#1a1a1a)',
          }} />
          <Link href="/register" style={{
            fontFamily:'var(--font-jetbrains)', fontSize:9,
            color:'#666', textDecoration:'none',
            letterSpacing:'.12em', textTransform:'uppercase',
            transition:'color .2s',
          }}
          onMouseEnter={e=>(e.currentTarget.style.color='#CFFF00')}
          onMouseLeave={e=>(e.currentTarget.style.color='#666')}>
            Chathurya Student Developers Club · Apply to join →
          </Link>
        </div>
      </div>
    </div>
  )
}
