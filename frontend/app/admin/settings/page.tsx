'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const [user, setUser]   = useState<any>(null)
  const [toast, setToast] = useState<string|null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(null),3000) }

  useEffect(()=>{ createClient().auth.getUser().then(({data})=>setUser(data.user)) },[])

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const newPwd = fd.get('password') as string
    const { error } = await createClient().auth.updateUser({ password: newPwd })
    if (error) showToast('Failed: ' + error.message)
    else { showToast('Password updated'); e.currentTarget.reset() }
  }

  return (
    <div style={{padding:'32px 36px',maxWidth:680}}>
      {toast && (
        <div style={{position:'fixed',top:20,right:20,zIndex:9999,padding:'12px 20px',borderRadius:10,background:'rgba(0,230,118,0.12)',border:'1px solid rgba(0,230,118,0.3)',color:'#00e676',fontFamily:'var(--font-jetbrains)',fontSize:12}}>
          {toast}
        </div>
      )}

      <div style={{marginBottom:32}}>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:8}}>// settings</div>
        <h1 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',fontSize:24,letterSpacing:'-.03em',margin:0}}>Settings</h1>
      </div>

      {/* Account info */}
      <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:24,marginBottom:20}}>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>Account</div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(207,255,0,0.08)',border:'1px solid rgba(207,255,0,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:18}}>
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#fff',fontSize:15}}>{user?.email}</div>
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#CFFF00',marginTop:3}}>Club Lead · Admin</div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:24,marginBottom:20}}>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>Change Password</div>
        <form onSubmit={changePassword}>
          <div style={{marginBottom:14}}>
            <label style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.06em',textTransform:'uppercase',display:'block',marginBottom:6}}>New Password</label>
            <input name="password" type="password" required minLength={8}
              placeholder="Min. 8 characters"
              style={{width:'100%',background:'#111',border:'1px solid #1e1e1e',borderRadius:8,color:'#e0e0e0',fontFamily:'var(--font-dm-sans)',fontSize:13,padding:'10px 12px',outline:'none',boxSizing:'border-box'}}
              onFocus={e=>e.target.style.borderColor='rgba(207,255,0,0.3)'}
              onBlur={e=>e.target.style.borderColor='#1e1e1e'}
            />
          </div>
          <button type="submit" style={{background:'#CFFF00',border:'none',borderRadius:8,color:'#000',fontFamily:'var(--font-syne)',fontWeight:800,fontSize:13,padding:'10px 22px',cursor:'none'}}>
            Update Password
          </button>
        </form>
      </div>

      {/* Info */}
      <div style={{background:'#0d0d0d',border:'1px solid #161616',borderRadius:14,padding:24}}>
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:16}}>System Info</div>
        {[
          ['Platform',   'CSDC Synapse v0.1.0'],
          ['Club',       'Chathurya Student Developers Club'],
          ['College',    'Seshadripuram College, Bengaluru'],
          ['Admin route','/admin'],
          ['DB',         'Supabase PostgreSQL'],
        ].map(([k,v])=>(
          <div key={k} style={{display:'flex',gap:20,marginBottom:10,alignItems:'baseline'}}>
            <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#333',letterSpacing:'.06em',textTransform:'uppercase',minWidth:100,flexShrink:0}}>{k}</span>
            <span style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#555'}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
