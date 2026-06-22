import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getUserProgress, getLessons } from '../services/api'
import { useAuth } from '../context/AuthContext'

const LANGUAGE_ID = 1

export default function Progress() {
  const { user, logout } = useAuth()
  const [progress, setProgress] = useState([])
  const [lessons,  setLessons]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user?.userId) return
    Promise.all([
      getUserProgress(user.userId, LANGUAGE_ID),
      getLessons(LANGUAGE_ID)
    ]).then(([pRes, lRes]) => {
      setProgress(pRes.data || [])
      setLessons(lRes.data || [])
    }).finally(() => setLoading(false))
  }, [user])

  const lessonMap = lessons.reduce((acc, l) => {
    acc[l.lessonID || l.lessonId] = l.lessonName
    return acc
  }, {})

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
             <h1 className="heading-md" style={{ marginBottom: 8 }}>📊 Detailed Progress</h1>
             <p className="text-muted" style={{ marginBottom: 40 }}>Tracks your performance across all completed lessons</p>
           </motion.div>

           {loading ? (
             <div className="loading-center"><div className="spinner" /></div>
           ) : progress.length === 0 ? (
             <div className="alert alert-info">Start practicing to see your progress here!</div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {progress.map((p, i) => {
                 const total = Number(p.totalAttempt)
                 const correct = Number(p.correctCount)
                 const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
                 return (
                   <motion.div key={p.lessonID || p.lessonId} className="progress-item"
                     initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.05 }}>
                     <div className="lesson-card-order">#{p.lessonID || p.lessonId}</div>
                     <div className="progress-lesson-name">
                       {lessonMap[p.lessonID || p.lessonId] || `Lesson ${p.lessonID || p.lessonId}`}
                       <div className="text-muted text-sm" style={{ fontWeight: 400 }}>{total} attempts total</div>
                     </div>
                     <div className="flex-col items-center" style={{ width: 140 }}>
                        <div className="progress-track w-full mb-2">
                          <div className="progress-fill" style={{ width: `${accuracy}%`, background: accuracy > 80 ? 'var(--green)' : accuracy > 50 ? 'var(--gold)' : 'var(--red)' }} />
                        </div>
                        <span className="text-sm font-bold">{accuracy}% accuracy</span>
                     </div>
                     <div className="accuracy-badge" style={{ color: accuracy > 80 ? 'var(--green)' : accuracy > 50 ? 'var(--gold)' : 'var(--red)' }}>
                       {accuracy}%
                     </div>
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
