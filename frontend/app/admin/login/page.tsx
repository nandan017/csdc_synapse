'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  const supabase = createClient()
  const { error: err } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (err) {
    setError(err.message)
    setLoading(false)
    return
  }

  // 🧠 give time for cookie to be set
  setTimeout(() => {
    router.push('/admin')
    setLoading(false)
    router.refresh()
  }, 500)
}

  return (
    <div style={{
      minHeight:'100vh', background:'#080808',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-dm-sans)', cursor:'none',
    }}>
      <style>{`body{cursor:none;background:#080808}`}</style>

      <div style={{width:'100%', maxWidth:400, padding:'0 24px'}}>
        <div style={{textAlign:'center', marginBottom:40}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Chathurya"
            style={{width:48,height:48,objectFit:'contain',marginBottom:16}} />
          <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:20,letterSpacing:'-.03em'}}>
            Admin Panel
          </div>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',marginTop:4}}>
            CHATHURYA SDC
          </div>
        </div>

        <form onSubmit={handleLogin} style={{
          background:'#0f0f0f', border:'1px solid #1e1e1e',
          borderRadius:16, padding:32,
        }}>
          <div style={{marginBottom:18}}>
            <label style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.08em',textTransform:'uppercase',display:'block',marginBottom:7}}>
              Email
            </label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required autoFocus
              placeholder="chathuryastudentdevclub@gmail.com"
              style={{
                width:'100%', background:'#111', border:'1px solid #1e1e1e',
                borderRadius:8, color:'#fff', fontSize:13,
                padding:'11px 14px', outline:'none',
                fontFamily:'var(--font-dm-sans)', boxSizing:'border-box',
                transition:'border-color .2s',
              }}
              onFocus={e => e.target.style.borderColor='rgba(207,255,0,0.4)'}
              onBlur={e  => e.target.style.borderColor='#1e1e1e'}
            />
          </div>

          <div style={{marginBottom:24}}>
            <label style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.08em',textTransform:'uppercase',display:'block',marginBottom:7}}>
              Password
            </label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              style={{
                width:'100%', background:'#111', border:'1px solid #1e1e1e',
                borderRadius:8, color:'#fff', fontSize:13,
                padding:'11px 14px', outline:'none',
                fontFamily:'var(--font-dm-sans)', boxSizing:'border-box',
                transition:'border-color .2s',
              }}
              onFocus={e => e.target.style.borderColor='rgba(207,255,0,0.4)'}
              onBlur={e  => e.target.style.borderColor='#1e1e1e'}
            />
          </div>

          {error && (
            <div style={{
              marginBottom:16, padding:'10px 14px',
              background:'rgba(255,64,64,0.06)',
              border:'1px solid rgba(255,64,64,0.2)',
              borderRadius:8, color:'#ff6b6b',
              fontFamily:'var(--font-jetbrains)', fontSize:12,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'13px',
            background: loading ? '#a8cc00' : '#CFFF00',
            color:'#000', border:'none', borderRadius:10,
            fontFamily:'var(--font-syne)', fontWeight:800, fontSize:14,
            cursor: loading ? 'not-allowed' : 'none',
            opacity: loading ? 0.7 : 1,
            transition:'opacity .2s',
          }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={{textAlign:'center',marginTop:20,fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#2a2a2a',letterSpacing:'.06em'}}>
          // restricted access · chathurya leads only
        </div>
      </div>
    </div>
  )
}