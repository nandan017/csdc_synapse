'use client'

import { useEffect, useState, useCallback } from 'react'

interface Workshop { id: string; title: string }
interface Task {
  id: string; title: string; description: string
  task_type: string; xp_reward: number; due_date: string | null
  is_active: boolean; workshop_id: string
  workshops?: { title: string }
}
interface Submission {
  id: string; status: string; submitted_at: string
  submission_url: string | null; notes: string | null
  feedback: string | null; xp_awarded: number | null
  members?: { first_name: string; last_name: string; email: string }
  tasks?: { title: string; xp_reward: number; workshop_id: string; workshops?: { title: string } }
}

const STATUS_COLOR: Record<string, string> = {
  pending:  '#ff9800', approved: '#00e676', rejected: '#ff4040',
}

export default function TasksPage() {
  const [workshops,    setWorkshops]    = useState<Workshop[]>([])
  const [tasks,        setTasks]        = useState<Task[]>([])
  const [submissions,  setSubmissions]  = useState<Submission[]>([])
  const [selectedWS,   setSelectedWS]   = useState<string>('all')
  const [subFilter,    setSubFilter]    = useState<string>('pending')
  const [creating,     setCreating]     = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)
  const [gradingId,    setGradingId]    = useState<string | null>(null)
  const [feedback,     setFeedback]     = useState('')
  const [xpOverride,   setXpOverride]   = useState<string>('')

  const [form, setForm] = useState({
    workshop_id: '', title: '', description: '',
    task_type: 'manual', github_repo: '', xp_reward: 30, due_date: '',
  })

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [wsRes, taskRes, subRes] = await Promise.all([
      fetch('/api/backend/admin/workshops'),
      fetch('/api/backend/tasks/'),
      fetch(`/api/backend/tasks/submissions?status=${subFilter === 'all' ? '' : subFilter}`),
    ])
    const wsData   = await wsRes.json()
    const taskData = await taskRes.json()
    const subData  = await subRes.json()
    setWorkshops(wsData.data || [])
    setTasks(taskData.data || [])
    setSubmissions(subData.data || [])
    setLoading(false)
  }, [subFilter])

  useEffect(() => { fetchAll() }, [fetchAll])

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/backend/tasks/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, xp_reward: Number(form.xp_reward) }),
    })
    if (res.ok) {
      showToast('Task created ✓')
      setCreating(false)
      setForm({ workshop_id: '', title: '', description: '', task_type: 'manual', github_repo: '', xp_reward: 30, due_date: '' })
      fetchAll()
    } else showToast('Failed to create task', false)
  }

  const gradeSubmission = async (id: string, status: 'approved' | 'rejected') => {
    const xp = xpOverride ? Number(xpOverride) : undefined
    const res = await fetch(`/api/backend/tasks/submissions/${id}/grade`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, feedback: feedback || null, xp_awarded: xp }),
    })
    if (res.ok) {
      showToast(status === 'approved' ? 'Submission approved ✓' : 'Submission rejected')
      setGradingId(null); setFeedback(''); setXpOverride('')
      fetchAll()
    } else showToast('Failed to grade', false)
  }

  const filteredTasks = selectedWS === 'all'
    ? tasks : tasks.filter(t => t.workshop_id === selectedWS)

  const filteredSubs = submissions.filter(s =>
    selectedWS === 'all' ? true : s.tasks?.workshop_id === selectedWS
  )

  const pendingCount = submissions.filter(s => s.status === 'pending').length

  return (
    <div style={{ padding: '32px 36px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: toast.ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,64,64,0.08)',
          border: `1px solid ${toast.ok ? 'rgba(0,230,118,0.3)' : 'rgba(255,64,64,0.2)'}`,
          color: toast.ok ? '#00e676' : '#ff6b6b',
          fontFamily: 'var(--font-jetbrains)', fontSize: 12,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>
            // tasks
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, color: '#fff', fontSize: 24, letterSpacing: '-.03em', margin: '0 0 4px' }}>
            Workshop Tasks
          </h1>
          {pendingCount > 0 && (
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#ff9800' }}>
              {pendingCount} submission{pendingCount > 1 ? 's' : ''} awaiting review
            </div>
          )}
        </div>
        <button onClick={() => setCreating(p => !p)}
          style={{ background: '#CFFF00', border: 'none', borderRadius: 9, color: '#000', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 13, padding: '10px 20px', cursor: 'none' }}>
          {creating ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {/* Workshop filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedWS('all')}
          style={tabStyle(selectedWS === 'all')}>All Workshops</button>
        {workshops.map(w => (
          <button key={w.id} onClick={() => setSelectedWS(w.id)}
            style={tabStyle(selectedWS === w.id)}>{w.title}</button>
        ))}
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={createTask}
          style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16 }}>
            New Task
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <Label>Workshop</Label>
              <select value={form.workshop_id} onChange={e => setForm(f => ({ ...f, workshop_id: e.target.value }))}
                required style={{ ...inputStyle, cursor: 'none' }}>
                <option value="">Select workshop</option>
                {workshops.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
            </div>
            <div>
              <Label>Task Type</Label>
              <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}
                style={{ ...inputStyle, cursor: 'none' }}>
                <option value="manual">Manual review</option>
                <option value="github">GitHub submission</option>
              </select>
            </div>
            <div>
              <Label>Title</Label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required placeholder="Task title" style={inputStyle} />
            </div>
            <div>
              <Label>XP Reward</Label>
              <input type="number" value={form.xp_reward}
                onChange={e => setForm(f => ({ ...f, xp_reward: +e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <Label>Due Date (optional)</Label>
              <input type="datetime-local" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                style={inputStyle} />
            </div>
            {form.task_type === 'github' && (
              <div>
                <Label>GitHub Repo (optional)</Label>
                <input value={form.github_repo}
                  onChange={e => setForm(f => ({ ...f, github_repo: e.target.value }))}
                  placeholder="github.com/org/repo" style={inputStyle} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <Label>Description</Label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required rows={3} placeholder="What should members do?"
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <button type="submit"
            style={{ background: '#CFFF00', border: 'none', borderRadius: 8, color: '#000', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 13, padding: '11px 24px', cursor: 'none' }}>
            Create Task
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Tasks list ── */}
        <div>
          <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            Tasks ({filteredTasks.length})
          </div>
          {loading ? (
            <div style={{ color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>Loading...</div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>No tasks yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTasks.map(t => (
                <div key={t.id} style={{
                  background: '#0d0d0d', border: '1px solid #161616',
                  borderRadius: 12, padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: '#fff', fontSize: 13 }}>{t.title}</div>
                      <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#383838', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        {t.workshops?.title} · {t.task_type}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', background: 'rgba(207,255,0,0.06)', padding: '3px 8px', borderRadius: 7, flexShrink: 0 }}>
                      +{t.xp_reward} XP
                    </span>
                  </div>
                  <p style={{ color: '#444', fontSize: 12, lineHeight: 1.65, margin: '0 0 8px', fontFamily: 'var(--font-dm-sans)' }}>{t.description}</p>
                  {t.due_date && (
                    <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#2a2a2a' }}>
                      Due: {new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Submissions ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              Submissions
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {['pending', 'approved', 'rejected', 'all'].map(s => (
                <button key={s} onClick={() => setSubFilter(s)}
                  style={{
                    background: subFilter === s ? 'rgba(207,255,0,0.08)' : 'transparent',
                    border: `1px solid ${subFilter === s ? 'rgba(207,255,0,0.2)' : '#1e1e1e'}`,
                    borderRadius: 6, color: subFilter === s ? '#CFFF00' : '#383838',
                    fontFamily: 'var(--font-jetbrains)', fontSize: 10,
                    padding: '4px 10px', cursor: 'none', textTransform: 'capitalize',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {filteredSubs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#2a2a2a', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>
              No {subFilter !== 'all' ? subFilter : ''} submissions
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredSubs.map(s => (
                <div key={s.id} style={{
                  background: '#0d0d0d', border: '1px solid #161616',
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, color: '#e0e0e0', fontSize: 13 }}>
                        {s.members?.first_name} {s.members?.last_name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#383838', marginTop: 2 }}>
                        {s.tasks?.title}
                      </div>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-jetbrains)', fontSize: 9, letterSpacing: '.06em',
                      padding: '3px 8px', borderRadius: 99, flexShrink: 0,
                      color: STATUS_COLOR[s.status] ?? '#555',
                      background: `${STATUS_COLOR[s.status] ?? '#555'}18`,
                    }}>
                      {s.status}
                    </span>
                  </div>

                  {s.submission_url && (
                    <a href={s.submission_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#CFFF00', textDecoration: 'none', display: 'block', marginBottom: 6 }}>
                      View submission ↗
                    </a>
                  )}

                  {s.notes && (
                    <p style={{ color: '#555', fontSize: 12, margin: '0 0 8px', lineHeight: 1.6 }}>{s.notes}</p>
                  )}

                  {s.feedback && (
                    <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', marginBottom: 8, fontStyle: 'italic' }}>
                      Feedback: {s.feedback}
                    </div>
                  )}

                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 9, color: '#2a2a2a', marginBottom: s.status === 'pending' ? 10 : 0 }}>
                    Submitted {new Date(s.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {s.xp_awarded ? ` · +${s.xp_awarded} XP awarded` : ''}
                  </div>

                  {/* Grade controls */}
                  {s.status === 'pending' && (
                    <>
                      {gradingId === s.id ? (
                        <div style={{ marginTop: 8 }}>
                          <input value={feedback} onChange={e => setFeedback(e.target.value)}
                            placeholder="Feedback (optional)"
                            style={{ ...inputStyle, marginBottom: 8, fontSize: 11 }} />
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input value={xpOverride} onChange={e => setXpOverride(e.target.value)}
                              placeholder={`XP (default: ${s.tasks?.xp_reward ?? 30})`}
                              style={{ ...inputStyle, width: 160, fontSize: 11 }} />
                            <button onClick={() => gradeSubmission(s.id, 'approved')}
                              style={{ flex: 1, padding: '7px', background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)', borderRadius: 7, color: '#00e676', fontFamily: 'var(--font-jetbrains)', fontSize: 11, cursor: 'none' }}>
                              Approve ✓
                            </button>
                            <button onClick={() => gradeSubmission(s.id, 'rejected')}
                              style={{ flex: 1, padding: '7px', background: 'rgba(255,64,64,0.06)', border: '1px solid rgba(255,64,64,0.2)', borderRadius: 7, color: '#ff6b6b', fontFamily: 'var(--font-jetbrains)', fontSize: 11, cursor: 'none' }}>
                              Reject ✕
                            </button>
                            <button onClick={() => { setGradingId(null); setFeedback(''); setXpOverride('') }}
                              style={{ padding: '7px 10px', background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 7, color: '#333', fontFamily: 'var(--font-jetbrains)', fontSize: 11, cursor: 'none' }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setGradingId(s.id)}
                          style={{ marginTop: 6, background: 'transparent', border: '1px solid #1e1e1e', borderRadius: 7, color: '#555', fontFamily: 'var(--font-jetbrains)', fontSize: 11, padding: '6px 14px', cursor: 'none', transition: 'all .2s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(207,255,0,0.2)'; e.currentTarget.style.color = '#CFFF00' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#555' }}>
                          Review →
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 10, color: '#444', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
      {children}
    </label>
  )
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(207,255,0,0.08)' : 'transparent',
  border: `1px solid ${active ? 'rgba(207,255,0,0.25)' : '#1e1e1e'}`,
  borderRadius: 7, color: active ? '#CFFF00' : '#444',
  fontFamily: 'var(--font-jetbrains)', fontSize: 11,
  padding: '6px 14px', cursor: 'none', transition: 'all .2s',
})

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #1e1e1e',
  borderRadius: 8, color: '#e0e0e0', fontFamily: 'var(--font-dm-sans)',
  fontSize: 13, padding: '10px 12px', outline: 'none', boxSizing: 'border-box',
}
