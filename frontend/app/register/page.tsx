'use client'

import { useEffect, useRef, useState } from 'react'

/* ── Types ───────────────────────────────────────────────────────────────── */
type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | ''

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  year: string
  section: string
  stream: string
  password: string
  confirmPassword: string
  linkedin: string
  github: string
  tshirtSize: Size
  whyJoin: string
  suggestions: string
}

interface FormErrors {
  [key: string]: string
}

const PLAYLIST = [
  { title: 'Kids', artist: 'Kyle Dixon & Michael Stein', src: '/audio/kids.mp3' },
  // Add more tracks here later:
  // { title: 'Clair de Lune', artist: 'Debussy', src: '/audio/clair.mp3' },
  // { title: 'Song Title', artist: 'Artist', src: '/audio/file.mp3' },
]

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function pwdScore(v: string): number {
  let s = 0
  if (v.length >= 8) s++
  if (/[A-Z]/.test(v)) s++
  if (/[a-z]/.test(v)) s++
  if (/[0-9]/.test(v)) s++
  if (/[^A-Za-z0-9]/.test(v)) s++
  return s
}

function pwdError(v: string): string | null {
  if (!v) return null
  if (v.length < 8) return 'Min. 8 characters'
  if (!/[A-Z]/.test(v)) return 'Add an uppercase letter'
  if (!/[a-z]/.test(v)) return 'Add a lowercase letter'
  if (!/[0-9]/.test(v)) return 'Add a number'
  if (!/[^A-Za-z0-9]/.test(v)) return 'Add a special character (!@#$...)'
  return null
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  /* ── refs ── */
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const heroRef     = useRef<HTMLDivElement>(null)
  const glowRef     = useRef<HTMLDivElement>(null)
  const dotRef      = useRef<HTMLDivElement>(null)
  const ringRef     = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mouseRef    = useRef({ x: 0, y: 0 })
  const ringPos     = useRef({ x: 0, y: 0 })

  /* ── state ── */
  const [form, setForm]       = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '',
    year: '', section: '', stream: '', password: '', confirmPassword: '',
    linkedin: '', github: '', tshirtSize: '',
    whyJoin: '', suggestions: '',
  })
  const [errors, setErrors]   = useState<FormErrors>({})
  const [checks, setChecks]   = useState({ c1: false, c2: false, c3: false })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tshirtOpen, setTshirtOpen] = useState(false)
  const [termsOpen, setTermsOpen]   = useState(false)
  const [strength, setStrength]     = useState(0)
  const [progress, setProgress]     = useState(0)
  const [showPwd, setShowPwd]             = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [rickMode, setRickMode] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(0)

  /* ── progress calc ── */
  useEffect(() => {
    const required = ['firstName','lastName','email','phone','year','section', 'stream',
                      'password','confirmPassword','linkedin','github','whyJoin']
    const filled = required.filter(k => (form as any)[k]).length
    const chkCount = Object.values(checks).filter(Boolean).length
    const hasSz = form.tshirtSize ? 1 : 0
    setProgress(Math.round(((filled + chkCount + hasSz) / (required.length + 3 + 1)) * 100))
  }, [form, checks])

  /* ── Three.js background ── */
  useEffect(() => {
    let animId: number
    const canvas = canvasRef.current
    if (!canvas) return
    // Dynamically import Three.js (already in package.json)
    import('three').then((THREE) => {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setSize(innerWidth, innerHeight)

      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100)
      camera.position.z = 5

      /* Particles */
      const N   = 900
      const geo = new THREE.BufferGeometry()
      const pos = new Float32Array(N * 3)
      const sz  = new Float32Array(N)
      const dl  = new Float32Array(N)
      for (let i = 0; i < N; i++) {
        pos[i*3]   = (Math.random()-.5)*22
        pos[i*3+1] = (Math.random()-.5)*22
        pos[i*3+2] = (Math.random()-.5)*12
        sz[i]  = Math.random()*2.4+.5
        dl[i]  = Math.random()*Math.PI*2
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('size',     new THREE.BufferAttribute(sz,  1))
      geo.setAttribute('delay',    new THREE.BufferAttribute(dl,  1))

      const pMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2() } },
        vertexShader: `
          attribute float size; attribute float delay;
          uniform float uTime; uniform vec2 uMouse;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            float t = uTime*.38+delay;
            p.y += sin(t+p.x*.28)*.2; p.x += cos(t*.7+p.y*.2)*.13;
            vec4 mv = modelViewMatrix*vec4(p,1.);
            float dist = length(vec2(mv.x,mv.y)-uMouse*5.);
            float rep = smoothstep(1.4,.0,dist)*.65;
            if(dist>.01){ p.x+=normalize(p.xy-uMouse*5.).x*rep; p.y+=normalize(p.xy-uMouse*5.).y*rep; }
            vAlpha = .12+.3*sin(t*1.25+delay);
            gl_PointSize = size*(270./-mv.z);
            gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.);
          }`,
        fragmentShader: `
          varying float vAlpha;
          void main(){
            float d=length(gl_PointCoord-vec2(.5));
            if(d>.5)discard;
            gl_FragColor=vec4(.812,1.,0.,vAlpha*(1.-d*2.));
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
      scene.add(new THREE.Points(geo, pMat))

      /* Torus rings */
      const mkT = (r:number,t:number,x:number,y:number,z:number,rx:number,ry:number,op:number) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(r,t,8,64),
          new THREE.MeshBasicMaterial({color:0xCFFF00,opacity:op,transparent:true}))
        m.position.set(x,y,z); m.rotation.x=rx; m.rotation.y=ry; return m
      }
      const t1=mkT(2,.032,-3.8,.5,-2,.2,0,.055)
      const t2=mkT(1.3,.024,3.8,1,-3,1,.4,.04)
      const t3=mkT(.75,.018,0,-2,-1,.5,.8,.03)
      scene.add(t1); scene.add(t2); scene.add(t3)

      /* Grid */
      const gGeo = new THREE.PlaneGeometry(32,32,26,26)
      const gMat = new THREE.ShaderMaterial({
        uniforms:{ uTime:{value:0}, uMouse:{value:new THREE.Vector2()} },
        vertexShader:`
          uniform float uTime; uniform vec2 uMouse;
          varying vec2 vUv; varying float vDist;
          void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.42+uTime*.5)*cos(p.y*.42+uTime*.42)*.14;
          vDist=length(p.xy-uMouse*15.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader:`
          varying vec2 vUv; varying float vDist;
          void main(){vec2 g=abs(fract(vUv*26.)-.5);float line=min(g.x,g.y);
          float a=(1.-smoothstep(.0,.042,line))*.055;float glow=smoothstep(3.8,.0,vDist)*.13;
          gl_FragColor=vec4(.812,1.,0.,a+glow);}`,
        transparent:true, side:THREE.DoubleSide, depthWrite:false,
      })
      const grid = new THREE.Mesh(gGeo, gMat)
      grid.rotation.x = -Math.PI*.37; grid.position.set(0,-4.5,-2)
      scene.add(grid)

      const clock = new THREE.Clock()
      const animate = () => {
        animId = requestAnimationFrame(animate)
        const t = clock.getElapsedTime()
        const { x: mx, y: my } = mouseRef.current
        pMat.uniforms.uTime.value  = t
        pMat.uniforms.uMouse.value.set(mx, my)
        gMat.uniforms.uTime.value  = t
        gMat.uniforms.uMouse.value.set(mx, my)
        t1.rotation.x+=.004; t1.rotation.z+=.003
        t2.rotation.y+=.005; t2.rotation.z+=.004
        t3.rotation.x+=.006; t3.rotation.y+=.005
        camera.position.x += (mx*.38-camera.position.x)*.035
        camera.position.y += (my*.28-camera.position.y)*.035
        camera.lookAt(scene.position)
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix()
        renderer.setSize(innerWidth, innerHeight)
      }
      window.addEventListener('resize', onResize)
      return () => { window.removeEventListener('resize', onResize) }
    })
    return () => cancelAnimationFrame(animId)
  }, [])

  /* ── cursor ── */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX/innerWidth)*2-1,
        y: -((e.clientY/innerHeight)*2-1),
      }
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX+'px'
        dotRef.current.style.top  = e.clientY+'px'
      }
      if (heroRef.current && glowRef.current) {
        const r = heroRef.current.getBoundingClientRect()
        glowRef.current.style.left = (e.clientX-r.left)+'px'
        glowRef.current.style.top  = (e.clientY-r.top)+'px'
      }
    }
    window.addEventListener('mousemove', onMove)
    let raf: number
    const animRing = () => {
      raf = requestAnimationFrame(animRing)
      const { x: mx, y: my } = mouseRef.current
      const cur = ringPos.current
      cur.x += ((mx+1)/2*innerWidth - cur.x) * .12
      cur.y += ((-my+1)/2*innerHeight - cur.y) * .12
      if (ringRef.current) {
        ringRef.current.style.left = cur.x+'px'
        ringRef.current.style.top  = cur.y+'px'
      }
    }
    animRing()
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
  if (!audioRef.current) {
    audioRef.current = new Audio(PLAYLIST[currentTrack].src)
    audioRef.current.loop = true
    audioRef.current.volume = 0.35
  }
  if (musicPlaying) {
    audioRef.current.play().catch(() => {})
  } else {
    audioRef.current.pause()
  }
  return () => {
    audioRef.current?.pause()
  }
}, [musicPlaying])

useEffect(() => {
  if (audioRef.current) {
    const wasPlaying = musicPlaying
    audioRef.current.pause()
    audioRef.current = new Audio(PLAYLIST[currentTrack].src)
    audioRef.current.loop = true
    audioRef.current.volume = 0.35
    if (wasPlaying) audioRef.current.play().catch(() => {})
  }
}, [currentTrack])

  /* ── form helpers ── */
  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(er => { const n={...er}; delete n[k]; return n })
    if (k==='password') setStrength(pwdScore(e.target.value))
  }

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.firstName.trim())  errs.firstName = 'First name is required'
    if (!form.lastName.trim())   errs.lastName  = 'Last name is required'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email required'
    if (!form.phone || form.phone.replace(/\D/g,'').length<10) errs.phone = 'Valid phone number required'
    if (!form.year)    errs.year    = 'Select your year'
    if (!form.section) errs.section = 'Select your section'
    if (!form.stream) errs.stream = 'Select your stream'
    const pwdErr = pwdError(form.password)
    if (pwdErr) { errs.password = pwdErr }
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword)
    errs.confirmPassword = "Passwords don't match"
    if (!form.linkedin.trim()) errs.linkedin = 'LinkedIn profile required'
    if (!form.github.trim())   errs.github   = 'GitHub profile required'
    if (!form.tshirtSize)      errs.tshirtSize = 'Please select a size'
    if (!form.whyJoin.trim())  errs.whyJoin  = 'Please tell us why you want to join'
    if (!checks.c1 || !checks.c2 || !checks.c3) errs.terms = 'Please accept all agreements'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName:   form.firstName.trim(),
          lastName:    form.lastName.trim(),
          email:       form.email.trim(),
          phone:       form.phone.trim(),
          year:        form.year,
          section:     form.section,
          stream:      form.stream,
          password:    form.password,
          linkedin:    form.linkedin.trim(),
          github:      form.github.trim(),
          tshirtSize:  form.tshirtSize,
          whyJoin:     form.whyJoin.trim(),
          suggestions: form.suggestions.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
      } else {
        setErrors({ submit: data.detail || data.message || 'Something went wrong. Please try again.' })
      }
    } catch {
      setErrors({ submit: 'Could not reach the server. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  /* ── bar colours ── */
 const barCls = (i: number) => {
  if (i >= strength) return 'bg-border2'
  if (strength <= 2) return 'bg-red-500'
  if (strength === 3) return 'bg-orange-400'
  if (strength === 4) return 'bg-yellow-400'
  return 'bg-acid'
}

  /* ── input class ── */
  const ic = (k: string) =>
    `w-full bg-panel border rounded-lg text-white font-sans text-sm px-4 py-3 outline-none transition-all
     ${errors[k] ? 'border-red-500 shadow-[0_0_0_3px_rgba(255,64,64,.07)]'
                 : 'border-border2 focus:border-acid/50 focus:shadow-[0_0_0_3px_rgba(207,255,0,.06)] focus:bg-panel2'}`

  /* ═══════════════════════════════════════════════════════════════════════════
     SUCCESS SCREEN
  ═══════════════════════════════════════════════════════════════════════════ */
  if (success) return (
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'#000'}}
  className="flex flex-col items-center justify-center text-center px-10 animate-[fadeIn_.6s_ease]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Chathurya" className="w-16 h-16 object-contain mb-8"
        style={{animation:'logoPulse 2s ease-in-out infinite'}} />
      <h1 className="font-syne font-extrabold text-acid tracking-[-0.05em] leading-none mb-4"
        style={{fontSize:'clamp(2.6rem,6vw,4rem)'}}>You&apos;re in. 🎉</h1>
      <p className="text-text-dim text-base leading-relaxed max-w-md">
        Your application has landed. Check your inbox — we&apos;ve sent a confirmation email.
        We&apos;ll review your profile and send your invite soon. Exciting things are coming. ⚡
      </p>
      <span className="mt-8 px-5 py-2 bg-acid/8 border border-acid/20 rounded-full font-mono text-[11px] text-acid"
        style={{animation:'blinkTag 2.2s ease-in-out infinite'}}>
        // application received · await your invite
      </span>
    </div>
  )

  /* ═══════════════════════════════════════════════════════════════════════════
     MAIN PAGE
  ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Global styles injected once */}
      

      {/* Cursor */}
      <div ref={dotRef} className="fixed z-[9999] pointer-events-none rounded-full mix-blend-screen max-[768px]:hidden"
        style={{width:6,height:6,background:'#CFFF00',transform:'translate(-50%,-50%)'}} />
     <div ref={ringRef} className="fixed z-[9998] pointer-events-none rounded-full transition-[width,height,border-color] duration-200 max-[768px]:hidden"
        style={{width:36,height:36,border:'1.5px solid rgba(207,255,0,.4)',transform:'translate(-50%,-50%)'}} />

      {/* WebGL canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 w-full h-full pointer-events-none" />

      {/* ── T-SHIRT MODAL ── */}
      {tshirtOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/88 backdrop-blur-2xl flex items-center justify-center p-5"
          onClick={e => { if (e.target===e.currentTarget) setTshirtOpen(false) }}>
          <div className="modal-anim bg-panel border border-border2 rounded-[20px] p-7 max-w-[400px] w-full relative">
            <button onClick={() => setTshirtOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 border border-border2 rounded-full flex items-center justify-center text-text-dim hover:border-acid hover:text-acid transition-all text-sm cursor-none">✕</button>
            <h3 className="font-syne font-extrabold text-white text-lg mb-1">The Chathurya Drop 👕</h3>
            <p className="font-mono text-[11px] text-text-dim mb-4">// exclusive member tee — your name on the back</p>
            <div className="rounded-xl overflow-hidden bg-black border border-border" style={{aspectRatio:'2/3'}}>
              <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                <source src="/tshirt-preview.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      )}

      {/* ── TERMS MODAL ── */}
      {termsOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/88 backdrop-blur-2xl flex items-center justify-center p-5"
          onClick={e => { if (e.target===e.currentTarget) setTermsOpen(false) }}>
          <div className="modal-anim bg-panel border border-border2 rounded-[20px] p-7 max-w-[540px] w-full relative flex flex-col max-h-[80vh]">
            <button onClick={() => setTermsOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 border border-border2 rounded-full flex items-center justify-center text-text-dim hover:border-acid hover:text-acid transition-all text-sm cursor-none">✕</button>
            <h3 className="font-syne font-extrabold text-white text-lg mb-1">Member Agreement</h3>
            <p className="font-mono text-[11px] text-text-dim mb-4">// the honest fine print — give it a read 🙂</p>
            <div className="tscroll overflow-y-auto flex-1 pr-2 text-[12px] text-text-dim leading-relaxed space-y-3">
              {[
                ['Hey, welcome to the circle 🙌', "Before you step in, we want to be upfront about what being part of Chathurya means. This isn't a form you fill and forget — it's a commitment to something genuinely great."],
                ['Who we are?', "Chathurya is Seshadripuram College's Student Developers Club — a close-knit community of curious minds who love building things, learning together, and making college life count."],
                ['What joining means?', "You're committing to active, enthusiastic membership. Show up to workshops, bring your energy, and contribute. You don't need to be an expert — just hungry to learn and grow."],
                ['The club tee', "Every member gets the exclusive Chathurya tee with their name on the back. Once you sign up and your size is confirmed, the order goes in — so that's final. We've put real effort into quality and it's absolutely worth it."],
                ['Your data & privacy', "We collect your info solely for club operations, your NFC membership card, and event communication. We don't share it with anyone outside the club."],
                ['Invite-only, always', "Applications are reviewed by our leads. If selected, you'll receive a personal email invite to complete onboarding. We're selective because the community we're building matters."],
                ['Alumni & beyond', "Your Chathurya identity doesn't expire when you graduate. You'll transition to an Alumni card — staying connected and mentoring the next batch."],
                ['One last thing', "We're genuinely excited about what we're building here. The experiences, the friends you'll make, the things you'll build — all of it is waiting. Let's make something amazing. 🚀"],
              ].map(([h, p]) => (
                <div key={h}>
                  <p className="font-syne font-bold text-acid text-[12px] mb-1">{h}</p>
                  <p>{p}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setChecks(c => ({ ...c, c1: true }))
                setErrors(er => { const n={...er}; delete n.terms; return n })
                setTermsOpen(false)
              }}
              className="mt-4 w-full py-3 bg-acid text-black font-syne font-extrabold text-sm rounded-lg cursor-none hover:opacity-90 transition-opacity flex-shrink-0">
              I&apos;m in — Let&apos;s go ⚡
            </button>
          </div>
        </div>
      )}

      {/* ── PAGE LAYOUT ── */}
      <div className="page-grid relative z-[2] max-w-[1400px] mx-auto">

        {/* ── LEFT: HERO ── */}
        <div ref={heroRef} className="sticky top-0 h-screen flex flex-col justify-between overflow-hidden max-[768px]:relative max-[768px]:h-auto max-[768px]:border-b max-[768px]:border-border"
          style={{padding:'48px',borderRight:'1px solid #222'}}>
          <div className="hero-glow absolute pointer-events-none z-0 rounded-full"
            ref={glowRef}
            style={{width:650,height:650,background:'radial-gradient(circle,rgba(207,255,0,.055) 0%,transparent 65%)',transform:'translate(-50%,-50%)',willChange:'left,top',transition:'left .07s linear,top .07s linear'}} />
          <div className="grid-line-v" />
          <div className="grid-line-h" />

          <div className="relative z-[1]">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Chathurya" className="w-11 h-11 object-contain" onError={e=>(e.currentTarget.style.display='none')} />
              <div>
                <div className="font-syne font-extrabold text-white text-[17px] tracking-[-0.02em]">Chathurya</div>
                <div className="font-mono text-[10px] text-text-dim tracking-[.08em]">Student Developers Club</div>
              </div>
            </div>

            {/* Eyebrow */}
            <div className="flex items-center gap-3 font-mono text-[10px] text-acid tracking-[.15em] uppercase mb-5">
              <span className="w-7 h-px bg-acid inline-block" />
              Invite-only · Seshadripuram College
            </div>

            {/* Title */}
            <h1 className="font-syne font-extrabold text-white leading-[.92] tracking-[-0.05em] mb-7"
              style={{fontSize:'clamp(3rem,4.2vw,4.8rem)'}}>
              Build.<br/>Connect.<span className="text-acid block">Belong.</span>
            </h1>

            <p className="text-[13.5px] text-text-dim max-w-[340px] leading-[1.8] font-light">
              Chathurya is where code meets community. Workshops, real projects, NFC identity cards, mentorship, and experiences you won&apos;t find anywhere else in college.
            </p>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap mt-8">
              {['NFC Identity Cards','XP & Leaderboards','Real Projects','Alumni Network'].map((b,i) => (
                <span key={b} className="badge-float px-3 py-1 border border-border2 rounded-full font-mono text-[10px] text-text-dim bg-panel tracking-[.04em] transition-all hover:border-acid hover:text-acid hover:bg-acid/5 cursor-default"
                  style={{animationDelay:`${i*0.5}s`}}>{b}</span>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3 w-fit">

  {/* T-shirt trigger */}
  <div onClick={() => setTshirtOpen(true)}
    className="flex items-center gap-3 px-5 py-4 border border-border2 rounded-xl bg-panel cursor-none transition-all hover:border-acid/30 hover:-translate-y-0.5 hover:shadow-[0_18px_56px_rgba(207,255,0,.07)] group">
    <div className="w-9 h-9 rounded-lg bg-acid/10 flex items-center justify-center text-lg flex-shrink-0">👕</div>
    <div>
      <div className="font-syne font-bold text-white text-[12px]">Exclusive Club Tee</div>
      <div className="font-mono text-[10px] text-text-dim">tap to preview the drop</div>
    </div>
    <div className="ml-auto w-7 h-7 border border-border2 rounded-full flex items-center justify-center text-acid text-[10px] flex-shrink-0 group-hover:border-acid group-hover:bg-acid/8 transition-all">▶</div>
  </div>

  {/* Music player */}
  <div className="flex items-center gap-3 px-5 py-4 border border-border2 rounded-xl bg-panel"
    style={musicPlaying ? {borderColor:'rgba(207,255,0,0.25)',boxShadow:'0 0 20px rgba(207,255,0,0.06)'} : {}}>
    <div className="w-9 h-9 rounded-lg bg-acid/10 flex items-center justify-center flex-shrink-0">
      {musicPlaying ? (
        <div className="flex items-end gap-[2px] h-4">
          {[0,1,2].map(i => (
            <div key={i} className="w-[3px] bg-acid rounded-sm"
              style={{height:'100%',animation:'musicBar 0.8s ease-in-out infinite',animationDelay:`${i*0.15}s`}} />
          ))}
        </div>
      ) : (
        <span className="text-lg">🎵</span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-syne font-bold text-white text-[12px] truncate">{PLAYLIST[currentTrack].title}</div>
      <div className="font-mono text-[10px] text-text-dim truncate">{PLAYLIST[currentTrack].artist}</div>
    </div>
    {PLAYLIST.length > 1 && (
      <button type="button"
        onClick={e => { e.stopPropagation(); setCurrentTrack(t => (t + 1) % PLAYLIST.length) }}
        className="w-7 h-7 border border-border2 rounded-full flex items-center justify-center text-text-dim hover:text-acid hover:border-acid transition-all cursor-none text-[10px] flex-shrink-0">
        ⏭
      </button>
    )}
    <button type="button"
      onClick={e => { e.stopPropagation(); setMusicPlaying(p => !p) }}
      className="w-7 h-7 border border-border2 rounded-full flex items-center justify-center transition-all cursor-none flex-shrink-0"
      style={musicPlaying ? {borderColor:'rgba(207,255,0,0.4)',color:'#CFFF00'} : {color:'#555'}}>
      {musicPlaying ? '⏸' : '▶'}
    </button>
  </div>

</div>
          </div>

          {/* Stats */}
          <div className="relative z-[1] flex gap-6 pt-6 border-t border-border max-[768px]:hidden">
            {[['∞','possibilities'],['01','community'],['3yr','journey']].map(([v,l]) => (
              <div key={l}>
                <div className="font-syne font-extrabold text-acid text-[19px]">{v}</div>
                <div className="font-mono text-[10px] text-text-dim">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: FORM ── */}
        <div style={{padding:'48px',minHeight:'100vh'}}>
          <h2 className="font-syne font-extrabold text-white text-[22px] tracking-[-0.03em] mb-1">Apply for Membership</h2>
          <p className="text-[13px] text-text-dim mb-7">Fill in your details — we&apos;ll review and send your personal invite.</p>

          {/* Progress */}
          <div className="h-px bg-border rounded mb-8 overflow-hidden">
            <div className="h-full rounded transition-[width_.5s_cubic-bezier(.4,0,.2,1)]"
              style={{width:`${progress}%`,background:'linear-gradient(90deg,#a8cc00,#CFFF00)'}} />
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* ── IDENTITY ── */}
            <div className="sec mb-7" style={{animationDelay:'.08s'}}>
              <SectionLabel>Identity</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" error={errors.firstName}>
                  <div className="relative">
                    <input className={ic('firstName')} id="firstName" type="text" placeholder="Your first name"
                      value={form.firstName} onChange={set('firstName')} />
                    <div className="typing-line" /><div className="typing-dot" />
                  </div>
                </Field>
                <Field label="Last Name" error={errors.lastName}>
                  <div className="relative">
                    <input className={ic('lastName')} id="lastName" type="text" placeholder="Your last name"
                      value={form.lastName} onChange={set('lastName')} />
                    <div className="typing-line" /><div className="typing-dot" />
                  </div>
                </Field>
              </div>
            </div>

            {/* ── CONTACT ── */}
            <div className="sec mb-7" style={{animationDelay:'.15s'}}>
              <SectionLabel>Contact</SectionLabel>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label="Email Address" error={errors.email}>
                  <div className="relative">
                    <input className={ic('email')} type="email" placeholder="you@college.edu"
                      value={form.email} onChange={set('email')} />
                    <div className="typing-line" /><div className="typing-dot" />
                  </div>
                </Field>
                <Field label="Phone Number" error={errors.phone}>
                  <div className="relative">
                    <input className={ic('phone')} type="tel" placeholder="+91 1234567890"
                      value={form.phone} onChange={set('phone')} />
                    <div className="typing-line" /><div className="typing-dot" />
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Year of Study" error={errors.year}>
                  <select className={ic('year') + ' appearance-none'}  value={form.year} onChange={set('year')}
                    style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23555' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:40,cursor:'none'}}>
                    <option value="" disabled>Select year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                  </select>
                </Field>
                <Field label="Section" error={errors.section}>
                  <select className={ic('section') + ' appearance-none'} value={form.section} onChange={set('section')}
                    style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23555' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:40,cursor:'none'}}>
                    <option value="" disabled>Select section</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Stream" error={errors.stream}>
                  <select className={ic('stream') + ' appearance-none'} value={form.stream} onChange={set('stream')}
                    style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23555' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:40,cursor:'none'}}>
                    <option value="" disabled>Select stream</option>
                    <option value="BCA">BCA</option>
                    <option value="BCom">BCom</option>
                    <option value="BBA">BBA</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* ── PASSWORD ── */}
<div className="sec mb-7" style={{animationDelay:'.22s'}}>
  <SectionLabel>Set Your Password</SectionLabel>
  <div className="grid grid-cols-2 gap-3">
    <Field label="Password" error={errors.password}>
      <div className="relative">
        <input className={ic('password')} type={showPwd ? 'text' : 'password'}
          placeholder="Min. 8 characters"
          value={form.password} onChange={set('password')} />
        <button type="button" onClick={() => setShowPwd(p => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-acid transition-colors cursor-none text-[11px] font-mono">
          {showPwd ? 'hide' : 'show'}
        </button>
        <div className="typing-line" />
      </div>
      {form.password && !errors.password && pwdError(form.password) && (
        <p className="text-[10px] text-orange-400 font-mono">{pwdError(form.password)}</p>
      )}
      <div className="flex gap-1 mt-1">
        {[0,1,2,3,4].map(i => (
          <div key={i} className={`flex-1 h-[2px] rounded transition-colors duration-300 ${barCls(i+1)}`} />
        ))}
      </div>
    </Field>
    <Field label="Confirm Password" error={errors.confirmPassword}>
      <div className="relative">
        <input className={ic('confirmPassword')} type={showConfirmPwd ? 'text' : 'password'}
          placeholder="Repeat your password"
          value={form.confirmPassword} onChange={set('confirmPassword')} />
        <button type="button" onClick={() => setShowConfirmPwd(p => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-acid transition-colors cursor-none text-[11px] font-mono">
          {showConfirmPwd ? 'hide' : 'show'}
        </button>
        <div className="typing-line" />
      </div>
    </Field>
  </div>
</div>

            {/* ── SOCIALS ── */}
            <div className="sec mb-7" style={{animationDelay:'.29s'}}>
              <SectionLabel>Socials</SectionLabel>
              <div className="flex flex-col gap-3">
                <Field label="LinkedIn" error={errors.linkedin}>
                  <div className="relative social-wrap">
                    <span className="social-prefix">linkedin.com/in/</span>
                    <input className={ic('linkedin')} type="text" placeholder="your-handle"
                      value={form.linkedin} onChange={set('linkedin')} />
                    <div className="typing-line" /><div className="typing-dot" />
                  </div>
                </Field>
                <Field label="GitHub" error={errors.github}>
                  <div className="relative social-wrap gh">
                    <span className="social-prefix">github.com/</span>
                    <input className={ic('github')} type="text" placeholder="your-username"
                      value={form.github} onChange={set('github')} />
                    <div className="typing-line" /><div className="typing-dot" />
                  </div>
                </Field>
              </div>
            </div>

            {/* ── T-SHIRT ── */}
            <div className="sec mb-7" style={{animationDelay:'.36s'}}>
              <SectionLabel>Your Chathurya Tee</SectionLabel>
              <div className="text-[11px] text-text-dim mb-2">
                Select Size {errors.tshirtSize && <span className="text-red-400 ml-1">← {errors.tshirtSize}</span>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['S','M','L','XL','XXL'] as Size[]).map(s => (
                  <button key={s} type="button"
                    onClick={() => { setForm(f=>({...f,tshirtSize:s})); setErrors(er=>{const n={...er};delete n.tshirtSize;return n}) }}
                    className={`w-12 h-10 border rounded-lg font-mono text-[11px] font-medium cursor-none transition-all
                      ${form.tshirtSize===s
                        ? 'border-acid text-acid bg-acid/8 shadow-[0_0_14px_rgba(207,255,0,.1)]'
                        : 'border-border2 text-text-dim bg-panel hover:border-acid/30 hover:text-acid'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="font-mono text-[10px] text-muted mt-2">
                Your name printed on the back ·{' '}
                <span className="text-acid cursor-pointer" onClick={() => setTshirtOpen(true)}>preview design ↗</span>
              </p>
            </div>

            {/* ── STORY ── */}
            <div className="sec mb-7" style={{animationDelay:'.43s'}}>
              <SectionLabel>Your Story</SectionLabel>
              <div className="flex flex-col gap-3">
                <Field label="Why do you want to join Chathurya?" error={errors.whyJoin}>
                  <div className="relative">
                    <textarea className={ic('whyJoin')} rows={3} placeholder="Tell us what excites you about being part of Chathurya..."
                      value={form.whyJoin} onChange={set('whyJoin')} style={{resize:'vertical'}} />
                    <div className="typing-line" />
                  </div>
                </Field>
                <Field label="What would you love to see in the club?">
                  <div className="relative">
                    <textarea className={ic('suggestions')} rows={3} placeholder="Your ideas genuinely matter — we're all ears..."
                      value={form.suggestions} onChange={set('suggestions')} style={{resize:'vertical'}} />
                    <div className="typing-line" />
                  </div>
                  <p className="font-mono text-[10px] text-muted">Open suggestion box. We mean it. 🙂</p>
                </Field>
              </div>
            </div>

            {/* ── TERMS ── */}
            <div className="sec mb-7" style={{animationDelay:'.5s'}}>
              <SectionLabel>Before You Jump In</SectionLabel>
              <div className="bg-panel border border-border2 rounded-xl p-4 mb-4">
                <p className="font-syne font-bold text-white text-[13px] mb-1">Member Agreement</p>
                <p className="text-[11px] text-text-dim mb-3 leading-relaxed">Short and human — covers what Chathurya membership means.</p>
                <button type="button" onClick={() => setTermsOpen(true)}
                  className="font-mono text-[11px] text-acid border-b border-transparent hover:border-acid transition-colors cursor-none">
                  Read the full member agreement →
                </button>
              </div>

              {([
                ['c1', 'cb1', "I've read the Member Agreement and I'm genuinely excited to join. I understand this is a committed membership — and I'm fully in."],
                ['c2', 'cb2', "I agree to the t-shirt as part of my membership. I understand it's non-refundable once my size is confirmed."],
                ['c3', 'cb3', "I'm a CS student who genuinely loves learning and exploring new tech. I commit to showing up, staying curious, and contributing my energy to this community."],
              ] as [keyof typeof checks, string, string][]).map(([k, , text]) => (
                <div key={k} onClick={() => { setChecks(c=>({...c,[k]:!c[k]})); setErrors(er=>{const n={...er};delete n.terms;return n}) }}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-none transition-all mb-2
                    ${checks[k] ? 'border-acid/20 bg-acid/3' : 'border-border hover:border-border2 hover:bg-acid/1'}`}>
                  <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                    ${checks[k] ? 'bg-acid border-acid' : 'border-border2 bg-panel'}`}>
                    {checks[k] && <div className="w-[5px] h-[8px] border-2 border-black border-t-0 border-l-0 rotate-45 -translate-y-px" />}
                  </div>
                  <span className="text-[12px] text-text-dim leading-relaxed"
                    dangerouslySetInnerHTML={{__html: text.replace('Member Agreement','<strong class="text-white font-medium">Member Agreement</strong>').replace("t-shirt as part of my membership","<strong class='text-white font-medium'>t-shirt as part of my membership</strong>")}} />
                </div>
              ))}
              {errors.terms && <p className="text-red-400 text-[11px] mt-1">{errors.terms}</p>}
            </div>

            {/* ── SUBMIT ── */}
            <div className="sec" style={{animationDelay:'.57s'}}>
              {errors.submit && (
                <div className="mb-4 p-3 border border-red-500/30 bg-red-500/5 rounded-lg text-red-400 text-[12px]">
                  {errors.submit}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="submit-btn w-full py-4 bg-acid text-black rounded-xl font-syne font-extrabold text-[14px] tracking-[-0.01em] cursor-none relative overflow-hidden disabled:opacity-50"
                style={{boxShadow:'none'}}>
                <span className={`flex items-center justify-center gap-2 ${loading ? 'opacity-0' : ''}`}>
                  Send My Application
                  <span className="text-[17px] transition-transform duration-300" style={{display:'inline-block'}}>→</span>
                </span>
                {loading && (
                  <div className="absolute top-1/2 left-1/2 w-5 h-5 border-2 border-black/20 border-t-black rounded-full"
                    style={{animation:'spin .6s linear infinite',transform:'translate(-50%,-50%)'}} />
                )}
              </button>
              <p className="mt-3 text-center font-mono text-[10px] text-muted">
                // invite-only · reviewed by club leads
              </p>
            </div>
            {/* Rick easter egg */}
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setRickMode(true)}
                  className="font-mono text-[9px] text-border2 hover:text-muted transition-colors cursor-none">
                  // you found a secret
                </button>
              </div>

              {rickMode && (
                <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-5"
                  onClick={() => setRickMode(false)}>
                  <p className="font-mono text-[11px] text-acid mb-4">// never gonna give you up 🎵</p>
                  <div className="rounded-xl overflow-hidden border border-border2" style={{width:'100%',maxWidth:560,aspectRatio:'16/9'}}>
                    <iframe
                      width="100%" height="100%"
                      src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                      allow="autoplay"
                      allowFullScreen
                    />
                  </div>
                  <p className="font-mono text-[10px] text-muted mt-4">click anywhere to escape</p>
                </div>
              )}

          </form>
        </div>
      </div>
    </>
  )
}

/* ── Sub-components ───────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-acid mb-3">
      {children}
      <span className="flex-1 h-px" style={{background:'linear-gradient(90deg,#2a2a2a,transparent)'}} />
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-text-dim tracking-[.02em]">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}
