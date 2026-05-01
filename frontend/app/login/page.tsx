'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Cursor from '@/components/Cursor'

type Step = 'login' | 'otp' | 'forgot' | 'forgot_sent'

function extractUID(url: string): string | null {
  const match = url.match(/\/u\/([^/?#]+)/)
  return match ? match[1] : null
}

export default function LoginPage() {
  const router = useRouter()
  const [step,        setStep]       = useState<Step>('login')
  const [email,       setEmail]      = useState('')
  const [password,    setPassword]   = useState('')
  const [otp,         setOtp]        = useState('')
  const [showPwd,     setShowPwd]    = useState(false)
  const [error,       setError]      = useState('')
  const [loading,     setLoading]    = useState(false)
  const [otpTimer,    setOtpTimer]   = useState(0)
  const [nfcReady,    setNfcReady]   = useState(false)
  const [nfcScanning, setNfcScanning] = useState(false)
  const [resetEmail,  setResetEmail] = useState('')
  const otpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) setNfcReady(true)
  }, [])

  useEffect(() => {
    if (otpTimer <= 0) return
    const iv = setInterval(() => setOtpTimer(t => t - 1), 1000)
    return () => clearInterval(iv)
  }, [otpTimer])

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRef.current?.focus(), 100)
  }, [step])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const sb = createClient()
    const { error: err } = await sb.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Incorrect email or password.' : err.message)
      setLoading(false)
      return
    }
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) { setError('Failed to send OTP. Try again.'); setLoading(false); return }
    setOtpTimer(60)
    setStep('otp')
    setLoading(false)
  }

  const handleOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    })
    const data = await res.json()
    if (!data.valid) { setError('Incorrect or expired OTP.'); setLoading(false); return }
    window.location.href = '/dashboard'
  }

  const resendOTP = async () => {
    await fetch('/api/auth/send-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setOtpTimer(60)
    setOtp('')
    setError('')
  }

  const startNFCLogin = async () => {
    setNfcScanning(true)
    setError('')
    try {
      const reader = new (window as any).NDEFReader()
      await reader.scan()
      reader.onreading = async (event: any) => {
        let uid: string | null = null
        for (const record of event.message.records) {
          if (record.recordType === 'url') { uid = extractUID(new TextDecoder().decode(record.data)); if (uid) break }
          if (record.recordType === 'text') { uid = new TextDecoder().decode(record.data).trim(); break }
        }
        if (!uid) { setError('Could not read card.'); setNfcScanning(false); return }
        const res = await fetch('/api/auth/nfc-login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encrypted_uid: uid }),
        })
        const data = await res.json()
        if (!data.access_token) { setError(data.detail || 'Card not recognised.'); setNfcScanning(false); return }
        const sb = createClient()
        await sb.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? 'NFC permission denied.' : 'NFC error.')
      setNfcScanning(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const sb = createClient()
    const { error: err } = await sb.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) { setError(err.message); setLoading(false); return }
    setStep('forgot_sent')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight:'100vh', background:'#080808',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-dm-sans)', padding:'40px 24px', cursor:'none',
    }}>
      <style>{`
        body{background:#080808;cursor:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ping{0%{transform:scale(1);opacity:.8}70%{transform:scale(2.2);opacity:0}100%{transform:scale(2.2);opacity:0}}
        .ping-ring{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(207,255,0,0.35);animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite}
        .ifield{width:100%;background:#0d0d0d;border:1px solid #1e1e1e;border-radius:9px;color:#fff;font-family:var(--font-dm-sans);font-size:14px;padding:12px 16px;outline:none;box-sizing:border-box;transition:border-color .2s}
        .ifield:focus{border-color:rgba(207,255,0,0.4)}
        .pbtn{width:100%;padding:13px;background:#CFFF00;color:#000;border:none;border-radius:10px;font-family:var(--font-syne);font-weight:800;font-size:14px;cursor:none;transition:opacity .2s;letter-spacing:-.01em}
        .pbtn:hover{opacity:.88}
        .pbtn:disabled{background:#1e1e1e;color:#555;cursor:not-allowed}
        @media (pointer: coarse) { body { cursor: auto !important; } * { cursor: auto !important; } }
        @media (max-width: 480px) { .ifield { font-size: 16px !important; } }
      `}</style>

      <Cursor />

      {/* Logo */}
      <div style={{textAlign:'center',marginBottom:32,animation:'fadeUp .5s ease'}}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{width:40,height:40,objectFit:'contain',marginBottom:10,filter:'drop-shadow(0 0 10px rgba(207,255,0,0.5))',cursor:'none'}} />
        </Link>
        <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:18,letterSpacing:'-.03em'}}>
          {step === 'forgot' || step === 'forgot_sent' ? 'Reset Password' : 'Member Login'}
        </div>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#666',letterSpacing:'.1em',marginTop:4,textTransform:'uppercase'}}>
          Chathurya SDC
        </div>
      </div>

      <div style={{width:'100%',maxWidth:420,animation:'fadeUp .5s .1s ease both'}}>

        {/* LOGIN */}
        {step === 'login' && (
          <div style={{background:'#0a0a0a',border:'1px solid #1a1a1a',borderRadius:18,padding:32}}>

            {nfcReady && (
              <div style={{marginBottom:24}}>
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:12,textAlign:'center'}}>
                  Quick login
                </div>
                <button onClick={startNFCLogin} disabled={nfcScanning} style={{
                  width:'100%',padding:'14px',background:'rgba(207,255,0,0.05)',
                  border:`1px solid ${nfcScanning?'rgba(207,255,0,0.35)':'rgba(207,255,0,0.15)'}`,
                  borderRadius:12,cursor:'none',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:12,transition:'all .2s',
                }}>
                  {nfcScanning ? (
                    <>
                      <div style={{position:'relative',width:28,height:28,flexShrink:0}}>
                        <div className="ping-ring" />
                        <div style={{position:'absolute',inset:8,borderRadius:'50%',border:'1.5px solid #CFFF00'}} />
                      </div>
                      <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#CFFF00',letterSpacing:'.04em'}}>Hold card to phone...</span>
                    </>
                  ) : (
                    <>
                      <span style={{fontSize:18}}>🃏</span>
                      <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#555',letterSpacing:'.04em'}}>Tap NFC card to login instantly</span>
                    </>
                  )}
                </button>
                <div style={{display:'flex',alignItems:'center',gap:12,margin:'20px 0'}}>
                  <div style={{flex:1,height:1,background:'#111'}} />
                  <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#555',letterSpacing:'.06em'}}>or</span>
                  <div style={{flex:1,height:1,background:'#111'}} />
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#555',letterSpacing:'.08em',textTransform:'uppercase',display:'block',marginBottom:7}}>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="your@college.edu" className="ifield" autoFocus />
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                  <label style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#555',letterSpacing:'.08em',textTransform:'uppercase'}}>Password</label>
                  <button type="button"
                    onClick={()=>{setResetEmail(email);setStep('forgot');setError('')}}
                    style={{background:'none',border:'none',cursor:'none',fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',textDecoration:'underline',transition:'color .2s'}}
                    onMouseEnter={e=>(e.currentTarget.style.color='#CFFF00')}
                    onMouseLeave={e=>(e.currentTarget.style.color='#444')}>
                    Forgot password?
                  </button>
                </div>
                <div style={{position:'relative'}}>
                  <input type={showPwd?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                    required placeholder="••••••••" className="ifield" style={{paddingRight:52}} />
                  <button type="button" onClick={()=>setShowPwd(p=>!p)}
                    style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'none',fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666'}}>
                    {showPwd?'hide':'show'}
                  </button>
                </div>
              </div>
              {error && <div style={{padding:'9px 14px',background:'rgba(255,64,64,0.06)',border:'1px solid rgba(255,64,64,0.2)',borderRadius:8,fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#ff6b6b'}}>{error}</div>}
              <button type="submit" disabled={loading} className="pbtn" style={{marginTop:4}}>
                {loading?'Sending OTP...':'Continue →'}
              </button>
            </form>
          </div>
        )}

        {/* OTP */}
        {step === 'otp' && (
          <div style={{background:'#0a0a0a',border:'1px solid #1a1a1a',borderRadius:18,padding:32,animation:'fadeUp .4s ease'}}>
            <div style={{textAlign:'center',marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:12}}>📬</div>
              <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:18,letterSpacing:'-.03em',marginBottom:6}}>Check your email</h2>
              <p style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#666',lineHeight:1.7}}>
                6-digit code sent to<br/><span style={{color:'#CFFF00'}}>{email}</span>
              </p>
            </div>
            <form onSubmit={handleOTP} style={{display:'flex',flexDirection:'column',gap:14}}>
              <input ref={otpRef} type="text" value={otp}
                onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="000000" maxLength={6} className="ifield"
                style={{textAlign:'center',fontSize:28,letterSpacing:'.35em',fontFamily:'var(--font-syne)',fontWeight:800}} />
              {error && <div style={{padding:'9px 14px',background:'rgba(255,64,64,0.06)',border:'1px solid rgba(255,64,64,0.2)',borderRadius:8,fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#ff6b6b'}}>{error}</div>}
              <button type="submit" disabled={loading||otp.length<6} className="pbtn">{loading?'Verifying...':'Verify →'}</button>
              <div style={{textAlign:'center'}}>
                {otpTimer>0
                  ? <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#666'}}>Resend in {otpTimer}s</span>
                  : <button type="button" onClick={resendOTP} style={{background:'none',border:'none',cursor:'none',fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#555',textDecoration:'underline'}}>Resend code</button>
                }
              </div>
              <button type="button" onClick={()=>{setStep('login');setError('');setOtp('')}}
                style={{background:'none',border:'none',cursor:'none',fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#666',textAlign:'center'}}>
                ← Back
              </button>
            </form>
          </div>
        )}

        {/* FORGOT */}
        {step === 'forgot' && (
          <div style={{background:'#0a0a0a',border:'1px solid #1a1a1a',borderRadius:18,padding:32,animation:'fadeUp .4s ease'}}>
            <div style={{textAlign:'center',marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:12}}>🔑</div>
              <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:18,letterSpacing:'-.03em',marginBottom:6}}>Reset your password</h2>
              <p style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#666',lineHeight:1.7}}>Enter your email — we'll send a reset link.</p>
            </div>
            <form onSubmit={handleForgotPassword} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#555',letterSpacing:'.08em',textTransform:'uppercase',display:'block',marginBottom:7}}>Email</label>
                <input type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)}
                  required placeholder="your@college.edu" className="ifield" autoFocus />
              </div>
              {error && <div style={{padding:'9px 14px',background:'rgba(255,64,64,0.06)',border:'1px solid rgba(255,64,64,0.2)',borderRadius:8,fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#ff6b6b'}}>{error}</div>}
              <button type="submit" disabled={loading} className="pbtn">{loading?'Sending...':'Send Reset Link →'}</button>
              <button type="button" onClick={()=>{setStep('login');setError('')}}
                style={{background:'none',border:'none',cursor:'none',fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#666',textAlign:'center'}}>
                ← Back to login
              </button>
            </form>
          </div>
        )}

        {/* FORGOT SENT */}
        {step === 'forgot_sent' && (
          <div style={{background:'#0a0a0a',border:'1px solid rgba(207,255,0,0.15)',borderRadius:18,padding:32,animation:'fadeUp .4s ease',textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:16}}>✉️</div>
            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:20,letterSpacing:'-.03em',marginBottom:8}}>Reset link sent!</h2>
            <p style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#666',lineHeight:1.8,marginBottom:24}}>
              Check your inbox at<br/><span style={{color:'#888'}}>{resetEmail}</span><br/><br/>
              Click the link to set a new password. Expires in 1 hour.
            </p>
            <button onClick={()=>{setStep('login');setError('')}}
              style={{background:'transparent',border:'1px solid #1e1e1e',borderRadius:9,color:'#555',fontFamily:'var(--font-jetbrains)',fontSize:11,padding:'9px 20px',cursor:'none',transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(207,255,0,0.2)';e.currentTarget.style.color='#CFFF00'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e1e';e.currentTarget.style.color='#555'}}>
              ← Back to login
            </button>
          </div>
        )}

        <div style={{textAlign:'center',marginTop:20,fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',letterSpacing:'.06em'}}>
          Not a member? <Link href="/register" style={{color:'#CFFF00',textDecoration:'none'}}>Apply here →</Link>
        </div>
      </div>
    </div>
  )
}
