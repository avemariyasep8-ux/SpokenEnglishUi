import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import {
  getLessons, getUserProgress, getStreak, getMySubscription,
  getPackages, getPackageProgress, levelToPackageLevel,
} from '../services/api'

const LANGUAGE_ID = 1
const CAT_ICON = { Grammar: '📝', Vocabulary: '📖', Conversation: '💬' }
const CAT_COLOR = { Grammar: '#818cf8', Vocabulary: '#34d399', Conversation: '#fb923c' }

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [lessons, setLessons]   = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading]   = useState(true)
  const [streak, setStreak]     = useState(null)
  const [mySub, setMySub]       = useState(null)
  const [myPackage, setMyPackage]   = useState(null)
  const [pkgProgress, setPkgProgress] = useState(null)

  useEffect(() => {
    Promise.all([
      getLessons(LANGUAGE_ID),
      user?.userId ? getUserProgress(user.userId, LANGUAGE_ID) : Promise.resolve({ data: [] }),
      user?.userId ? getStreak(user.userId).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      user?.userId ? getMySubscription(user.userId).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      getPackages().catch(() => ({ data: [] })),
    ]).then(([lRes, pRes, stkRes, subRes, pkgRes]) => {
      setLessons(lRes.data || [])
      setProgress(pRes.data || [])
      setStreak(stkRes.data)
      if (subRes.data?.status && subRes.data.status !== 'none') setMySub(subRes.data)

      // Find the package matching the user's level and load its progress.
      const wantLevel = levelToPackageLevel(user?.level)
      const pkg = (pkgRes.data || []).find(p => p.level === wantLevel)
      if (pkg) {
        setMyPackage(pkg)
        if (user?.userId) {
          getPackageProgress(pkg.package_id, user.userId)
            .then(r => setPkgProgress(r.data)).catch(() => {})
        }
      }
    }).finally(() => setLoading(false))
  }, [user])

  const totalLessons    = lessons.length
  const totalAttempts   = progress.reduce((a, p) => a + Number(p.totalAttempt), 0)
  const totalCorrect    = progress.reduce((a, p) => a + Number(p.correctCount), 0)
  const overallAccuracy = totalAttempts ? Math.round(totalCorrect / totalAttempts * 100) : 0
  const completedIds    = new Set(progress.filter(p => p.totalAttempt > 0).map(p => p.lessonID || p.lessonId))

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Navbar */}
        <nav className="navbar">
          <span className="navbar-logo">✦ Spoken English</span>
          <div className="navbar-links">
            <Link to="/dashboard"    className="nav-link active">Dashboard</Link>
            <Link to="/lessons"      className="nav-link">Lessons</Link>
            <Link to="/progress"     className="nav-link">Progress</Link>
            <Link to="/subscription" className="nav-link">👑 Plans</Link>
            {user?.role === 'Admin' && (
              <Link to="/admin" className="nav-link" style={{ color: '#38bdf8', fontWeight: 700 }}>⚙ Admin Panel</Link>
            )}
            {streak?.currentStreak > 0 && (
              <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.9rem' }}>🔥{streak.currentStreak}</span>
            )}
            <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
          </div>
        </nav>

        <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="welcome-text">Welcome back 👋</p>
            <h1 className="heading-md" style={{ marginBottom: 16 }}>
              {user?.email?.split('@')[0] || 'Learner'} — let&apos;s keep going!
            </h1>
            {/* Streak + XP row */}
            {streak && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '8px 16px' }}>
                  <span style={{ fontSize: '1.4rem' }}>🔥</span>
                  <div>
                    <div style={{ color: '#f59e0b', fontWeight: 900, fontSize: '1.1rem' }}>{streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}</div>
                    <div style={{ color: '#666', fontSize: '0.73rem' }}>Current streak</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 12, padding: '8px 16px' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚡</span>
                  <div>
                    <div style={{ color: '#facc15', fontWeight: 900, fontSize: '1.1rem' }}>{streak.totalXp} XP</div>
                    <div style={{ color: '#666', fontSize: '0.73rem' }}>Total earned</div>
                  </div>
                </div>
                {streak.longestStreak > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12, padding: '8px 16px' }}>
                    <span style={{ fontSize: '1.4rem' }}>🏆</span>
                    <div>
                      <div style={{ color: '#c4b5fd', fontWeight: 900, fontSize: '1.1rem' }}>{streak.longestStreak} days</div>
                      <div style={{ color: '#666', fontSize: '0.73rem' }}>Best streak</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Subscription banner */}
            {!mySub ? (
              <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 14, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{ color: '#c4b5fd', fontWeight: 700 }}>👑 Go Premium</span>
                  <span style={{ color: '#555', fontSize: '0.85rem', marginLeft: 10 }}>Unlock all features from ₹199/month</span>
                </div>
                <Link to="/subscription" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', padding: '8px 18px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>View Plans →</Link>
              </div>
            ) : (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: '10px 18px', marginBottom: 24, color: '#6ee7b7', fontSize: '0.85rem', fontWeight: 600 }}>
                ✅ {mySub.planName} — {mySub.daysRemaining} days remaining
              </div>
            )}
          </motion.div>

          {/* Learning Package progress */}
          {myPackage && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.25)', borderRadius: 16, padding: '20px 24px', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <div>
                  <div style={{ color: '#c4b5fd', fontWeight: 800, fontSize: '1.05rem' }}>📦 {myPackage.name}</div>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>{myPackage.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#818cf8', fontWeight: 900, fontSize: '1.6rem', lineHeight: 1 }}>{pkgProgress?.percent ?? 0}%</div>
                  <div style={{ color: '#666', fontSize: '0.72rem' }}>{pkgProgress?.completed ?? 0}/{pkgProgress?.total ?? myPackage.lesson_count} lessons</div>
                </div>
              </div>
              {/* Overall bar */}
              <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${pkgProgress?.percent ?? 0}%` }} transition={{ duration: 0.8 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg,#818cf8,#38bdf8)', borderRadius: 99 }} />
              </div>
              {/* Per-category bars */}
              {pkgProgress?.byCategory?.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
                  {pkgProgress.byCategory.map(c => {
                    const total = Number(c.total), done = Number(c.completed)
                    const pct = total > 0 ? Math.round(done / total * 100) : 0
                    const color = CAT_COLOR[c.category] || '#818cf8'
                    return (
                      <div key={c.category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                          <span style={{ color, fontWeight: 700 }}>{CAT_ICON[c.category] || '📚'} {c.category}</span>
                          <span style={{ color: '#888' }}>{done}/{total} · {pct}%</span>
                        </div>
                        <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: 40 }}>
            {[
              { label: 'Total Lessons',   value: totalLessons,    icon: '📚', color: 'var(--violet-glow)' },
              { label: 'Total Attempts',  value: totalAttempts,   icon: '🎯', color: 'var(--cyan)'        },
              { label: 'Correct Answers', value: totalCorrect,    icon: '✅', color: 'var(--green)'       },
              { label: 'Accuracy',        value: `${overallAccuracy}%`, icon: '📊', color: 'var(--gold)' },
            ].map((s, i) => (
              <motion.div key={s.label} className="stat-card"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}>
                <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Recent Lessons */}
          <div>
            <h2 className="section-title" style={{ marginBottom: 20 }}>📋 Your Lessons</h2>
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : lessons.length === 0 ? (
              <div className="alert alert-info">No lessons available yet.</div>
            ) : (
              <div className="lesson-grid">
                {lessons.slice(0, 6).map((l, i) => (
                  <motion.div key={l.lessonID || l.lessonId}
                    className={`lesson-card${completedIds.has(l.lessonID || l.lessonId) ? ' lesson-card-completed' : ''}`}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}>
                    <div className="flex gap-4 items-center">
                      <div className="lesson-card-order">#{l.lessonOrder}</div>
                      <span className="badge badge-violet">{l.typeName || 'General'}</span>
                    </div>
                    <div className="lesson-card-title">
                      {l.lessonName}
                      {completedIds.has(l.lessonID || l.lessonId) && (
                        <span style={{ marginLeft: 8, fontSize: '1.2rem' }} title="Attempted">✅</span>
                      )}
                    </div>
                    {l.description && <div className="lesson-card-desc">{l.description}</div>}
                    <div className="lesson-card-actions">
                      <Link to={`/lesson/${l.lessonID || l.lessonId}/play`} className="btn btn-primary w-full justify-center" style={{ width: '100%', textAlign: 'center' }}>
                        ▶ Start Lesson
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {lessons.length > 6 && (
              <div className="text-center mt-6">
                <Link to="/lessons" className="btn btn-secondary">View All Lessons →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
