import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getLessonSummary, resetLessonProgress, getStreak } from '../services/api'
import { useAuth } from '../context/AuthContext'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

function fmtTime(secs) {
  if (!secs) return '—'
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60); const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Simple inline bar chart for weekly activity
function WeeklyChart({ data }) {
  if (!data || data.length === 0) return null
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const max = Math.max(...data.map(d => d.xp_earned || 0), 1)
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80, marginBottom: 6 }}>
        {data.map((d, i) => {
          const h = Math.max(4, ((d.xp_earned || 0) / max) * 72)
          const dt = new Date(d.activity_date)
          const dayName = days[dt.getDay()]
          const isToday = d.activity_date === new Date().toISOString().split('T')[0]
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {d.xp_earned > 0 && (
                <div style={{ fontSize: '0.6rem', color: '#38bdf8', fontWeight: 700 }}>+{d.xp_earned}</div>
              )}
              <div style={{ width: '100%', height: h, borderRadius: 6, minHeight: 4,
                background: d.xp_earned > 0 ? 'linear-gradient(180deg,#38bdf8,#818cf8)' : 'rgba(255,255,255,0.06)',
                border: isToday ? '1px solid #38bdf8' : 'none', transition: 'all 0.3s' }} />
              <div style={{ fontSize: '0.65rem', color: isToday ? '#38bdf8' : '#64748b', fontWeight: isToday ? 700 : 400 }}>{dayName}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Progress() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const justCompleted = location.state?.justCompleted

  const [lessons, setLessons] = useState([])
  const [streak, setStreak] = useState(null)
  const [weeklyData, setWeeklyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('completed')
  const [resetting, setResetting] = useState(null)
  const [flashMsg, setFlashMsg] = useState('')

  const load = () => {
    if (!user?.userId) return
    Promise.all([
      getLessonSummary(user.userId).then(r => setLessons(r.data || [])),
      getStreak(user.userId).then(r => setStreak(r.data)).catch(() => {}),
      fetch(`${BASE}/school/weekly-activity/${user.userId}`, { headers: authHeaders() })
        .then(r => r.json()).then(d => setWeeklyData(Array.isArray(d) ? d : [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }

  useEffect(load, [user])

  const showFlash = (msg) => { setFlashMsg(msg); setTimeout(() => setFlashMsg(''), 3000) }

  const handleReset = async (lesson) => {
    if (!window.confirm(`Reset all progress for "${lesson.lessonname}"?`)) return
    setResetting(lesson.lessonid)
    try {
      await resetLessonProgress(user.userId, lesson.lessonid)
      showFlash(`Progress reset for "${lesson.lessonname}"`)
      load()
    } catch { showFlash('Failed to reset progress') }
    finally { setResetting(null) }
  }

  const completed  = lessons.filter(l => l.is_completed)
  const inProgress = lessons.filter(l => !l.is_completed && Number(l.total_attempts) > 0)
  const notStarted = lessons.filter(l => !l.is_completed && Number(l.total_attempts) === 0)

  const totalTime     = completed.reduce((s, l) => s + (Number(l.time_spent_seconds) || 0), 0)
  const totalCorrect  = completed.reduce((s, l) => s + (Number(l.correct_answers) || 0), 0)
  const totalAttempts = completed.reduce((s, l) => s + (Number(l.total_attempts) || 0), 0)
  const overallAcc    = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0
  const totalErrors   = completed.reduce((s, l) => s + (Number(l.wrong_answers) || 0), 0)
  const weeklyXP      = weeklyData.reduce((s, d) => s + (d.xp_earned || 0), 0)

  const displayed = tab === 'completed' ? completed : tab === 'inprogress' ? inProgress : notStarted

  const T = { bg: '#080c14', card: 'rgba(12,20,36,0.97)', accent: '#38bdf8', accent2: '#818cf8', accent3: '#34d399', gold: '#fbbf24', danger: '#f87171', text: '#e2e8f0', muted: '#64748b' }
  const glass = (a = T.accent) => ({ background: T.card, border: `1px solid ${a}22`, borderRadius: 14, backdropFilter: 'blur(12px)' })

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(ellipse,rgba(56,189,248,0.06) 0%,transparent 70%)', borderRadius: '50%' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <nav style={{ background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,179,237,0.1)', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Link to="/dashboard" style={{ color: T.accent, textDecoration: 'none', fontWeight: 900, fontSize: '1.1rem' }}>✦ Spoken English</Link>
          <div style={{ flex: 1 }} />
          <Link to="/dashboard" style={{ color: T.muted, textDecoration: 'none', fontSize: '0.88rem' }}>Dashboard</Link>
          <Link to="/lessons"   style={{ color: T.muted, textDecoration: 'none', fontSize: '0.88rem' }}>Lessons</Link>
          <Link to="/progress"  style={{ color: T.accent, textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>Progress</Link>
          {user?.role === 'Admin' && <Link to="/admin" style={{ color: T.danger, textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>⚙ Admin</Link>}
          <button onClick={logout} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: T.muted, cursor: 'pointer', fontSize: '0.85rem' }}>Logout</button>
        </nav>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, marginBottom: 4 }}>📊 My Progress</h1>
            <p style={{ color: T.muted, marginBottom: 24, fontSize: '0.9rem' }}>Track your learning journey</p>

            {justCompleted && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                style={{ ...glass(T.accent3), padding: '14px 22px', marginBottom: 22, color: T.accent3, fontSize: '0.9rem', fontWeight: 600 }}>
                🎉 Lesson completed! Great work — your progress has been saved.
              </motion.div>
            )}
          </motion.div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading…</div>
          ) : (
            <>
              {/* Top stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Lessons Done',     value: completed.length, icon: '✅', color: T.accent3 },
                  { label: 'Total Time',        value: fmtTime(totalTime), icon: '⏱', color: T.accent },
                  { label: 'Accuracy',          value: `${overallAcc}%`, icon: '🎯', color: T.accent2 },
                  { label: 'Mistakes Made',     value: totalErrors, icon: '❌', color: T.danger },
                  { label: 'Current Streak',    value: `${streak?.current_streak || 0}d`, icon: '🔥', color: T.gold },
                  { label: 'Total XP',          value: streak?.total_xp || 0, icon: '⚡', color: T.gold },
                  { label: 'Weekly XP',         value: weeklyXP, icon: '📈', color: T.accent3 },
                  { label: 'In Progress',       value: inProgress.length, icon: '📖', color: T.muted },
                ].map(s => (
                  <motion.div key={s.label} whileHover={{ y: -2 }}
                    style={{ ...glass(s.color), padding: '16px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: 2 }}>{s.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Streak + Weekly activity row */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                {/* Streak card */}
                {streak && (
                  <div style={{ ...glass(T.gold), padding: '20px 24px', flex: '0 0 220px', minWidth: 180 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: T.gold, letterSpacing: 2, marginBottom: 10 }}>STREAK</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: '3.5rem', fontWeight: 900, color: T.gold, lineHeight: 1 }}>🔥{streak.current_streak}</span>
                      <span style={{ color: T.muted, fontSize: '0.85rem' }}>days</span>
                    </div>
                    <div style={{ marginTop: 12, color: T.muted, fontSize: '0.78rem' }}>
                      <div>Longest: <span style={{ color: T.gold, fontWeight: 700 }}>{streak.longest_streak} days</span></div>
                      <div style={{ marginTop: 4 }}>Total XP: <span style={{ color: T.gold, fontWeight: 700 }}>⚡{streak.total_xp}</span></div>
                      {streak.last_activity_date && (
                        <div style={{ marginTop: 4 }}>Last: <span style={{ color: T.text }}>{fmtDate(streak.last_activity_date)}</span></div>
                      )}
                    </div>
                    {/* Progress bar to next milestone */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: '0.65rem', color: T.muted, marginBottom: 4 }}>Next milestone: {Math.ceil((streak.current_streak + 1) / 7) * 7} days</div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${((streak.current_streak % 7) / 7) * 100}%`, background: T.gold, borderRadius: 99, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Weekly activity chart */}
                {weeklyData.length > 0 && (
                  <div style={{ ...glass(T.accent), padding: '20px 24px', flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: T.accent, letterSpacing: 2 }}>THIS WEEK</div>
                      <div style={{ fontSize: '0.75rem', color: T.gold, fontWeight: 700 }}>⚡{weeklyXP} XP total</div>
                    </div>
                    <WeeklyChart data={weeklyData} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: '0.72rem', color: T.muted }}>
                        {weeklyData.filter(d => d.xp_earned > 0).length} active days
                      </span>
                      <span style={{ fontSize: '0.72rem', color: T.accent }}>
                        {weeklyData.reduce((s, d) => s + (d.lessons_completed || 0), 0)} lessons
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Overall completion */}
              <div style={{ ...glass(T.accent2), padding: '16px 22px', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: T.accent2 }}>OVERALL COMPLETION</span>
                  <span style={{ fontSize: '0.85rem', color: T.accent2, fontWeight: 800 }}>
                    {lessons.length > 0 ? Math.round((completed.length / lessons.length) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${lessons.length > 0 ? (completed.length / lessons.length) * 100 : 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg,#818cf8,#38bdf8)', borderRadius: 99 }} />
                </div>
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: T.muted }}>
                  {completed.length} of {lessons.length} lessons completed
                </div>
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { id: 'completed',  label: `✅ Completed (${completed.length})` },
                  { id: 'inprogress', label: `📖 In Progress (${inProgress.length})` },
                  { id: 'notstarted', label: `🔒 Not Started (${notStarted.length})` },
                ].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: tab === t.id ? 700 : 400,
                      background: tab === t.id ? T.accent : 'rgba(255,255,255,0.04)', color: tab === t.id ? '#000' : T.muted }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {flashMsg && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ ...glass(T.accent), padding: '10px 16px', marginBottom: 16, fontSize: '0.85rem', color: T.accent }}>
                    {flashMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Lesson list */}
              {displayed.length === 0 ? (
                <div style={{ ...glass(T.muted), padding: '28px', textAlign: 'center', color: T.muted, fontSize: '0.9rem' }}>
                  {tab === 'completed' ? 'Complete your first lesson to see it here!' :
                   tab === 'inprogress' ? 'No lessons in progress yet.' : 'All lessons have been started!'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {displayed.map((l, i) => {
                    const total   = Number(l.total_attempts)
                    const correct = Number(l.correct_answers)
                    const wrong   = Number(l.wrong_answers)
                    const acc     = total > 0 ? Math.round((correct / total) * 100) : 0
                    const accColor = acc > 80 ? T.accent3 : acc > 50 ? T.gold : T.danger
                    const isNew   = l.lessonid === justCompleted
                    return (
                      <motion.div key={l.lessonid}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{ ...glass(isNew ? T.accent3 : T.muted), padding: '16px 20px',
                          border: `1px solid ${isNew ? T.accent3 : 'rgba(255,255,255,0.06)'}`,
                          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: l.is_completed ? 'linear-gradient(135deg,#34d399,#059669)' : 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, flexShrink: 0 }}>
                          {l.is_completed ? '✅' : `#${l.lessonorder}`}
                        </div>

                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{l.lessonname}</div>
                          {l.is_completed ? (
                            <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                              <span>⏱ {fmtTime(Number(l.time_spent_seconds))}</span>
                              <span>📅 {fmtDate(l.completed_date)}</span>
                              <span>✅ {correct} correct</span>
                              <span>❌ {wrong} errors</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: 4 }}>
                              {total > 0 ? `${total} attempts so far` : 'Not started yet'}
                            </div>
                          )}
                        </div>

                        {total > 0 && (
                          <div style={{ width: 100, minWidth: 80 }}>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                              <div style={{ height: '100%', width: `${acc}%`, background: accColor, borderRadius: 99, transition: 'width 0.5s' }} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: accColor, fontWeight: 700, textAlign: 'center' }}>{acc}% accuracy</div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          {l.is_completed ? (
                            <>
                              <button onClick={() => navigate(`/lesson/${l.lessonid}/play`)}
                                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                                🔄 Practice
                              </button>
                              <button onClick={() => handleReset(l)} disabled={resetting === l.lessonid}
                                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: T.muted, cursor: 'pointer', fontSize: '0.75rem' }}>
                                {resetting === l.lessonid ? '…' : '↺'}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => navigate(`/lesson/${l.lessonid}/play`)}
                              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: T.accent, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                              {total > 0 ? '▶ Continue' : '▶ Start'}
                            </button>
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
