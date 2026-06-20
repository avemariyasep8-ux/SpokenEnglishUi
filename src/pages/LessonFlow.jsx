import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getSequentialLesson, saveAnswer } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { speak, listen, normalizeText } from '../services/speechUtils'

const LANGUAGE_ID = 1

export default function LessonFlow() {
  const { lessonId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [lesson, setLesson] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [subStepIndex, setSubStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Arrange state
  const [arrangeWords, setArrangeWords] = useState([])
  const [selectedWords, setSelectedWords] = useState([])
  const [isArrangeCorrect, setIsArrangeCorrect] = useState(null) // null | true | false

  // Voice state
  const [isListening, setIsListening] = useState(false)
  const [voiceResult, setVoiceResult] = useState(null) // null | { ok: bool, text: string }
  const [voiceError, setVoiceError] = useState('')

  useEffect(() => { fetchLessonFlow() }, [lessonId])

  const fetchLessonFlow = async () => {
    setLoading(true)
    try {
      const res = await getSequentialLesson(lessonId, LANGUAGE_ID)
      setLesson(res.data)
      const requestedStart = location.state?.startStep
      let startIndex = 0
      if (requestedStart) {
        const found = res.data.steps.findIndex(s => s.stepType === requestedStart)
        if (found !== -1) startIndex = found
      }
      setCurrentStepIndex(startIndex)
      initStep(res.data.steps[startIndex], 0)
    } catch {
      setError('Failed to load lesson. Please go back and try again.')
    } finally {
      setLoading(false)
    }
  }

  const initStep = (step, subIdx = 0) => {
    setSubStepIndex(subIdx)
    setIsArrangeCorrect(null)
    setVoiceResult(null)
    setVoiceError('')
    if (step?.stepType === 'practice_arrange') {
      const practice = step.content[subIdx]
      if (practice) {
        setArrangeWords([...practice.words].sort(() => Math.random() - 0.5))
        setSelectedWords([])
      }
    }
  }

  // ── Next step logic ──────────────────────────────────────────
  const handleNext = () => {
    const currentStep = lesson.steps[currentStepIndex]

    // If there are more sub-items in this step
    if (Array.isArray(currentStep.content) && subStepIndex < currentStep.content.length - 1) {
      initStep(currentStep, subStepIndex + 1)
      return
    }

    // Move to next major step
    if (currentStepIndex < lesson.steps.length - 1) {
      const nextIndex = currentStepIndex + 1
      setCurrentStepIndex(nextIndex)
      initStep(lesson.steps[nextIndex], 0)
    } else {
      navigate('/dashboard')
    }
  }

  // Whether the Next button should be enabled
  const canPressNext = () => {
    const step = lesson?.steps[currentStepIndex]
    if (!step) return false
    if (step.stepType === 'practice_arrange') {
      // Must have checked the answer (correct or wrong — wrong allows skip)
      return isArrangeCorrect !== null
    }
    if (step.stepType === 'practice_speak') {
      // Must have attempted voice or can skip after one try
      return voiceResult !== null
    }
    return true // example, meaning steps always allow Next
  }

  // ── Arrange handlers ─────────────────────────────────────────
  const toggleWord = (word, source) => {
    if (source === 'pool') {
      setArrangeWords(prev => prev.filter(w => w !== word))
      setSelectedWords(prev => [...prev, word])
    } else {
      setSelectedWords(prev => prev.filter(w => w !== word))
      setArrangeWords(prev => [...prev, word])
    }
  }

  const checkArrange = async () => {
    const currentPractice = lesson.steps[currentStepIndex].content[subStepIndex]
    const userSentence = selectedWords.join(' ')
    const correct = userSentence.toLowerCase().trim() === currentPractice.correct.toLowerCase().trim()
    setIsArrangeCorrect(correct)

    if (correct) speak(currentPractice.correct)

    if (user?.userId) {
      saveAnswer({
        userID: user.userId,
        lessonID: parseInt(lessonId),
        languageID: LANGUAGE_ID,
        activityType: 'Arrange',
        referenceID: 0,
        isCorrect: correct,
      }).catch(console.error)
    }
  }

  // ── Voice handlers ───────────────────────────────────────────
  const handleStartSpeaking = async () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setIsListening(true)
    setVoiceResult(null)
    setVoiceError('')

    try {
      const transcript = await listen()
      const currentPractice = lesson.steps[currentStepIndex].content[subStepIndex]
      const n1 = normalizeText(transcript)
      const n2 = normalizeText(currentPractice.text)
      const matched = n1.includes(n2) || n2.includes(n1) ||
        n2.split(' ').filter(w => n1.includes(w)).length >= Math.ceil(n2.split(' ').length * 0.7)
      setVoiceResult({ ok: matched, text: transcript })
    } catch (err) {
      setVoiceError(err.message || 'Voice error. Please try again.')
    } finally {
      setIsListening(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────
  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (error) return (
    <div className="container p-12 text-center">
      <p style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</p>
      <Link to="/lessons" className="btn btn-secondary">← Back to Lessons</Link>
    </div>
  )
  if (!lesson) return null

  const currentStep = lesson.steps[currentStepIndex]

  return (
    <div className="page-wrapper min-h-screen">
      <div className="star-bg" />
      <nav className="navbar relative z-10">
        <span className="navbar-logo">✦ {lesson.lessonName}</span>
        <div className="navbar-links">
          <Link to="/lessons" className="nav-link">Back to Lessons</Link>
          <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
        </div>
      </nav>

      <div className="container max-w-2xl pt-12 pb-24 relative z-10">
        {/* Progress bar */}
        <div className="w-full bg-white/10 h-2 rounded-full mb-12 overflow-hidden">
          <motion.div
            className="h-full bg-violet-glow"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / lesson.steps.length) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex + '-' + subStepIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-dark-glass p-8 rounded-3xl border border-violet-glow/20 shadow-2xl"
          >
            {/* Step header */}
            <div className="flex items-center gap-3 mb-6">
              <span className="badge badge-cyan uppercase tracking-widest text-[10px]">
                Step {currentStepIndex + 1} of {lesson.steps.length}
              </span>
              <span className="text-violet-glow text-sm font-bold uppercase">
                {currentStep.stepType.replace(/_/g, ' ')}
              </span>
            </div>

            {/* ── Example step ── */}
            {currentStep.stepType === 'example' && (
              <div className="space-y-6">
                <h2 className="heading-sm text-white">Real-world Examples</h2>
                <div className="space-y-4">
                  {currentStep.content.map((ex, idx) => (
                    <div key={idx} className="flex flex-col gap-1 p-4 bg-white/5 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">{ex.en}</span>
                        <button onClick={() => speak(ex.en)} className="text-cyan">🔊</button>
                      </div>
                      <span className="text-sm text-muted tamil-font">{ex.ta}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Meaning step ── */}
            {currentStep.stepType === 'meaning' && (
              <div className="space-y-6">
                <h2 className="heading-sm text-white">Lesson Overview</h2>
                <div className="text-xl leading-relaxed text-white/90 whitespace-pre-wrap">
                  {currentStep.content.en.split('\n').map((line, i) => (
                    <p key={i} className="mb-2">
                      {line.startsWith('**') ? <strong>{line.replace(/\*\*/g, '')}</strong> : line}
                    </p>
                  ))}
                </div>
                <p className="text-lg text-muted tamil-font">{currentStep.content.ta}</p>
              </div>
            )}

            {/* ── Arrange step ── */}
            {currentStep.stepType === 'practice_arrange' && (
              <div className="space-y-8">
                <h2 className="heading-sm text-white">🧩 Arrange the Sentence</h2>
                <p style={{ color: '#888', fontSize: '0.88rem', textAlign: 'center' }}>
                  {subStepIndex + 1} / {currentStep.content.length}
                </p>

                {/* Selected words zone */}
                <div className="min-h-[100px] p-6 bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex flex-wrap gap-3 items-center justify-center">
                  {selectedWords.length === 0 && <span style={{ color: '#555' }}>Tap words below to build the sentence…</span>}
                  {selectedWords.map((word, i) => (
                    <motion.button layoutId={`word-${word}-${i}`} key={i}
                      onClick={() => toggleWord(word, 'selected')}
                      className="px-4 py-2 bg-violet-glow text-white rounded-lg shadow-lg font-medium">
                      {word} ✕
                    </motion.button>
                  ))}
                </div>

                {/* Word pool */}
                <div className="flex flex-wrap gap-3 justify-center">
                  {arrangeWords.map((word, i) => (
                    <motion.button layoutId={`word-${word}-pool-${i}`} key={i}
                      onClick={() => toggleWord(word, 'pool')}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 transition-colors">
                      {word}
                    </motion.button>
                  ))}
                </div>

                {/* Feedback */}
                {isArrangeCorrect === true && (
                  <div className="p-4 rounded-xl text-center font-bold bg-green/20 text-green">
                    🎉 Correct! Well done.
                  </div>
                )}
                {isArrangeCorrect === false && (
                  <div className="p-4 rounded-xl text-center bg-red/10" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                    <p style={{ color: '#fca5a5', fontWeight: 700, marginBottom: 6 }}>❌ Not quite right.</p>
                    <p style={{ color: '#888', fontSize: '0.85rem' }}>
                      Correct: <span style={{ color: '#fed7aa' }}>"{currentStep.content[subStepIndex].correct}"</span>
                      <button onClick={() => speak(currentStep.content[subStepIndex].correct)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>🔊</button>
                    </p>
                    <button onClick={() => {
                      setIsArrangeCorrect(null)
                      const practice = currentStep.content[subStepIndex]
                      setArrangeWords([...practice.words].sort(() => Math.random() - 0.5))
                      setSelectedWords([])
                    }} className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}>
                      🔄 Try Again
                    </button>
                  </div>
                )}

                {/* Check button */}
                {isArrangeCorrect === null && (
                  <div className="flex justify-center pt-2">
                    <button onClick={checkArrange}
                      disabled={selectedWords.length === 0}
                      className="btn btn-primary px-12"
                      style={{ opacity: selectedWords.length === 0 ? 0.4 : 1 }}>
                      Check Answer →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Speak step ── */}
            {currentStep.stepType === 'practice_speak' && (
              <div className="space-y-8 text-center">
                <h2 className="heading-sm text-white">🎤 Speaking Practice</h2>
                <p style={{ color: '#888', fontSize: '0.88rem' }}>
                  {subStepIndex + 1} / {currentStep.content.length}
                </p>

                {/* Sentence display */}
                <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-2xl font-bold text-white mb-3">
                    {currentStep.content[subStepIndex].text}
                  </p>
                  <button onClick={() => speak(currentStep.content[subStepIndex].text)}
                    className="text-cyan text-sm">
                    🔊 Listen First
                  </button>
                </div>

                {/* Mic button (shown until result) */}
                {voiceResult === null && (
                  <div className="flex flex-col items-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={handleStartSpeaking}
                      disabled={isListening}
                      style={{
                        width: 96, height: 96, borderRadius: '50%', border: 'none',
                        background: isListening
                          ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                          : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                        cursor: isListening ? 'default' : 'pointer',
                        fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isListening ? '0 0 30px rgba(239,68,68,0.6)' : '0 0 30px rgba(124,58,237,0.5)',
                      }}>
                      {isListening ? '⏹' : '🎙'}
                    </motion.button>
                    <p style={{ color: '#888', fontSize: '0.88rem' }}>
                      {isListening ? '🔴 Listening… speak clearly' : 'Tap mic to read the sentence aloud'}
                    </p>
                    {voiceError && (
                      <p style={{ color: '#fca5a5', fontSize: '0.85rem', maxWidth: 320 }}>{voiceError}</p>
                    )}
                  </div>
                )}

                {/* Voice result */}
                <AnimatePresence>
                  {voiceResult?.ok === true && (
                    <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="p-5 rounded-2xl bg-green/20 text-green font-bold" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
                      <p style={{ fontSize: '1.1rem', marginBottom: 6 }}>✅ Great pronunciation!</p>
                      {voiceResult.text && (
                        <p style={{ fontWeight: 400, fontSize: '0.85rem', color: '#aaa' }}>
                          You said: "{voiceResult.text}"
                        </p>
                      )}
                    </motion.div>
                  )}
                  {voiceResult?.ok === false && (
                    <motion.div key="fail" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="p-5 rounded-2xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <p style={{ color: '#fca5a5', fontWeight: 700, fontSize: '1.05rem', marginBottom: 6 }}>
                        ❌ Didn't match — try again!
                      </p>
                      {voiceResult.text && (
                        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 12 }}>
                          You said: "{voiceResult.text}"
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button onClick={() => speak(currentStep.content[subStepIndex].text)}
                          className="btn btn-secondary btn-sm">🔊 Hear It</button>
                        <button onClick={() => { setVoiceResult(null); setVoiceError('') }}
                          className="btn btn-secondary btn-sm">🎤 Try Again</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="mt-12 flex justify-center gap-4">
          <button
            onClick={() => {
              if (currentStepIndex > 0) {
                const prevIndex = currentStepIndex - 1
                setCurrentStepIndex(prevIndex)
                initStep(lesson.steps[prevIndex], 0)
              }
            }}
            disabled={currentStepIndex === 0}
            className="btn btn-secondary btn-lg px-12 opacity-80">
            ← Previous
          </button>
          <button
            onClick={handleNext}
            disabled={!canPressNext()}
            className="btn btn-primary btn-lg px-16 group"
            style={{ opacity: canPressNext() ? 1 : 0.4, cursor: canPressNext() ? 'pointer' : 'not-allowed' }}>
            {currentStepIndex === lesson.steps.length - 1 &&
              (!Array.isArray(currentStep.content) || subStepIndex === currentStep.content.length - 1)
              ? 'Finish ✓'
              : 'Next Step →'}
          </button>
        </div>

        {/* Hint when Next is locked */}
        {!canPressNext() && currentStep.stepType === 'practice_arrange' && isArrangeCorrect === null && (
          <p style={{ textAlign: 'center', color: '#666', fontSize: '0.82rem', marginTop: 8 }}>
            Select words and press "Check Answer" to continue
          </p>
        )}
        {!canPressNext() && currentStep.stepType === 'practice_speak' && voiceResult === null && (
          <p style={{ textAlign: 'center', color: '#666', fontSize: '0.82rem', marginTop: 8 }}>
            Tap the mic and speak the sentence to continue
          </p>
        )}
      </div>
    </div>
  )
}
