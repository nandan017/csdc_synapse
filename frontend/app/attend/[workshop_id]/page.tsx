'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

type State = 'loading' | 'inactive' | 'ready' | 'scanning' | 'success' | 'late' | 'duplicate' | 'error'

interface WorkshopInfo {
  id: string
  title: string
  is_active: boolean
  scheduled_at: string
  xp_for_attend: number
  attendance_count: number
}

interface TapResult {
  success: boolean
  duplicate: boolean
  is_late?: boolean
  xp_awarded?: number
  workshop?: string
  message: string
  member?: { first_name: string; last_name: string }
}

/* ── Extract UID from NFC URL record ── */
function extractUID(url: string): string | null {
  // Matches /u/ENCRYPTED_UID at end of URL
  const match = url.match(/\/u\/([^/?#]+)/)
  return match ? match[1] : null
}

export default function AttendancePage() {
  const { workshop_id } = useParams<{ workshop_id: string }>()
  const [state,    setState]    = useState<State>('loading')
  const [workshop, setWorkshop] = useState<WorkshopInfo | null>(null)
  const [result,   setResult]   = useState<TapResult | null>(null)
  const [count,    setCount]    = useState(0)
  const [cooldown, setCooldown] = useState(false)
  const [nfcSupported, setNfcSupported] = useState(true)

  /* ── Check NFC support ── */
  useEffect(() => {
    if (typeof window !== 'undefined' && !('NDEFReader' in window)) {
      setNfcSupported(false)
    }
  }, [])

  /* ── Fetch workshop status ── */
  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/attend/${workshop_id}/status`)
    if (!res.ok) { setState('error'); return }
    const data: WorkshopInfo = await res.json()
    setWorkshop(data)
    setCount(data.attendance_count)
    setState(data.is_active ? 'ready' : 'inactive')
  }, [workshop_id])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // Refresh count every 10s
  useEffect(() => {
    const iv = setInterval(fetchStatus, 10000)
    return () => clearInterval(iv)
  }, [fetchStatus])

  /* ── Start NFC scanning ── */
  const startScan = useCallback(async () => {
    if (!nfcSupported) return
    setState('scanning')

    try {
      const reader = new (window as any).NDEFReader()
      await reader.scan()

      reader.onreading = async (event: any) => {
         if (cooldown) return 
         setCooldown(true) 
        // Extract URL from NDEF record
        let uid: string | null = null
        for (const record of event.message.records) {
          if (record.recordType === 'url') {
            const decoder = new TextDecoder()
            const url = decoder.decode(record.data)
            uid = extractUID(url)
            if (uid) break
          }
          // Also handle text records (plain UID)
          if (record.recordType === 'text') {
            const decoder = new TextDecoder()
            uid = decoder.decode(record.data).trim()
            break
          }
        }

        if (!uid) {
          setResult({ success: false, duplicate: false, message: 'Could not read card UID.' })
          setState('error')
          setTimeout(() => { setState('scanning') }, 2500)
          return
        }

        // POST to backend
        const res = await fetch('/api/attend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encrypted_uid: uid, workshop_id }),
        })
        const data: TapResult = await res.json()
        setResult(data)
        setCount(c => data.success ? c + 1 : c)

        if (data.duplicate)      setState('duplicate')
        else if (!data.success)  setState('error')
        else if (data.is_late)   setState('late')
        else                     setState('success')

        // Back to scanning after 3s
        setTimeout(() => {
    setState('scanning')
    setCooldown(false)   
  }, 5000) 
      }

      reader.onerror = () => {
        setState('error')
        setResult({ success: false, duplicate: false, message: 'NFC read error. Try again.' })
        setTimeout(() => setState('scanning'), 2500)
      }

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setResult({ success: false, duplicate: false, message: 'NFC permission denied. Allow NFC in browser settings.' })
      } else {
        setResult({ success: false, duplicate: false, message: err.message || 'NFC error.' })
      }
      setState('error')
    }
  }, [nfcSupported, workshop_id])

  /* ── Auto-start scanning when ready ── */
  useEffect(() => {
    if (state === 'ready' && nfcSupported) startScan()
  }, [state, nfcSupported, startScan])

  /* ── Styles ── */
  const bgColor = {
    loading:   '#080808',
    inactive:  '#080808',
    ready:     '#080808',
    scanning:  '#080808',
    success:   '#080808',
    late:      '#080808',
    duplicate: '#080808',
    error:     '#080808',
  }[state]

  const accentColor = {
    success:   '#CFFF00',
    late:      '#ff9800',
    duplicate: '#555',
    error:     '#ff4040',
    scanning:  '#CFFF00',
    ready:     '#CFFF00',
    loading:   '#333',
    inactive:  '#333',
  }[state]

  return (
    <div style={{
      minHeight:'100vh', background:bgColor,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'space-between',
      fontFamily:'var(--font-dm-sans)',
      padding:'40px 24px',
      userSelect:'none',
      cursor:'none',
      transition:'background .4s ease',
    }}>
      <style>{`
        body { background:#080808; cursor:none; }
        @keyframes ping {
          0%   { transform:scale(1);   opacity:.8 }
          70%  { transform:scale(2.2); opacity:0  }
          100% { transform:scale(2.2); opacity:0  }
        }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes popIn {
          from { transform:scale(.8); opacity:0 }
          to   { transform:scale(1);  opacity:1 }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px) }
          to   { opacity:1; transform:translateY(0) }
        }
        .ping-ring {
          position:absolute; inset:0; border-radius:50%;
          border:2px solid currentColor;
          animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite;
        }
        .tap-result {
          animation:popIn .35s cubic-bezier(.16,1,.3,1) forwards;
        }
      `}</style>

      {/* Header */}
      <div style={{textAlign:'center', width:'100%'}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" style={{width:28,height:28,objectFit:'contain',
          filter:'drop-shadow(0 0 8px rgba(207,255,0,0.4))',marginBottom:8}} />

        {workshop && (
          <div style={{
            fontFamily:'var(--font-jetbrains)', fontSize:11,
            color:'#333', letterSpacing:'.08em', textTransform:'uppercase',
          }}>
            {workshop.title}
          </div>
        )}

        {/* Attendance counter */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          marginTop:12, padding:'6px 16px',
          background:'rgba(207,255,0,0.05)',
          border:'1px solid rgba(207,255,0,0.1)',
          borderRadius:99,
        }}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#CFFF00',
            boxShadow:'0 0 8px rgba(207,255,0,0.8)'}} />
          <span style={{fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#CFFF00',letterSpacing:'.04em'}}>
            {count} tapped in
          </span>
        </div>
      </div>

      {/* Centre piece */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:24,flex:1,justifyContent:'center'}}>

        {/* NFC ring indicator */}
        <div style={{
          position:'relative', width:160, height:160,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {/* Ping rings — only when scanning */}
          {state === 'scanning' && (
            <>
              <div className="ping-ring" style={{color:'rgba(207,255,0,0.3)',animationDelay:'0s'}} />
              <div className="ping-ring" style={{color:'rgba(207,255,0,0.15)',animationDelay:'.5s'}} />
            </>
          )}

          {/* Centre circle */}
          <div style={{
            width:100, height:100, borderRadius:'50%',
            border:`2px solid ${accentColor}`,
            background:`rgba(${state==='success'?'207,255,0':state==='late'?'255,152,0':state==='error'?'255,64,64':'207,255,0'},0.04)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .3s ease',
            boxShadow:`0 0 ${state==='scanning'?'24':'8'}px ${accentColor}33`,
          }}>
            {state === 'loading' && (
              <div style={{width:28,height:28,border:'2px solid #1a1a1a',borderTopColor:'#CFFF00',borderRadius:'50%',animation:'spin .7s linear infinite'}} />
            )}
            {state === 'scanning' && (
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#CFFF00',letterSpacing:'.12em',textAlign:'center'}}>
                TAP<br/>CARD
              </div>
            )}
            {(state === 'success' || state === 'late') && (
              <div style={{fontSize:36}}>✓</div>
            )}
            {state === 'duplicate' && (
              <div style={{fontSize:36}}>↩</div>
            )}
            {state === 'error' && (
              <div style={{fontSize:36}}>✕</div>
            )}
            {state === 'inactive' && (
              <div style={{fontSize:36}}>⏸</div>
            )}
          </div>
        </div>

        {/* State label */}
        <div style={{textAlign:'center'}}>
          {state === 'loading' && (
            <p style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#333',letterSpacing:'.1em'}}>
              LOADING...
            </p>
          )}
          {state === 'inactive' && (
            <>
              <p style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#333',fontSize:18,marginBottom:8}}>
                Workshop not active
              </p>
              <p style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#2a2a2a',letterSpacing:'.06em'}}>
                Activate it from the admin dashboard
              </p>
            </>
          )}
          {state === 'scanning' && (
            <p style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#555',fontSize:16,letterSpacing:'-.02em'}}>
              Hold card to phone
            </p>
          )}
          {state === 'scanning' && cooldown && (
  <p style={{fontFamily:'var(--font-jetbrains)',fontSize:10,
    color:'#333',letterSpacing:'.06em',marginTop:8}}>
    Cooldown — ready in a moment...
  </p>
)}

          {(state === 'success' || state === 'late') && result && (
            <div className="tap-result" style={{textAlign:'center',animation:'popIn .35s cubic-bezier(.16,1,.3,1)'}}>
              <p style={{fontFamily:'var(--font-syne)',fontWeight:800,
                color: state === 'late' ? '#ff9800' : '#CFFF00',
                fontSize:22,letterSpacing:'-.03em',marginBottom:4}}>
                {result.member?.first_name} {result.member?.last_name}
              </p>
              <p style={{fontFamily:'var(--font-jetbrains)',fontSize:12,
                color: state === 'late' ? '#ff9800' : '#CFFF00',
                letterSpacing:'.04em'}}>
                {result.message}
              </p>
              {state === 'late' && (
                <p style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#555',marginTop:4,letterSpacing:'.04em'}}>
                  Arrived late
                </p>
              )}
            </div>
          )}
          {state === 'duplicate' && result && (
            <div className="tap-result">
              <p style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#555',fontSize:20,marginBottom:4}}>
                {result.member?.first_name}
              </p>
              <p style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#444',letterSpacing:'.04em'}}>
                Already checked in
              </p>
            </div>
          )}
          {state === 'error' && result && (
            <div className="tap-result">
              <p style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#ff4040',letterSpacing:'.04em',textAlign:'center',maxWidth:240}}>
                {result.message}
              </p>
            </div>
          )}
          {!nfcSupported && (
            <div style={{textAlign:'center',maxWidth:280}}>
              <p style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#ff4040',fontSize:16,marginBottom:8}}>
                NFC not supported
              </p>
              <p style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#444',letterSpacing:'.04em',lineHeight:1.7}}>
                Use Chrome on an Android phone with NFC enabled
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        fontFamily:'var(--font-jetbrains)', fontSize:9,
        color:'#1e1e1e', letterSpacing:'.1em', textTransform:'uppercase',
        textAlign:'center',
      }}>
        Chathurya SDC · NFC Attendance
        {workshop && (
          <div style={{marginTop:4,color:'#1a1a1a'}}>
            +{workshop.xp_for_attend} XP per tap
          </div>
        )}
      </div>
    </div>
  )
}
