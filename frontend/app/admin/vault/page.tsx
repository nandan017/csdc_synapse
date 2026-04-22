'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface Resource {
  id: string; title: string; description: string
  category: string; url: string; tags: string[]
  view_count: number; is_public: boolean; created_at: string
}

const CATEGORIES = ['workshop','project','tool','reference','template']

export default function AdminVaultPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [memberId,  setMemberId]  = useState<string | null>(null)
  const [toast,     setToast]     = useState<string | null>(null)
  const [tagInput,  setTagInput]  = useState('')
  const [form, setForm] = useState({
    title: '', description: '', category: 'workshop',
    url: '', tags: [] as string[], is_public: true,
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) return
      sb.from('members').select('id').eq('auth_user_id', data.user.id).single()
        .then(({ data: m }) => { if (m) setMemberId(m.id) })
    })
  }, [])

  const fetchResources = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/backend/vault/')
    const data = await res.json()
    setResources(data.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchResources() }, [fetchResources])

  const addTag = (t: string) => {
    const trimmed = t.trim()
    if (trimmed && !form.tags.includes(trimmed)) setForm(f => ({ ...f, tags: [...f.tags, trimmed] }))
    setTagInput('')
  }

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberId) { showToast('No member ID found'); return }
    const res = await fetch(`/api/backend/vault/?uploader_id=${memberId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      showToast('Resource added ✓')
      setCreating(false)
      setForm({ title: '', description: '', category: 'workshop', url: '', tags: [], is_public: true })
      fetchResources()
    } else showToast('Failed to add resource')
  }

  const deleteResource = async (id: string) => {
    await fetch(`/api/backend/vault/${id}`, { method: 'DELETE' })
    showToast('Deleted')
    fetchResources()
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 10, background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)', color: '#00e676', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>// vault</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 24, letterSpacing: '-.03em', margin: 0 }}>Resource Vault</h1>
        </div>
        <button onClick={() => setCreating(p => !p)} style={{ background: '#CFFF00', border: 'none', borderRadius: 9, color: '#000', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 13, padding: '10px 20px', cursor: 'none' }}>
          {creating ? 'Cancel' : '+ Add Resource'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={createResource} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16 }}>New Resource</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div><Label>Title</Label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required style={inputStyle} placeholder="Resource title" /></div>
            <div>
              <Label>Category</Label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, cursor: 'none' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}><Label>URL</Label><input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required style={inputStyle} placeholder="https://github.com/..." /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>Description</Label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What is this resource about?" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Label>Tags</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {form.tags.map(t => (
                <span key={t} style={{ background: 'rgba(207,255,0,0.08)', border: '1px solid rgba(207,255,0,0.2)', borderRadius: 99, padding: '3px 10px', fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {t}<button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
              placeholder="Type tag and press Enter..." style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <input type="checkbox" id="public" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} style={{ accentColor: '#CFFF00', cursor: 'none' }} />
            <label htmlFor="public" style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#555' }}>Visible to all members</label>
          </div>
          <button type="submit" style={{ background: '#CFFF00', border: 'none', borderRadius: 8, color: '#000', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 13, padding: '11px 24px', cursor: 'none' }}>
            Add to Vault
          </button>
        </form>
      )}

      {/* Resource list */}
      {loading ? (
        <div style={{ color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>Loading...</div>
      ) : resources.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>No resources yet</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
          {resources.map(r => (
            <div key={r.id} style={{ background: '#0d0d0d', border: '1px solid #161616', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#555', background: '#111', border: '1px solid #1a1a1a', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>{r.category}</span>
                <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#2a2a2a' }}>{r.view_count} views</span>
              </div>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 6 }}>{r.title}</div>
              <p style={{ color: '#484848', fontSize: 12, lineHeight: 1.6, margin: '0 0 10px' }}>{r.description}</p>
              {r.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {r.tags.map(t => <span key={t} style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#333', border: '1px solid #1a1a1a', padding: '2px 7px', borderRadius: 99 }}>{t}</span>)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, textAlign: 'center', padding: '7px', background: 'transparent', border: '1px solid rgba(207,255,0,0.2)', borderRadius: 7, color: '#CFFF00', fontFamily: 'var(--font-jetbrains)', fontSize: 10, textDecoration: 'none', cursor: 'none' }}>
                  Open ↗
                </a>
                <button onClick={() => deleteResource(r.id)}
                  style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(255,64,64,0.2)', borderRadius: 7, color: '#ff4040', fontFamily: 'var(--font-jetbrains)', fontSize: 10, cursor: 'none' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{children}</label>
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8,
  color: '#e0e0e0', fontFamily: 'var(--font-dm-sans)', fontSize: 13,
  padding: '10px 12px', outline: 'none', boxSizing: 'border-box',
}
