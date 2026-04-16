'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminLogin() {
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: 'chathuryastudentdevclub@gmail.com',
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight:'100vh', background:'#080808',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-dm-sans)', cursor:'none',
    }}>
      <style>{`body{cursor:none;background:#080808}`}</style>

      <div style={{width:'100%', maxWidth:400, padding:'0 24px'}}>
        {/* Logo */}
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

        <div style={{background:'#0f0f0f',border:'1px solid #1e1e1e',borderRadius:16,padding:32}}>
          {!sent ? (
            <>
              <p style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#444',lineHeight:1.7,marginBottom:24,letterSpacing:'.02em'}}>
                A magic link will be sent to<br/>
                <span style={{color:'#CFFF00'}}>chathuryastudentdevclub@gmail.com</span>
              </p>

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

              <form onSubmit={handleLogin}>
                <button type="submit" disabled={loading} style={{
                  width:'100%', padding:'13px',
                  background: loading ? '#a8cc00' : '#CFFF00',
                  color:'#000', border:'none', borderRadius:10,
                  fontFamily:'var(--font-syne)', fontWeight:800, fontSize:14,
                  cursor: loading ? 'not-allowed' : 'none',
                  opacity: loading ? 0.7 : 1,
                  transition:'opacity .2s',
                }}>
                  {loading ? 'Sending...' : 'Send Magic Link →'}
                </button>
              </form>
            </>
          ) : (
            <div style={{textAlign:'center'}}>
              <div style={{
                fontSize:32, marginBottom:16,
                filter:'drop-shadow(0 0 12px rgba(207,255,0,0.5))',
              }}>
                ⚡
              </div>
              <div style={{
                fontFamily:'var(--font-syne)', fontWeight:800,
                color:'#CFFF00', fontSize:18, marginBottom:12,
                letterSpacing:'-.02em',
              }}>
                Check your inbox
              </div>
              <p style={{
                fontFamily:'var(--font-jetbrains)', fontSize:11,
                color:'#444', lineHeight:1.75, letterSpacing:'.02em',
              }}>
                Magic link sent to<br/>
                <span style={{color:'#666'}}>chathuryastudentdevclub@gmail.com</span><br/><br/>
                Click the link in the email to access the admin panel. The link expires in 1 hour.
              </p>
              <button onClick={()=>setSent(false)}
                style={{
                  marginTop:20, background:'transparent',
                  border:'1px solid #1e1e1e', borderRadius:8,
                  color:'#333', fontFamily:'var(--font-jetbrains)',
                  fontSize:11, padding:'8px 16px', cursor:'none',
                }}>
                Resend
              </button>
            </div>
          )}
        </div>

        <div style={{textAlign:'center',marginTop:20,fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#2a2a2a',letterSpacing:'.06em'}}>
          // restricted access · chathurya leads only
        </div>
      </div>
    </div>
  )
}