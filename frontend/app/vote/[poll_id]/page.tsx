'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Cursor from '@/components/Cursor'

type State = 'loading' | 'inactive' | 'select' | 'scanning' | 'success' | 'duplicate' | 'error'

interface PollOption { id: string; label: string }
interface Poll {
  id: string
  title: string
  description: string
  options: PollOption[]
  is_active: boolean
  closes_at: string | null
  vote_counts: Record<string, number>
  total_votes: number
}

function extractUID(url: string): string | null {
  const match = url.match(/\/u\/([^/?#]+)/)
  return match ? match[1] : null
}

export default function VotePage() {
  const { poll_id }   = useParams<{ poll_id: string }>()
  const [poll,        setPoll]       = useState<Poll | null>(null)
  const [state,       setState]      = useState<State>('loading')
  const [selected,    setSelected]   = useState<string | null>(null)
  const [resultMsg,   setResultMsg]  = useState('')
  const [memberName,  setMemberName] = useState('')
  const [nfcSupported, setNfcSupported] = useState(true)

  useEffect(() => {
    if (!('NDEFReader' in window)) setNfcSupported(false)
  }, [])

  const fetchPoll = useCallback(async () => {
    const res = await fetch(`/api/polls/${poll_id}`)
    if (!res.ok) { setState('error'); setResultMsg('Poll not found.'); return }
    const data: Poll = await res.json()
    setPoll(data)
    setState(data.is_active ? 'select' : 'inactive')
  }, [poll_id])

  useEffect(() => { fetchPoll() }, [fetchPoll])

  // Refresh vote counts every 5s
  useEffect(() => {
    const iv = setInterval(fetchPoll, 5000)
    return () => clearInterval(iv)
  }, [fetchPoll])

  const startVoteScan = useCallback(async (optionId: string) => {
    if (!nfcSupported) return
    setState('scanning')

    try {
      const reader = new (window as any).NDEFReader()
      await reader.scan()

      reader.onreading = async (event: any) => {
        let uid: string | null = null
        for (const record of event.message.records) {
          if (record.recordType === 'url') {
            const url = new TextDecoder().decode(record.data)
            uid = extractUID(url)
            if (uid) break
          }
          if (record.recordType === 'text') {
            uid = new TextDecoder().decode(record.data).trim()
            break
          }
        }

        if (!uid) {
          setResultMsg('Could not read card.')
          setState('error')
          setTimeout(() => setState('select'), 2500)
          return
        }

        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encrypted_uid: uid, poll_id, option_id: optionId }),
        })
        const data = await res.json()
        setMemberName(data.member ? `${data.member.first_name} ${data.member.last_name}` : '')
        setResultMsg(data.message)

        if (data.duplicate) setState('duplicate')
        else if (!data.success) { setState('error') }
        else { setState('success'); fetchPoll() }

        setTimeout(() => { setSelected(null); setState('select') }, 3500)
      }

      reader.onerror = () => {
        setResultMsg('NFC read error.')
        setState('error')
        setTimeout(() => setState('select'), 2500)
      }

    } catch (err: any) {
      setResultMsg(err.name === 'NotAllowedError'
        ? 'NFC permission denied.'
        : err.message || 'NFC error.')
      setState('error')
      setTimeout(() => setState('select'), 2500)
    }
  }, [nfcSupported, poll_id, fetchPoll])

  const handleOptionSelect = (optionId: string) => {
    setSelected(optionId)
    startVoteScan(optionId)
  }

  const totalVotes = poll?.total_votes ?? 0

  return (
    <div style={{
      minHeight:'100vh', background:'#080808',
      display:'flex', flexDirection:'column',
      alignItems:'center', padding:'40px 24px',
      fontFamily:'var(--font-dm-sans)',
      cursor:'none',
    }}>
      <style>{`
        body { background:#080808; cursor:none; }
        @keyframes ping {
          0%   { transform:scale(1);   opacity:.7 }
          70%  { transform:scale(2.4); opacity:0  }
          100% { transform:scale(2.4); opacity:0  }
        }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes popIn {
          from { transform:scale(.85); opacity:0 }
          to   { transform:scale(1);   opacity:1 }
        }
        @keyframes fillBar { from{width:0} to{width:var(--w)} }
        .option-btn {
          width:100%; padding:14px 18px;
          background:#0d0d0d; border:1px solid #1a1a1a;
          border-radius:12px; color:#888;
          font-family:var(--font-syne); font-weight:700; font-size:15px;
          text-align:left; cursor:none; transition:all .2s;
          display:flex; align-items:center; justify-content:space-between;
          position:relative; overflow:hidden;
        }
        .option-btn:hover {
          border-color:rgba(207,255,0,0.3); color:#fff;
          background:rgba(207,255,0,0.04);
        }
        .option-btn.selected {
          border-color:#CFFF00; color:#CFFF00;
          background:rgba(207,255,0,0.06);
        }
        .ping-ring {
          position:absolute; inset:0; border-radius:50%;
          border:2px solid rgba(207,255,0,0.4);
          animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite;
        }
        @media (pointer: coarse) { body { cursor: auto !important; } * { cursor: auto !important; } }
      `}</style>

      <Cursor />

      {/* Header */}
      <div style={{textAlign:'center', marginBottom:32, width:'100%'}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" style={{width:28,height:28,objectFit:'contain',
          filter:'drop-shadow(0 0 8px rgba(207,255,0,0.4))',marginBottom:10}} />
        <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#666',
          letterSpacing:'.15em',textTransform:'uppercase'}}>
          CHATHURYA SDC · LIVE POLL
        </div>
      </div>

      {state === 'loading' && (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:32,height:32,border:'2px solid #1a1a1a',borderTopColor:'#CFFF00',
            borderRadius:'50%',animation:'spin .7s linear infinite'}} />
        </div>
      )}

      {state === 'inactive' && (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:16}}>⏸</div>
          <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#555',fontSize:20}}>Poll is not active</div>
          <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',letterSpacing:'.06em',marginTop:8}}>
            Activate from admin dashboard
          </div>
        </div>
      )}

      {(state === 'select' || state === 'scanning' || state === 'success' || state === 'duplicate' || state === 'error') && poll && (
        <div style={{width:'100%',maxWidth:440,flex:1,display:'flex',flexDirection:'column'}}>

          {/* Poll title */}
          <div style={{marginBottom:24}}>
            <h1 style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#fff',
              fontSize:'clamp(1.5rem,5vw,2rem)',letterSpacing:'-.04em',marginBottom:6}}>
              {poll.title}
            </h1>
            {poll.description && (
              <p style={{color:'#666',fontSize:13,lineHeight:1.7,fontFamily:'var(--font-dm-sans)'}}>
                {poll.description}
              </p>
            )}
            <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',marginTop:8,letterSpacing:'.06em'}}>
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast
            </div>
          </div>

          {/* Options */}
          {state === 'select' && (
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',
                letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>
                Select your choice, then tap your card
              </div>
              {poll.options.map(opt => (
                <button key={opt.id}
                  className={`option-btn${selected===opt.id?' selected':''}`}
                  onClick={() => handleOptionSelect(opt.id)}>
                  <span>{opt.label}</span>
                  <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,
                    color: selected===opt.id ? '#CFFF00' : '#555'}}>
                    {poll.vote_counts[opt.id] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Scanning state */}
          {state === 'scanning' && (
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}>
              <div style={{position:'relative',width:120,height:120,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div className="ping-ring" style={{animationDelay:'0s'}} />
                <div className="ping-ring" style={{animationDelay:'.5s'}} />
                <div style={{width:72,height:72,borderRadius:'50%',
                  border:'2px solid #CFFF00',
                  background:'rgba(207,255,0,0.05)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow:'0 0 24px rgba(207,255,0,0.15)'}}>
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:8,color:'#CFFF00',
                    letterSpacing:'.1em',textAlign:'center'}}>
                    TAP<br/>CARD
                  </div>
                </div>
              </div>
              {selected && poll && (
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666',
                    letterSpacing:'.06em',marginBottom:4}}>Voting for</div>
                  <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',fontSize:18}}>
                    {poll.options.find(o => o.id === selected)?.label}
                  </div>
                </div>
              )}
              <button onClick={() => { setSelected(null); setState('select') }}
                style={{background:'transparent',border:'1px solid #1a1a1a',borderRadius:8,
                  color:'#555',fontFamily:'var(--font-jetbrains)',fontSize:10,
                  padding:'7px 16px',cursor:'none',letterSpacing:'.04em'}}>
                Cancel
              </button>
            </div>
          )}

          {/* Success */}
          {state === 'success' && (
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',textAlign:'center',animation:'popIn .35s ease forwards'}}>
              <div style={{fontSize:44,marginBottom:16}}>✓</div>
              <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#CFFF00',
                fontSize:20,marginBottom:6}}>Vote cast!</div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:12,color:'#555',marginBottom:4}}>
                {memberName}
              </div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#666',letterSpacing:'.04em'}}>
                {resultMsg}
              </div>
            </div>
          )}

          {/* Duplicate */}
          {state === 'duplicate' && (
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',textAlign:'center',animation:'popIn .35s ease forwards'}}>
              <div style={{fontSize:44,marginBottom:16}}>↩</div>
              <div style={{fontFamily:'var(--font-syne)',fontWeight:800,color:'#555',fontSize:20,marginBottom:6}}>
                Already voted
              </div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#666',letterSpacing:'.04em'}}>
                {memberName}
              </div>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',textAlign:'center',animation:'popIn .35s ease forwards'}}>
              <div style={{fontSize:44,marginBottom:16}}>✕</div>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:11,color:'#ff4040',
                letterSpacing:'.04em',maxWidth:260}}>{resultMsg}</div>
            </div>
          )}

          {/* Live tally */}
          {(state === 'select') && totalVotes > 0 && (
            <div style={{marginTop:'auto',paddingTop:20,borderTop:'1px solid #111'}}>
              <div style={{fontFamily:'var(--font-jetbrains)',fontSize:9,color:'#666',
                letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>
                Live tally
              </div>
              {poll.options.map(opt => {
                const votes = poll.vote_counts[opt.id] ?? 0
                const pct   = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
                return (
                  <div key={opt.id} style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontFamily:'var(--font-jetbrains)',fontSize:10,color:'#666'}}>{opt.label}</span>
                      <span style={{fontFamily:'var(--font-syne)',fontWeight:700,color:'#CFFF00',fontSize:11}}>{pct}%</span>
                    </div>
                    <div style={{height:3,background:'#111',borderRadius:2,overflow:'hidden'}}>
                      <div style={{
                        height:'100%', borderRadius:2,
                        background:'rgba(207,255,0,0.5)',
                        width:`${pct}%`,
                        transition:'width .6s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
