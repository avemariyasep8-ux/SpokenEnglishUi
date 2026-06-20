import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getLessonDetail } from '../services/api'
import { speak } from '../services/speechUtils'
import { useAuth } from '../context/AuthContext'

export default function LessonExplanation() {
  const { lessonId } = useParams()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLessonDetail(lessonId)
      .then(res => setLesson(res.data))
      .finally(() => setLoading(false))
  }, [lessonId])

  const startPractice = () => {
    // Determine which activity to start with based on lesson type or sequential rules
    // For now, follow the flow: Arrange -> Meaning
    navigate(`/arrange/${lessonId}`)
  }

  if (loading) return <div className="page-wrapper"><div className="star-bg"/><div className="loading-center"><div className="spinner"/></div></div>

  if (!lesson) return <div className="page-wrapper"><div className="star-bg"/><div className="container">Lesson not found.</div></div>

  // Basic parsing for structured description (split by lines/sections)
  const descriptionLines = lesson.description?.split('\n') || []

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <nav className="navbar">
        <Link to="/dashboard" className="navbar-logo">✦ Spoken English</Link>
        <div className="navbar-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/lessons"   className="nav-link">Lessons</Link>
          <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 80, position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="explanation-card glass">
          <div className="badge badge-violet mb-4">{lesson.typeName}</div>
          <h1 className="heading-md mb-6">{lesson.lessonName}</h1>

          <div className="explanation-content" style={{ textAlign: 'left', lineHeight: 1.8 }}>
            {descriptionLines.map((line, i) => (
              <p key={i} className={line.startsWith('Example:') || line.startsWith('- ') ? 'text-accent' : ''} 
                style={{ marginBottom: line.trim() === '' ? '1rem' : '0.5rem', fontWeight: line.includes('Structure:') ? 700 : 400 }}>
                {line}
              </p>
            ))}
          </div>

          <div className="mt-12 flex gap-4 justify-center">
            <button className="btn btn-cyan btn-lg" onClick={() => speak(lesson.description)}>
               🔊 Read Rules Aloud
            </button>
            <button className="btn btn-primary btn-lg" onClick={startPractice}>
               Start Practice →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
