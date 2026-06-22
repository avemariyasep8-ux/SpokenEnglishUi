import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getLessonSummary, resetLessonProgress } from '../services/api'
import { useAuth } from '../context/AuthContext'

function fmtTime(secs) {
  if (!secs) return '—'
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Progress() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const justCompleted = location.state?.justCompleted

  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('completed')
  const [resetting, setResetting] = useState(null)
  const [flashMsg, setFlashMsg] = useState('')

  const load = () => {
    if (!user?.userId) return
    getLessonSummary(user.userId)
      .then(r => setLessons(r.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [user])

  const showFlash = (msg) => {
    setFlashMsg(msg)
    setTimeout(() => setFlashMsg(''), 3000)
  }

  const handleReset = async (lesson) => {
    if (!window.confirm(`Reset all progress for "${lesson.lessonname}"?\nYou can practice it again from scratch.`)) return
    setResetting(lesson.lessonid)
    try {
      await resetLessonProgress(user.userId, lesson.lessonid)
      showFlash(`Progress reset for "${lesson.lessonname}"`)
      load()
    } catch {
      showFlash('Failed to reset progress')
    } finally {
      setResetting(null)
    }
  }

  const completed  = lessons.filter(l => l.is_completed)
  const inProgress = lessons.filter(l => !l.is_completed && Number(l.total_attempts) > 0)
  const notStarted = lessons.filter(l => !l.is_completed && Number(l.total_attempts) === 0)

  const totalTime    = completed.reduce((s, l) => s + (Number(l.time_spent_seconds) || 0), 0)
  const totalCorrect = completed.reduce((s, l) => s + (Number(l.correct_answers) || 0), 0)
  const totalAttempts= completed.reduce((s, l) => s + (Number(l.total_attempts) || 0), 0)
  const overallAcc   = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  const displayed = tab === 'completed' ? completed : tab === 'inprogress' ? inProgress : notStarted

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <nav className="navbar">
          <Link to="/dashboard" className="navbar-logo">✦ Spoken English</Link>
          <div className="navbar-links">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/lessons"   className="nav-link">Lessons</Link>
            <Link to="/progress"  className="nav-link active">Progress</Link>
            {user?.role === 'Admin' && (
              <Link to="/admin" className="nav-link" style={{ color: '#38bdf8', fontWeight: 700 }}>⚙ Admin Panel</Link>
            )}
            <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
          </div>
        </nav>

        <div className="progress-container">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="heading-md" style={{ marginBottom: 4 }}>📊 My Progress</h1>
            <p className="text-muted" style={{ marginBottom: 24 }}>Track your completed lessons and practice again anytime</p>

            {justCompleted && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'linear-gradient(135deg,#166534,#15803d)', borderRadius: 12,
                  padding: '16px 24px', marginBottom: 24, border: '1px solid #22c55e',
                  color: '#bbf7d0', fontSize: 15, fontWeight: 600
                }}>
                🎉 Lesson completed! Great work — your progress has been saved.
              </motion.div>
            )}
          </motion.div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <>
              {/* Stats row */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
                {[
                  { label: 'Lessons Done',  value: completed.length, icon: '✅' },
                  { label: 'Total Time',    value: fmtTime(totalTime), icon: '⏱' },
                  { label: 'Accuracy',      value: `${overallAcc}%`, icon: '🎯' },
                  { label: 'In Progress',   value: inProgress.length, icon: '📖' },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: '1 1 140px', background: 'var(--card)', borderRadius: 12,
                    padding: '16px 20px', border: '1px solid var(--border)', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 28 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', margin: '4px 0' }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { id: 'completed',  label: `✅ Completed (${completed.length})` },
                  { id: 'inprogress', label: `📖 In Progress (${inProgress.length})` },
                  { id: 'notstarted', label: `🔒 Not Started (${notStarted.length})` },
                ].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border)',
                    background: tab === t.id ? 'var(--accent)' : 'var(--card)',
                    color: tab === t.id ? '#000' : 'var(--fg)', cursor: 'pointer',
                    fontSize: 13, fontWeight: tab === t.id ? 700 : 400
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Flash */}
              <AnimatePresence>
                {flashMsg && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      background: 'var(--card)', border: '1px solid var(--accent)',
                      borderRadius: 8, padding: '10px 16px', marginBottom: 16,
                      fontSize: 14, color: 'var(--accent)'
                    }}>{flashMsg}</motion.div>
                )}
              </AnimatePresence>

              {/* Lesson list */}
              {displayed.length === 0 ? (
                <div className="alert alert-info">
                  {tab === 'completed'  ? 'Complete your first lesson to see it here!' :
                   tab === 'inprogress' ? 'No lessons in progress yet.' :
                                         'All lessons have been started!'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {displayed.map((l, i) => {
                    const total   = Number(l.total_attempts)
                    const correct = Number(l.correct_answers)
                    const acc     = total > 0 ? Math.round((correct / total) * 100) : 0
                    const accColor= acc > 80 ? 'var(--green)' : acc > 50 ? 'var(--gold)' : 'var(--red)'
                    const isNew   = l.lessonid === justCompleted
                    return (
                      <motion.div key={l.lessonid}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          background: isNew ? 'linear-gradient(135deg,rgba(34,197,94,.08),var(--card))' : 'var(--card)',
                          border: `1px solid ${isNew ? '#22c55e' : 'var(--border)'}`,
                          borderRadius: 12, padding: '16px 20px',
                          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
                        }}>

                        <div className="lesson-card-order" style={{ minWidth: 36, textAlign: 'center' }}>
                          {l.is_completed ? '✅' : `#${l.lessonorder}`}
                        </div>

                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{l.lessonname}</div>
                          {l.is_completed ? (
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                              <span>⏱ {fmtTime(Number(l.time_spent_seconds))}</span>
                              <span>📅 {fmtDate(l.completed_date)}</span>
                              <span>🎯 {total} attempts</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                              {total > 0 ? `${total} attempts so far` : 'Not started yet'}
                            </div>
                          )}
                        </div>

                        {total > 0 && (
                          <div style={{ width: 120, minWidth: 80 }}>
                            <div className="progress-track w-full" style={{ marginBottom: 4 }}>
                              <div className="progress-fill" style={{ width: `${acc}%`, background: accColor }} />
                            </div>
                            <div style={{ fontSize: 12, color: accColor, fontWeight: 700, textAlign: 'center' }}>{acc}% accuracy</div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          {l.is_completed ? (
                            <>
                              <button onClick={() => navigate(`/lesson/${l.lessonid}`)} style={{
                                padding: '7px 14px', borderRadius: 8, border: 'none',
                                background: 'linear-gradient(135deg,var(--accent),#f59e0b)',
                                color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13
                              }}>🔄 Practice Again</button>
                              <button onClick={() => handleReset(l)} disabled={resetting === l.lessonid} style={{
                                padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
                                background: 'var(--bg)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12
                              }}>{resetting === l.lessonid ? '...' : '↺ Reset'}</button>
                            </>
                          ) : (
                            <button onClick={() => navigate(`/lesson/${l.lessonid}`)} style={{
                              padding: '7px 14px', borderRadius: 8, border: 'none',
                              background: 'var(--accent)', color: '#000',
                              fontWeight: 700, cursor: 'pointer', fontSize: 13
                            }}>{total > 0 ? '▶ Continue' : '▶ Start'}</button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
