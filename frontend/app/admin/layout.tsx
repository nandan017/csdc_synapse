'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href:'/admin',             label:'Overview',     icon:'▦' },
  { href:'/admin/applications',label:'Applications', icon:'◈' },
  { href:'/admin/members',     label:'Members',      icon:'◉' },
  { href:'/admin/workshops',   label:'Workshops',    icon:'◆' },
  { href:'/admin/analytics',   label:'Analytics',    icon:'◎' },
  { href:'/admin/settings',    label:'Settings',     icon:'⊙' },
]
// Add this component above the AdminLayout function:
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser]           = useState<any>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const handleLogout = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div style={{
      display:'flex', minHeight:'100vh',
      background:'#060606', color:'#d0d0d0',
      fontFamily:'var(--font-dm-sans)',
      cursor:'none',
    }}>
      <style>{`
        *{box-sizing:border-box}
        body{cursor:none;background:#060606}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1e1e1e;border-radius:2px}
        .admin-nav-item{
          display:flex;align-items:center;gap:10px;
          padding:10px 14px;border-radius:8px;
          text-decoration:none;transition:all .2s;
          font-family:var(--font-jetbrains);font-size:11px;
          letter-spacing:.04em;color:#444;
          white-space:nowrap;overflow:hidden;
        }
        .admin-nav-item:hover{background:rgba(207,255,0,0.04);color:#888}
        .admin-nav-item.active{background:rgba(207,255,0,0.08);color:#CFFF00;border:1px solid rgba(207,255,0,0.12)}
        .admin-nav-item .nav-icon{font-size:13px;flex-shrink:0;width:18px;text-align:center}
      `}</style>
       <Cursor/>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 220,
        background:'#0a0a0a',
        borderRight:'1px solid #141414',
        display:'flex', flexDirection:'column',
        transition:'width .25s cubic-bezier(.4,0,.2,1)',
        position:'sticky', top:0, height:'100vh',
        flexShrink:0, overflow:'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 16px' : '20px 18px',
          borderBottom:'1px solid #141414',
          display:'flex', alignItems:'center',
          gap:10, overflow:'hidden',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{width:28,height:28,objectFit:'contain',flexShrink:0}} />
          {!collapsed && (
            <div style={{overflow:'hidden'}}>
              <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:13,letterSpacing:'-.02em',whiteSpace:'nowrap'}}>Chathurya</div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#333',letterSpacing:'.08em',whiteSpace:'nowrap'}}>Admin Panel</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:2}}>
          {NAV.map(item => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`admin-nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}>
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User + collapse */}
        <div style={{padding:'12px 8px', borderTop:'1px solid #141414'}}>
          {!collapsed && user && (
            <div style={{
              padding:'10px 12px', marginBottom:8,
              background:'#111', borderRadius:8,
              fontFamily:'var(--font-jetbrains)', fontSize:10,
              color:'#444', overflow:'hidden',
            }}>
              <div style={{color:'#CFFF00', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{user.email}</div>
              <div style={{color:'#2a2a2a'}}>Club Lead</div>
            </div>
          )}
          <button onClick={handleLogout}
            className="admin-nav-item"
            style={{width:'100%', background:'transparent', border:'none', cursor:'none', textAlign:'left'}}
            title={collapsed ? 'Sign out' : undefined}>
            <span className="nav-icon" style={{color:'#333'}}>⊗</span>
            {!collapsed && <span style={{color:'#333'}}>Sign out</span>}
          </button>
          <button onClick={() => setCollapsed(p=>!p)}
            className="admin-nav-item"
            style={{width:'100%', background:'transparent', border:'none', cursor:'none', textAlign:'left', marginTop:2}}>
            <span className="nav-icon" style={{color:'#2a2a2a'}}>{collapsed ? '▷' : '◁'}</span>
            {!collapsed && <span style={{color:'#2a2a2a'}}>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{
  flex:1, overflow:'auto', minWidth:0,
  backgroundImage: `radial-gradient(circle, rgba(207,255,0,0.12) 1px, transparent 1px)`,
  backgroundSize: '28px 28px',
  backgroundColor: '#060606',
}}>
        {children}
      </main>
    </div>
  )
}
