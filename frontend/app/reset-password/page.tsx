'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)
  const [sessionOk, setSessionOk] = useState(false)

  // The middleware handles PKCE code exchange before this page loads.
  // By the time we're here, the session should already be set in cookies.
  useEffect(() => {
    const sb = createClient()

    // Check if session exists (set by middleware after code exchange)
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionOk(true)
    })

    // Also listen for PASSWORD_RECOVERY event (handles hash-based tokens)
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionOk(true)
    })

    // Timeout: if nothing works after 8s, show an error
    const timeout = setTimeout(() => {
      setSessionOk((prev) => {
        if (!prev) setError('Reset link expired or invalid. Please request a new one.')
        return prev
      })
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError('')

    const sb = createClient()
    const { error: err } = await sb.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }

    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  const strength = (() => {
    if (!password) return 0
    let s = 0
    if (password.length >= 8)               s++
    if (/[A-Z]/.test(password))             s++
    if (/[0-9]/.test(password))             s++
    if (/[^A-Za-z0-9]/.test(password))      s++
    return s
  })()

  const strengthColor = ['#1e1e1e','#ff4040','#ff9800','#CFFF00','#00e676'][strength]
  const strengthLabel = ['','Weak','Fair','Good','Strong'][strength]

  return (
    <div style={{
      minHeight:'100vh', background:'#080808',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-dm-sans)', padding:'40px 24px',
      cursor:'none',
    }}>
      <style>{`
        body{background:#080808;cursor:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .ifield{width:100%;background:#0d0d0d;border:1px solid #1e1e1e;border-radius:9px;color:#fff;font-family:var(--font-dm-sans);font-size:14px;padding:12px 16px;outline:none;box-sizing:border-box;transition:border-color .2s}
        .ifield:focus{border-color:rgba(207,255,0,0.4)}
        .pbtn{width:100%;padding:13px;background:#CFFF00;color:#000;border:none;border-radius:10px;font-family:var(--font-syne);font-weight:800;font-size:14px;cursor:none;transition:opacity .2s;letter-spacing:-.01em}
        .pbtn:hover{opacity:.88}
        .pbtn:disabled{background:#1e1e1e;color:#333;cursor:not-allowed}
      `}</style>

      {/* Logo */}
      <div style={{textAlign:'center',marginBottom:32,animation:'fadeUp .5s ease'}}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{width:40,height:40,objectFit:'contain',marginBottom:10,filter:'drop-shadow(0 0 10px rgba(207,255,0,0.5))',cursor:'none'}} />
        </Link>
        <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:18,letterSpacing:'-.03em'}}>
          {done ? 'Password Updated' : 'Set New Password'}
        </div>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#333',letterSpacing:'.1em',marginTop:4,textTransform:'uppercase'}}>
          Chathurya SDC
        </div>
      </div>

      <div style={{width:'100%',maxWidth:420,animation:'fadeUp .5s .1s ease both'}}>

        {/* Done state */}
        {done && (
          <div style={{background:'#0a0a0a',border:'1px solid rgba(207,255,0,0.15)',borderRadius:18,padding:32,textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:16}}>✓</div>
            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:20,letterSpacing:'-.03em',marginBottom:8}}>
              Password updated!
            </h2>
            <p style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#444',lineHeight:1.8}}>
              Redirecting you to login...
            </p>
          </div>
        )}

        {/* Waiting for session */}
        {!done && !sessionOk && (
          <div style={{background:'#0a0a0a',border:'1px solid #1a1a1a',borderRadius:18,padding:40,textAlign:'center'}}>
            {!error ? (
              <>
                <div style={{width:32,height:32,border:'2px solid #1a1a1a',borderTopColor:'#CFFF00',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 16px'}} />
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#444',letterSpacing:'.06em'}}>
                  Verifying reset link...
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#ff6b6b',lineHeight:1.7,marginBottom:16}}>
                  {error}
                </div>
                <Link href="/login" style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#CFFF00',textDecoration:'underline'}}>
                  ← Back to login
                </Link>
              </>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Reset form */}
        {!done && sessionOk && (
          <div style={{background:'#0a0a0a',border:'1px solid #1a1a1a',borderRadius:18,padding:32}}>
            <form onSubmit={handleReset} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <label style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#555',letterSpacing:'.08em',textTransform:'uppercase',display:'block',marginBottom:7}}>
                  New Password
                </label>
                <div style={{position:'relative'}}>
                  <input type={showPwd?'text':'password'} value={password}
                    onChange={e=>setPassword(e.target.value)}
                    required placeholder="Min. 8 characters"
                    className="ifield" style={{paddingRight:52}} autoFocus />
                  <button type="button" onClick={()=>setShowPwd(p=>!p)}
                    style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'none',fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444'}}>
                    {showPwd?'hide':'show'}
                  </button>
                </div>
                {/* Strength bar */}
                {password && (
                  <div style={{marginTop:8}}>
                    <div style={{height:3,background:'#111',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:2,background:strengthColor,width:`${strength*25}%`,transition:'all .3s ease'}} />
                    </div>
                    <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:strengthColor,marginTop:4,textAlign:'right'}}>
                      {strengthLabel}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#555',letterSpacing:'.08em',textTransform:'uppercase',display:'block',marginBottom:7}}>
                  Confirm Password
                </label>
                <input type={showPwd?'text':'password'} value={confirm}
                  onChange={e=>setConfirm(e.target.value)}
                  required placeholder="Repeat password" className="ifield" />
                {confirm && confirm !== password && (
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#ff4040',marginTop:5}}>
                    Passwords don't match
                  </div>
                )}
              </div>

              {error && (
                <div style={{padding:'9px 14px',background:'rgba(255,64,64,0.06)',border:'1px solid rgba(255,64,64,0.2)',borderRadius:8,fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#ff6b6b'}}>
                  {error}
                </div>
              )}

              <button type="submit"
                disabled={loading || !password || password !== confirm || strength < 2}
                className="pbtn">
                {loading ? 'Updating...' : 'Update Password →'}
              </button>
            </form>
          </div>
        )}

        <div style={{textAlign:'center',marginTop:20,fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#2a2a2a',letterSpacing:'.06em'}}>
          <Link href="/login" style={{color:'#444',textDecoration:'none'}}>← Back to login</Link>
        </div>
      </div>
    </div>
  )
}
