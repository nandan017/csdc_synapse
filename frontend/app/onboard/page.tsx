'use client'
import { Suspense } from 'react'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Cursor from '@/components/Cursor'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface AppData {
  first_name:   string
  last_name:    string
  email:        string
  year:         number
  section:      string
  stream:       string
  tshirt_size:  string
  linkedin:     string
  github:       string
  application_id: string
}

type Step = 'validating' | 'invalid' | 'profile' | 'avatar' | 'password' | 'submitting' | 'done'

const SKILL_SUGGESTIONS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js',
  'FastAPI', 'Django', 'Node.js', 'HTML/CSS', 'Tailwind CSS',
  'SQL', 'Git', 'Docker', 'Machine Learning', 'UI/UX Design',
  'C', 'C++', 'Java', 'Flutter', 'Firebase',
]

/* ═══════════════════════════════════════════════════════════════════════════ */
function OnboardContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''

  const [step,        setStep]       = useState<Step>('validating')
  const [appData,     setAppData]    = useState<AppData | null>(null)
  const [invalidMsg,  setInvalidMsg] = useState('')

  // Profile step
  const [bio,         setBio]        = useState('')
  const [skills,      setSkills]     = useState<string[]>([])
  const [skillInput,  setSkillInput] = useState('')

  // Avatar step
  const [avatarMode,  setAvatarMode] = useState<'generated' | 'upload'>('generated')
  const [avatarUrl,   setAvatarUrl]  = useState<string | null>(null)
  const [uploading,   setUploading]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Password step
  const [password,    setPassword]   = useState('')
  const [showPwd,     setShowPwd]    = useState(false)
  const [pwdError,    setPwdError]   = useState('')

  // Submit
  const [submitError, setSubmitError] = useState('')

  /* ── Validate token on mount ── */
  useEffect(() => {
    if (!token) { setInvalidMsg('No invite token found in the URL.'); setStep('invalid'); return }
    fetch(`/api/onboard/validate?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setAppData(d); setStep('profile') }
        else { setInvalidMsg(d.detail || 'Invalid invite link.'); setStep('invalid') }
      })
      .catch(() => { setInvalidMsg('Could not verify your invite. Try again.'); setStep('invalid') })
  }, [token])



  /* ── Skills ── */
  const addSkill = (s: string) => {
    const trimmed = s.trim()
    if (trimmed && !skills.includes(trimmed) && skills.length < 10) {
      setSkills(p => [...p, trimmed])
    }
    setSkillInput('')
  }

  const removeSkill = (s: string) => setSkills(p => p.filter(x => x !== s))

  /* ── Avatar upload ── */
  const handleUpload = async (file: File) => {
    if (!file) return
    setUploading(true)
    const sb = createClient()
    const path = `avatars/${appData!.application_id}_${Date.now()}`
    const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { setUploading(false); return }
    const { data } = sb.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!password) { setPwdError('Please enter your password'); return }
    setStep('submitting')
    setSubmitError('')

    const res = await fetch('/api/onboard/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        password,
        bio:       bio.trim(),
        skills,
        avatar_url: avatarMode === 'upload' ? avatarUrl : null,
      }),
    })

    const data = await res.json()

    if (res.ok) {
      // Sign them in automatically
      const sb = createClient()
      await sb.auth.signInWithPassword({ email: appData!.email, password })
      setStep('done')
    } else {
      setSubmitError(data.detail || data.message || 'Something went wrong.')
      setStep('password')
    }
  }

  /* ── Derived ── */
  const initials = appData
    ? `${appData.first_name[0]}${appData.last_name[0]}`.toUpperCase()
    : '?'

  const progressPct = {
    validating: 0, invalid: 0,
    profile: 25, avatar: 50, password: 75,
    submitting: 90, done: 100,
  }[step]

  /* ═════════════════════════════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════════════════════════════ */
  
  return (
    <div style={{
      minHeight:'100vh', background:'#080808', cursor:'none',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-dm-sans)', padding:'40px 20px',
    }}>

    <Cursor />


      {/* Top bar */}
      <div style={{
        position:'fixed', top:0, left:0, right:0,
        height:3, background:'#1e1e1e', zIndex:100,
      }}>
        <div style={{
          height:'100%', background:'#CFFF00',
          width:`${progressPct}%`,
          transition:'width .4s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>

      {/* Logo */}
      <div style={{textAlign:'center', marginBottom:40}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Chathurya"
          style={{width:36,height:36,objectFit:'contain',marginBottom:10,
            filter:'drop-shadow(0 0 8px rgba(207,255,0,0.35))'}} />
        <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:16,letterSpacing:'-.02em'}}>
          Chathurya
        </div>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#666',letterSpacing:'.1em',marginTop:2}}>
          Member Onboarding
        </div>
      </div>

      {/* ── VALIDATING ── */}
      {step === 'validating' && (
        <Card>
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#aaa',letterSpacing:'.08em'}}>
              Verifying your invite...
            </div>
            <div style={{marginTop:16,width:32,height:32,border:'2px solid #1e1e1e',borderTopColor:'#CFFF00',borderRadius:'50%',animation:'spin .6s linear infinite',margin:'16px auto 0'}} />
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </Card>
      )}

      {/* ── INVALID ── */}
      {step === 'invalid' && (
        <Card>
          <div style={{textAlign:'center',padding:'8px 0'}}>
            <div style={{fontSize:32,marginBottom:16}}>⚠️</div>
            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:20,marginBottom:12,letterSpacing:'-.03em'}}>
              Invalid Invite
            </h2>
            <p style={{color:'#555',fontSize:14,lineHeight:1.7}}>{invalidMsg}</p>
            <p style={{color:'#bbb',fontSize:12,marginTop:12,fontFamily:'var(--font-jetbrains)'}}>
              Contact us at chathuryastudentdevclub@gmail.com
            </p>
          </div>
        </Card>
      )}

      {/* ── STEP 1: PROFILE ── */}
      {step === 'profile' && appData && (
        <Card>
          <StepHeader
            step={1} total={3}
            title={`Hey ${appData.first_name}, welcome! 🎉`}
            sub="Let's set up your member profile."
          />

          {/* Pre-filled read-only info */}
          <div style={{
            background:'#0a0a0a', borderRadius:10, border:'1px solid #1e1e1e',
            padding:'14px 16px', marginBottom:24,
          }}>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>
              From your application
            </div>
            <div className="onboard-info-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px'}}>
              {[
                ['Name',    `${appData.first_name} ${appData.last_name}`],
                ['Email',   appData.email],
                ['Stream',  appData.stream],
                ['Year',    `${appData.year === 1?'1st':appData.year===2?'2nd':'3rd'} Year · Section ${appData.section}`],
                ['T-Shirt', appData.tshirt_size],
              ].map(([l,v]) => (
                <div key={l}>
                  <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#555',letterSpacing:'.06em',textTransform:'uppercase'}}>{l} </span>
                  <span style={{fontSize:13,color:'#ccc',fontWeight:500}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div style={{marginBottom:18}}>
            <Label>Bio <span style={{color:'#666',fontWeight:400}}>(optional)</span></Label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell the club a bit about yourself..."
              maxLength={200}
              rows={3}
              style={{...inputStyle, resize:'vertical', lineHeight:1.6}}
            />
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#ccc',textAlign:'right',marginTop:4}}>
              {bio.length}/200
            </div>
          </div>

          {/* Skills */}
          <div style={{marginBottom:24}}>
            <Label>Skills <span style={{color:'#ccc',fontWeight:400}}>(up to 10)</span></Label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
              {skills.map(s => (
                <span key={s} style={{
                  display:'inline-flex',alignItems:'center',gap:5,
                  background:'rgba(207,255,0,0.12)',border:'1px solid rgba(207,255,0,0.3)',
                  borderRadius:99,padding:'4px 10px',
                  fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#ccc',
                }}>
                  {s}
                  <button onClick={()=>removeSkill(s)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:12,lineHeight:1,padding:0}}>×</button>
                </span>
              ))}
            </div>
            <div style={{position:'relative'}}>
              <input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter'||e.key===',') { e.preventDefault(); addSkill(skillInput) } }}
                placeholder="Type a skill and press Enter..."
                style={inputStyle}
              />
            </div>
            {/* Suggestions */}
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:8}}>
              {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0,8).map(s => (
                <button key={s} onClick={() => addSkill(s)}
                  style={{
                    background:'transparent',border:'1px solid #1e1e1e',borderRadius:99,
                    padding:'3px 10px',fontFamily:'var(--font-jetbrains)',fontSize:10,
                    color:'#555',cursor:'pointer',transition:'all .15s',
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#CFFF00';e.currentTarget.style.color='#CFFF00'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e1e';e.currentTarget.style.color='#555'}}>
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <PrimaryBtn onClick={() => setStep('avatar')}>Continue →</PrimaryBtn>
        </Card>
      )}

      {/* ── STEP 2: AVATAR ── */}
      {step === 'avatar' && appData && (
        <Card>
          <StepHeader
            step={2} total={3}
            title="Profile picture"
            sub="Choose how you want to appear to other members."
          />

          <div style={{display:'flex',gap:12,marginBottom:24}}>
            {(['generated','upload'] as const).map(mode => (
              <button key={mode} onClick={() => setAvatarMode(mode)}
                style={{
                  flex:1, padding:'12px', borderRadius:10, cursor:'pointer',
                  border: avatarMode===mode ? '2px solid #CFFF00' : '1px solid #1e1e1e',
                  background: avatarMode===mode ? 'rgba(207,255,0,0.06)' : '#0a0a0a',
                  fontFamily:'var(--font-jetbrains)', fontSize:11,
                  color: avatarMode===mode ? '#CFFF00' : '#555',
                  transition:'all .2s',
                }}>
                {mode === 'generated' ? '✦ Generated' : '↑ Upload photo'}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div style={{display:'flex',justifyContent:'center',marginBottom:24}}>
            {avatarMode === 'generated' || !avatarUrl ? (
              <div style={{
                width:96,height:96,borderRadius:'50%',
                background:'linear-gradient(135deg,#CFFF00,#a8cc00)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:'var(--font-syne)',fontWeight:800,color:'#000',fontSize:28,
              }}>
                {initials}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar"
                style={{width:96,height:96,borderRadius:'50%',objectFit:'cover',border:'2px solid #CFFF00'}} />
            )}
          </div>

          {avatarMode === 'upload' && (
            <div style={{textAlign:'center',marginBottom:20}}>
              <input type="file" accept="image/*" ref={fileRef}
                style={{display:'none'}}
                onChange={e => { const f=e.target.files?.[0]; if(f) handleUpload(f) }} />
              <button onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  background:'transparent', border:'1px solid #1e1e1e',
                  borderRadius:8, padding:'9px 20px', cursor:'pointer',
                  fontFamily:'var(--font-jetbrains)', fontSize:11, color:'#555',
                  transition:'all .2s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#CFFF00';e.currentTarget.style.color='#CFFF00'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e1e';e.currentTarget.style.color='#555'}}>
                {uploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Choose photo'}
              </button>
              {avatarUrl && (
                <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',marginTop:8}}>
                  ✓ Photo uploaded
                </div>
              )}
            </div>
          )}

          <div style={{display:'flex',gap:10}}>
            <SecondaryBtn onClick={() => setStep('profile')}>← Back</SecondaryBtn>
            <PrimaryBtn onClick={() => setStep('password')}>Continue →</PrimaryBtn>
          </div>
        </Card>
      )}

      {/* ── STEP 3: PASSWORD ── */}
      {step === 'password' && appData && (
        <Card>
          <StepHeader
            step={3} total={3}
            title="Confirm your password"
            sub="Enter the password you set during registration to complete setup."
          />

          <div style={{marginBottom:24}}>
            <Label>Password</Label>
            <div style={{position:'relative'}}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setPwdError('') }}
                placeholder="Your registration password"
                style={inputStyle}
                autoFocus
              />
              <button onClick={() => setShowPwd(p=>!p)}
                style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
                  background:'none',border:'none',cursor:'pointer',
                  fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#bbb'}}>
                {showPwd ? 'hide' : 'show'}
              </button>
            </div>
            {pwdError && (
              <p style={{color:'#ff4040',fontSize:12,fontFamily:'var(--font-jetbrains)',marginTop:6}}>{pwdError}</p>
            )}
          </div>

          {submitError && (
            <div style={{
              marginBottom:16,padding:'10px 14px',
              background:'rgba(255,64,64,0.06)',border:'1px solid rgba(255,64,64,0.2)',
              borderRadius:8,color:'#ff4040',fontFamily:'var(--font-jetbrains)',fontSize:12,
            }}>
              {submitError}
            </div>
          )}

          {/* Summary */}
          <div style={{
            background:'#0a0a0a',borderRadius:10, border:'1px solid #1e1e1e',
            padding:'14px 16px',marginBottom:24,
            fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#888',
          }}>
            <div style={{color:'#aaa',fontSize:10,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:8}}>Summary</div>
            <div>👤 {appData.first_name} {appData.last_name} · {appData.stream} · {appData.year === 1?'1st':appData.year===2?'2nd':'3rd'} Year</div>
            {bio && <div style={{marginTop:4}}>📝 Bio added</div>}
            {skills.length>0 && <div style={{marginTop:4}}>⚡ {skills.length} skill{skills.length>1?'s':''}: {skills.join(', ')}</div>}
            <div style={{marginTop:4}}>{avatarMode==='upload'&&avatarUrl ? '📷 Custom photo' : '✦ Generated avatar'}</div>
          </div>

          <div style={{display:'flex',gap:10}}>
            <SecondaryBtn onClick={() => setStep('avatar')}>← Back</SecondaryBtn>
            <PrimaryBtn onClick={handleSubmit}>Complete Setup →</PrimaryBtn>
          </div>
        </Card>
      )}

      {/* ── SUBMITTING ── */}
      {step === 'submitting' && (
        <Card>
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{width:40,height:40,border:'2px solid #1e1e1e',borderTopColor:'#CFFF00',borderRadius:'50%',animation:'spin .6s linear infinite',margin:'0 auto 20px'}} />
            <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#111',fontSize:16}}>
              Setting up your profile...
            </div>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#aaa',marginTop:8}}>
              Creating your account and NFC identity
            </div>
          </div>
        </Card>
      )}

      {/* ── DONE ── */}
      {step === 'done' && appData && (
        <Card>
          <div style={{textAlign:'center',padding:'8px 0'}}>
            {/* Avatar */}
            <div style={{
              width:72,height:72,borderRadius:'50%',
              background:'linear-gradient(135deg,#CFFF00,#a8cc00)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:'var(--font-syne)',fontWeight:800,color:'#000',fontSize:22,
              margin:'0 auto 20px',
              boxShadow:'0 0 0 4px rgba(207,255,0,0.15)',
            }}>
              {initials}
            </div>

            <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:22,letterSpacing:'-.03em',marginBottom:8}}>
              You're officially in. ⚡
            </h2>
            <p style={{color:'#555',fontSize:14,lineHeight:1.75,maxWidth:320,margin:'0 auto 24px'}}>
              Welcome to Chathurya, {appData.first_name}. Your member profile is ready. Your NFC card will be issued at the next workshop.
            </p>

            <div style={{
              background:'#0a0a0a',borderRadius:10, border:'1px solid #1e1e1e',
              padding:'12px 16px',marginBottom:24,
              fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#888',
              display:'flex',flexDirection:'column',gap:4,
            }}>
              <div>⚡ XP: 0 — start attending workshops to earn</div>
              <div>🃏 NFC card: pending issuance</div>
              {skills.length > 0 && <div>🛠 Skills: {skills.join(', ')}</div>}
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              style={{
                width:'100%',padding:'13px',background:'#CFFF00',
                color:'#000',border:'none',borderRadius:10,
                fontFamily:'var(--font-syne)',fontWeight:800,fontSize:14,
                cursor:'pointer',letterSpacing:'-.01em',
              }}>
              Go to Dashboard →
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────────────────────── */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width:'100%', maxWidth:480,
      background:'#0f0f0f', borderRadius:18,
      border:'1px solid #1e1e1e',
      padding:32,
      boxShadow:'0 2px 24px rgba(0,0,0,0.3)',
    }}>
      {children}
    </div>
  )
}

function StepHeader({ step, total, title, sub }:
  { step:number; total:number; title:string; sub:string }) {
  return (
    <div style={{marginBottom:24}}>
      <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:8}}>
        Step {step} of {total}
      </div>
      <h2 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:20,letterSpacing:'-.03em',margin:'0 0 6px'}}>
        {title}
      </h2>
      <p style={{color:'#555',fontSize:13,margin:0,lineHeight:1.6}}>{sub}</p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display:'block',
      fontFamily:'var(--font-jetbrains)',fontSize:10,
      color:'#555',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:7,
    }}>
      {children}
    </label>
  )
}

function PrimaryBtn({ onClick, children }: { onClick:()=>void; children:React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flex:1, width:'100%', padding:'12px',
      background:'#CFFF00', color:'#000', border:'none', borderRadius:10,
      fontFamily:'var(--font-syne)', fontWeight:800, fontSize:14,
      cursor:'pointer', letterSpacing:'-.01em', transition:'opacity .2s',
    }}
    onMouseEnter={e=>(e.currentTarget.style.opacity='.85')}
    onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
      {children}
    </button>
  )
}

function SecondaryBtn({ onClick, children }: { onClick:()=>void; children:React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding:'12px 18px', background:'transparent',
      border:'1px solid #1e1e1e', borderRadius:10,
      fontFamily:'var(--font-jetbrains)', fontSize:12, color:'#555',
      cursor:'pointer', transition:'all .2s', whiteSpace:'nowrap',
    }}
    onMouseEnter={e=>{e.currentTarget.style.borderColor='#CFFF00';e.currentTarget.style.color='#CFFF00'}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e1e1e';e.currentTarget.style.color='#555'}}>
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width:'100%', background:'#0a0a0a',
  border:'1px solid #1e1e1e', borderRadius:8,
  color:'#e0e0e0', fontFamily:'var(--font-dm-sans)', fontSize:13,
  padding:'11px 14px', outline:'none', boxSizing:'border-box',
  transition:'border-color .2s',
}


export default function OnboardPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#000'}} />}>
      <OnboardContent />
    </Suspense>
  )
}