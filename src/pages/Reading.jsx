import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getReadingSentences, saveAnswer } from '../services/api'
import { speak } from '../services/speechUtils'
import { useAuth } from '../context/AuthContext'

const LANGUAGE_ID = 1

export default function Reading() {
  const { lessonId } = useParams()
  const { user, logout } = useAuth()
  
  const [sentences, setSentences] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading,    setLoading]   = useState(true)
  const [finished,   setFinished]  = useState(false)

  useEffect(() => {
    getReadingSentences(lessonId, LANGUAGE_ID)
      .then(r => {
        setSentences(r.data || [])
        if (r.data?.[0]) speak(r.data[0].sentenceText)
      })
      .finally(() => setLoading(false))
  }, [lessonId])

  useEffect(() => {
    if (sentences[currentIdx]) {
      speak(sentences[currentIdx].sentenceText)
    }
  }, [currentIdx, sentences])

  const nextSentence = () => {
    // Save "completion" as an answer
    if (user?.userId) {
       saveAnswer({
         userId: user.userId,
         lessonId: parseInt(lessonId),
         languageId: LANGUAGE_ID,
         activityType: 'Reading',
         referenceId: sentences[currentIdx].readingSentenceID || sentences[currentIdx].readingSentenceId,
         isCorrect: true
       }).catch(err => console.error(err))
    }

    if (currentIdx < sentences.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      setFinished(true)
    }
  }

  if (loading) return <div className="page-wrapper"><div className="star-bg"/><div className="loading-center"><div className="spinner"/></div></div>

  if (finished) return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div className="container" style={{ padding: '80px 24px' }}>
        <motion.div className="result-banner" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div style={{ fontSize: '4rem', marginBottom: 20 }}>📖</div>
          <h1 className="heading-md mb-4">Reading Complete!</h1>
          <p className="text-muted mb-8">Excellent! You've successfully read through the material.</p>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </motion.div>
      </div>
    </div>
  )

  const s = sentences[currentIdx]
  const progress = (currentIdx / sentences.length) * 100

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <nav className="navbar">
        <Link to="/dashboard" className="navbar-logo">✦ Spoken English</Link>
        <div className="navbar-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
        </div>
      </nav>

      <div className="quiz-container">
        <div className="quiz-header">
           <h2 className="heading-sm mb-4">Practice Reading:</h2>
           <div className="quiz-progress">
             <div className="progress-track" style={{ flex: 1 }}>
               <div className="progress-fill" style={{ width: `${progress}%` }} />
             </div>
             <span className="quiz-counter">{currentIdx + 1} / {sentences.length}</span>
           </div>
        </div>

        <motion.div key={currentIdx} className="question-card"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {s?.sentenceText}
          </p>
        </motion.div>

        <div className="text-center mt-12">
          <button className="btn btn-primary btn-lg" onClick={nextSentence}>
            {currentIdx === sentences.length - 1 ? 'Finish Reading' : 'I Read This →'}
          </button>
        </div>
      </div>
    </div>
  )
}
