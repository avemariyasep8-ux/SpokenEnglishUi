import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getMeaningQuestions, saveAnswer } from '../services/api'
import { speak } from '../services/speechUtils'
import { useAuth } from '../context/AuthContext'

const LANGUAGE_ID = 1

export default function WordMeaning() {
  const { lessonId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOpt, setSelectedOpt] = useState(null)
  const [isCorrect,   setIsCorrect]   = useState(null)
  const [score,       setScore]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [finished,    setFinished]    = useState(false)

  useEffect(() => {
    getMeaningQuestions(lessonId, LANGUAGE_ID)
      .then(r => {
        setQuestions(r.data || [])
        if (r.data?.[0]) speak(r.data[0].questionText)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [lessonId])

  const handleOptionClick = async (option) => {
    if (selectedOpt) return // prevent double click
    
    setSelectedOpt(option.optionID || option.optionId)
    const correct = option.isCorrect
    setIsCorrect(correct)
    
    if (correct) setScore(s => s + 1)

    // Save answer to DB
    if (user?.userId) {
      saveAnswer({
        userId: user.userId,
        lessonId: parseInt(lessonId),
        languageId: LANGUAGE_ID,
        activityType: 'Meaning',
        referenceId: questions[currentIdx].questionID || questions[currentIdx].questionId,
        isCorrect: correct
      }).catch(err => console.error("Save answer failed", err))
    }

    // Auto next after 2s
    setTimeout(() => {
      advance();
    }, 2000)
  }

  const advance = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1)
      setSelectedOpt(null)
      setIsCorrect(null)
    } else {
      setFinished(true)
    }
  }

  useEffect(() => {
    if (questions[currentIdx]) {
      speak(questions[currentIdx].questionText)
    }
  }, [currentIdx, questions])

  if (loading) return <div className="page-wrapper"><div className="star-bg"/><div className="loading-center"><div className="spinner"/></div></div>

  if (finished) return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div className="container" style={{ padding: '80px 24px' }}>
        <motion.div className="result-banner" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div style={{ fontSize: '4rem', marginBottom: 20 }}>🏆</div>
          <h1 className="heading-md mb-4">Lesson Complete!</h1>
          <div className="result-score">{Math.round((score / questions.length) * 100)}%</div>
          <p className="text-muted mt-4 mb-8">You got {score} out of {questions.length} correct.</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => window.location.reload()} className="btn btn-secondary">Try Again</button>
            <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )

  const q = questions[currentIdx]
  const progress = ((currentIdx) / questions.length) * 100

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
          <div className="quiz-progress">
            <div className="progress-track" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="quiz-counter">{currentIdx + 1} / {questions.length}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentIdx} className="question-card"
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
            <p className="question-label">Select the correct meaning for:</p>
            <h2 className="question-word">{q?.questionText}</h2>
            
            <div className="options-list mt-8">
              {q?.options.map(opt => (
                <button key={opt.optionID || opt.optionId} 
                  className={`option-btn ${selectedOpt === (opt.optionID || opt.optionId) ? (opt.isCorrect ? 'correct' : 'wrong') : ''}`}
                  onClick={() => handleOptionClick(opt)}
                  disabled={selectedOpt !== null}>
                  {opt.optionText}
                </button>
              ))}
            </div>
            
            {selectedOpt && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
                <div className="mb-4">
                  {isCorrect ? (
                    <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '1.1rem' }}>✨ Brilliant! Correct Answer.</span>
                  ) : (
                    <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '1.1rem' }}>✖ Oops! That's not right.</span>
                  )}
                </div>
                <button className="btn btn-cyan btn-sm" onClick={advance}>
                  Next Question →
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
