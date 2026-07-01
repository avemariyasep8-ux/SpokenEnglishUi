import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getLessons, getMySubscription, getLessonSummary } from '../services/api'
import { useAuth } from '../context/AuthContext'

const LANGUAGE_ID = 1

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)',
  accent: '#38bdf8', gold: '#fbbf24', success: '#34d399',
  danger: '#f87171', text: '#e2e8f0', muted: '#64748b',
  border: 'rgba(99,179,237,0.12)',
}

const glass = (a = T.accent) => ({
  background: T.card, border: `1px solid ${a}22`,
  borderRadius: 18, backdropFilter: 'blur(12px)',
})

const LEVELS = ['All', 'Beginner', 'Elementary', 'Intermediate', 'College', 'Professional']
const LEVEL_COLORS = {
  Beginner: '#34d399', Elementary: '#38bdf8', Intermediate: '#818cf8',
  College: '#fbbf24', Professional: '#fb923c',
}
const LEVEL_ICONS = {
  All: '📚', Beginner: '🌱', Elementary: '📗', Intermediate: '📘',
  College: '🎓', Professional: '💼',
}

export default function Lessons() {
  const { user, logout } = useAuth()
  const [lessons,    setLessons]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [hasPremium, setHasPremium] = useState(false)
  const [completedIds, setCompletedIds] = useState(() => new Set())
  const [activeLevel, setActiveLevel] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u?.level) return u.level
      }
    } catch {}
    return 'All'
  })

  useEffect(() => {
    Promise.all([
      getLessons(LANGUAGE_ID).then(r => setLessons(r.data ?? [])),
      user?.id
        ? getMySubscription(user.id).then(r => {
            const s = r.data
            setHasPremium(s?.status === 'active' || user?.role === 'Admin' || user?.role === 'Premium')
          }).catch(() => {})
        : Promise.resolve(),
      // Mark completed lessons so their cards are disabled in the list
      user?.userId
        ? getLessonSummary(user.userId).then(r => {
            const ids = new Set((r.data || []).filter(l => l.is_completed).map(l => Number(l.lessonid)))
            setCompletedIds(ids)
          }).catch(() => {})
        : Promise.resolve(),
    ]).finally(() => setLoading(false))
  }, [user])

  const filtered = lessons.filter(l => {
    const matchSearch = l.lessonName.toLowerCase().includes(search.toLowerCase())
    const matchLevel = activeLevel === 'All' || (l.level || 'Beginner') === activeLevel
    return matchSearch && matchLevel
  })

  const canAccess = (lesson) => !lesson.isPremium || hasPremium || user?.role === 'Admin'

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Aura bg */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw',
          background: 'radial-gradient(ellipse,rgba(56,189,248,0.06) 0%,transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '45vw', height: '45vw',
          background: 'radial-gradient(ellipse,rgba(129,140,248,0.06) 0%,transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <nav style={{ background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(99,179,237,0.1)', padding: '12px 28px',
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 900, color: T.accent, fontSize: '1.1rem', letterSpacing: -0.5 }}>✦ Spoken English</span>
          <div style={{ flex: 1 }} />
          <Link to="/dashboard"    style={{ color: T.muted, textDecoration: 'none', fontSize: '0.88rem' }}>Dashboard</Link>
          <Link to="/lessons"      style={{ color: T.accent, textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>Lessons</Link>
          <Link to="/progress"     style={{ color: T.muted, textDecoration: 'none', fontSize: '0.88rem' }}>Progress</Link>
          <Link to="/subscription" style={{ color: T.gold,  textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>👑 Plans</Link>
          {user?.role === 'Admin' && (
            <Link to="/admin" style={{ color: T.danger, textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>⚙ Admin</Link>
          )}
          <button onClick={logout}
            style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: T.muted, cursor: 'pointer', fontSize: '0.85rem' }}>
            Logout
          </button>
        </nav>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 20px 80px' }}>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, marginBottom: 6 }}>📚 All Lessons</h1>
            <p style={{ color: T.muted, marginBottom: 28, fontSize: '0.9rem' }}>
              Choose a lesson and start practicing
              {!hasPremium && <span style={{ marginLeft: 8, color: T.gold }}>· 🔒 Lessons 4+ require Premium</span>}
            </p>
            <input placeholder="🔍 Search lessons…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', maxWidth: 400, padding: '11px 18px', borderRadius: 12,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: T.text, fontSize: '0.9rem', outline: 'none', marginBottom: 18 }} />

            {/* Level filter tabs */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
              {LEVELS.map(lvl => {
                const count = lvl === 'All' ? lessons.length : lessons.filter(l => (l.level || 'Beginner') === lvl).length
                const color = LEVEL_COLORS[lvl] || T.accent
                const active = activeLevel === lvl
                return (
                  <button key={lvl} onClick={() => setActiveLevel(lvl)}
                    style={{ padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: '0.82rem', fontWeight: active ? 800 : 400, transition: 'all 0.15s',
                      background: active ? color : 'rgba(255,255,255,0.05)', color: active ? '#000' : T.muted,
                      border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.08)'}` }}>
                    {LEVEL_ICONS[lvl]} {lvl} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18 }}>
              {filtered.map((l, i) => {
                const accessible = canAccess(l)
                const isCompleted = completedIds.has(Number(l.lessonID))
                return (
                  <motion.div key={l.lessonID} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ ...glass(accessible ? T.accent : T.gold), padding: '22px 22px 18px',
                      opacity: accessible ? 1 : 0.7, position: 'relative', overflow: 'hidden' }}>

                    {/* Level + Premium badge */}
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
                      {isCompleted && (
                        <div style={{ background: 'linear-gradient(135deg,#34d399,#059669)', borderRadius: 6, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>✅ COMPLETED</div>
                      )}
                      {l.isPremium && (
                        <div style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', borderRadius: 6, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 800, color: '#1a1a00' }}>PREMIUM</div>
                      )}
                      {l.level && (
                        <div style={{ background: `${LEVEL_COLORS[l.level] || T.accent}22`, border: `1px solid ${LEVEL_COLORS[l.level] || T.accent}40`, borderRadius: 6, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700, color: LEVEL_COLORS[l.level] || T.accent }}>
                          {l.level}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%',
                        background: accessible ? 'linear-gradient(135deg,#38bdf8,#818cf8)' : 'rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.82rem', fontWeight: 900, color: accessible ? '#fff' : T.muted }}>
                        {accessible ? l.lessonOrder : '🔒'}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {l.typeName || 'Grammar'}
                      </span>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8, color: T.text }}>{l.lessonName}</div>
                    {l.description && (
                      <div style={{ color: T.muted, fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 14 }}>{l.description}</div>
                    )}

                    {isCompleted ? (
                      <>
                        <div style={{ display: 'block', textAlign: 'center', padding: '11px 20px', borderRadius: 11,
                          background: 'rgba(52,211,153,0.12)', color: T.success, border: '1px solid rgba(52,211,153,0.3)',
                          fontWeight: 700, fontSize: '0.88rem', cursor: 'not-allowed' }}>
                          ✅ Completed
                        </div>
                        <Link to="/progress"
                          style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: '0.75rem',
                            color: T.muted, textDecoration: 'none' }}>
                          🔄 Practice again from Progress →
                        </Link>
                      </>
                    ) : accessible ? (
                      <Link to={`/lesson/${l.lessonID}/play`}
                        state={{ lessonName: l.lessonName, description: l.description }}
                        style={{ display: 'block', textAlign: 'center', padding: '11px 20px', borderRadius: 11,
                          background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff',
                          textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}>
                        ▶ Start Lesson
                      </Link>
                    ) : (
                      <Link to="/subscription"
                        style={{ display: 'block', textAlign: 'center', padding: '11px 20px', borderRadius: 11,
                          background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1a1a00',
                          textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}>
                        👑 Unlock with Premium
                      </Link>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
