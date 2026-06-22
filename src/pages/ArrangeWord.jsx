import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getArrangeSentences, saveAnswer } from '../services/api'
import { speak, listen, normalizeText } from '../services/speechUtils'
import { useAuth } from '../context/AuthContext'

const LANGUAGE_ID = 1

const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)

export default function ArrangeWord() {
  const { lessonId } = useParams()
  const { user, logout } = useAuth()

  const [exercises,    setExercises]   = useState([])
  const [currentIdx,   setCurrentIdx]  = useState(0)
  const [wordPool,     setWordPool]    = useState([])
  const [chosenWords,  setChosenWords] = useState([])
  // phases: 'arrange' | 'wrong' | 'voice' | 'translate' | 'done'
  const [phase,        setPhase]       = useState('arrange')
  const [score,        setScore]       = useState(0)
  const [loading,      setLoading]     = useState(true)
  const [isRecording,  setIsRecording] = useState(false)
  const [voiceOk,      setVoiceOk]    = useState(null)
  const [voiceText,    setVoiceText]   = useState('')
  const [transOk,      setTransOk]    = useState(null)
  const [transText,    setTransText]   = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    getArrangeSentences(lessonId, LANGUAGE_ID)
      .then(r => {
        const data = r.data || []
        setExercises(data)
        if (data[0]) setWordPool(shuffle([...data[0].words]))
      })
      .finally(() => setLoading(false))
  }, [lessonId])

  useEffect(() => () => clearInterval(timerRef.current), [])

  const wordKey = w => w.wordID ?? w.wordId

  const pickWord = word => {
    speak(word.wordText)   // ← hear the word when you tap it
    setWordPool(p => p.filter(w => wordKey(w) !== wordKey(word)))
    setChosenWords(p => [...p, word])
  }

  const unpickWord = word => {
    setChosenWords(p => p.filter(w => wordKey(w) !== wordKey(word)))
    setWordPool(p => [...p, word])
  }

  const resetExercise = () => {
    clearInterval(timerRef.current)
    setChosenWords([])
    setWordPool(shuffle([...exercises[currentIdx].words]))
    setPhase('arrange')
    setVoiceOk(null); setVoiceText('')
    setTransOk(null); setTransText('')
  }

  const checkOrder = () => {
    const ex = exercises[currentIdx]
    const built   = chosenWords.map(w => w.wordText).join(' ').toLowerCase().trim()
    const correct = ex.correctSentence.toLowerCase().trim()
    const isOk    = built === correct

    if (user?.userId) {
      saveAnswer({
        userId: user.userId, lessonId: parseInt(lessonId), languageId: LANGUAGE_ID,
        activityType: 'Arrange',
        referenceId: ex.arrangeSentenceID ?? ex.arrangeSentenceId,
        isCorrect: isOk,
      }).catch(console.error)
    }

    if (isOk) {
      setScore(s => s + 1)
      speak(ex.correctSentence)
      setPhase('voice')
      setVoiceOk(null); setVoiceText('')
    } else {
      setPhase('wrong')
      setTimeout(() => speak(ex.correctSentence), 400)
    }
  }

  const handleRecord = async (forTranslate = false) => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setIsRecording(true)
    if (forTranslate) { setTransOk(null); setTransText('') }
    else              { setVoiceOk(null); setVoiceText('') }
    try {
      const transcript = await listen()
      const ex = exercises[currentIdx]
      const n1 = normalizeText(transcript)
      const n2 = normalizeText(ex.correctSentence)
      const matched = n1.includes(n2) || n2.includes(n1) ||
        n2.split(' ').filter(w => n1.includes(w)).length >= Math.ceil(n2.split(' ').length * 0.7)

      if (forTranslate) { setTransText(transcript); setTransOk(matched) }
      else              { setVoiceText(transcript); setVoiceOk(matched) }
    } catch {
      alert('Microphone not available or permission denied.')
    } finally {
      setIsRecording(false)
    }
  }

  const advance = () => {
    const next = currentIdx + 1
    if (next < exercises.length) {
      setCurrentIdx(next)
      setChosenWords([])
      setWordPool(shuffle([...exercises[next].words]))
      setPhase('arrange')
      setVoiceOk(null); setVoiceText('')
      setTransOk(null); setTransText('')
    } else {
      setPhase('done')
    }
  }

  // Go to translate phase after voice success
  const goToTranslate = () => {
    const ex = exercises[currentIdx]
    setTransOk(null); setTransText('')
    if (ex.tamilMeaning) {
      setPhase('translate')
    } else {
      advance() // no Tamil meaning available, skip translate phase
    }
  }

  if (loading) return (
    <div style={styles.pageWrapper}><div style={styles.center}><div className="spinner" /></div></div>
  )

  if (!exercises.length) return (
    <div style={styles.pageWrapper}>
      <div style={styles.center}>
        <p style={{ color: '#aaa' }}>No exercises found for this lesson.</p>
        <Link to="/dashboard" style={styles.btnPrimary}>← Dashboard</Link>
      </div>
    </div>
  )

  if (phase === 'done') {
    const pct = Math.round((score / exercises.length) * 100)
    return (
      <div style={styles.pageWrapper}>
        <div className="star-bg" />
        <div style={styles.center}>
          <motion.div style={styles.card} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div style={{ fontSize: '3.5rem' }}>🧩</div>
            <h1 style={{ color: '#c4b5fd', fontSize: '1.8rem', margin: '12px 0 6px' }}>Complete!</h1>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#06b6d4' }}>{pct}%</div>
            <p style={{ color: '#888', marginTop: 8 }}>{score} / {exercises.length} correct</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
              <button style={styles.btnSecondary} onClick={() => window.location.reload()}>🔁 Retry</button>
              <Link to="/dashboard" style={styles.btnPrimary}>Dashboard →</Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  const ex = exercises[currentIdx]
  const progress = (currentIdx / exercises.length) * 100
  const hasTamil = !!ex.tamilMeaning

  return (
    <div style={styles.pageWrapper}>
      <div className="star-bg" />

      <nav style={styles.navbar}>
        <Link to="/dashboard" style={styles.logo}>✦ Spoken English</Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
          <button style={styles.btnSecondary} onClick={logout}>Logout</button>
        </div>
      </nav>

      <div style={styles.main}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <p style={{ color: '#888', fontSize: '0.85rem', textAlign: 'right', marginTop: 4 }}>
          {currentIdx + 1} / {exercises.length}
        </p>

        {/* Phase tabs */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '16px 0 28px' }}>
          {[
            { id: 'arrange',   label: '🧩 Arrange' },
            { id: 'voice',     label: '🎤 Speak'   },
            ...(hasTamil ? [{ id: 'translate', label: '🌐 Translate' }] : []),
          ].map(t => (
            <div key={t.id} style={{
              padding: '5px 16px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 600,
              background: phase === t.id || (t.id === 'arrange' && phase === 'wrong')
                ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)',
              border: phase === t.id || (t.id === 'arrange' && phase === 'wrong')
                ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}>{t.label}</div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ══ PHASE: ARRANGE ══ */}
          {(phase === 'arrange' || phase === 'wrong') && (
            <motion.div key="arrange"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            >
              <h2 style={styles.heading}>🧩 Arrange the words into a correct sentence</h2>
              <p style={styles.subText}>Tap a word to place it — it plays audio. Tap placed word to remove it.</p>

              <div style={styles.sentenceZone}>
                {chosenWords.length === 0 && <span style={{ color: '#555' }}>Tap words below...</span>}
                {chosenWords.map(w => (
                  <button key={wordKey(w)} style={styles.wordTilePlaced} onClick={() => unpickWord(w)}>
                    {w.wordText} ✕
                  </button>
                ))}
              </div>

              {phase === 'wrong' && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={styles.wrongBox}>
                  <p style={{ color: '#fca5a5', fontWeight: 700, marginBottom: 8 }}>❌ Wrong order! Correct sentence:</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ color: '#fed7aa', fontSize: '1.1rem', fontWeight: 600 }}>"{ex.correctSentence}"</span>
                    <button onClick={() => speak(ex.correctSentence)} title="Hear"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem' }}>🔊</button>
                  </div>
                  {ex.tamilMeaning && (
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 6 }}>
                      Tamil: {ex.tamilMeaning}
                    </p>
                  )}
                  <p style={{ color: '#aaa', fontSize: '0.82rem', marginTop: 8 }}>Rearrange and try again ↓</p>
                </motion.div>
              )}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '20px 0' }} />

              <div style={styles.wordPool}>
                {wordPool.map(w => (
                  <motion.button key={wordKey(w)} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    style={styles.wordTile} onClick={() => pickWord(w)}
                  >
                    🔊 {w.wordText}
                  </motion.button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
                <button style={styles.btnSecondary} onClick={resetExercise}>🔄 Reset</button>
                {phase === 'wrong' && (
                  <button style={styles.btnCyan} onClick={advance}>Next Sentence →</button>
                )}
                {phase === 'arrange' && (
                  <button
                    style={{ ...styles.btnCyan, opacity: chosenWords.length === 0 ? 0.4 : 1 }}
                    onClick={checkOrder} disabled={chosenWords.length === 0}
                  >
                    Check Order →
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ══ PHASE: VOICE (read arranged sentence aloud) ══ */}
          {phase === 'voice' && (
            <motion.div key="voice"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🎉</div>
              <h2 style={{ ...styles.heading, color: '#6ee7b7' }}>Correct Order!</h2>
              <p style={styles.subText}>Now read the sentence aloud. Your voice will be verified.</p>

              <div style={styles.sentenceDisplay}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#c4b5fd' }}>"{ex.correctSentence}"</span>
                <button onClick={() => speak(ex.correctSentence)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', marginLeft: 10 }}
                  title="Hear it again">🔊</button>
              </div>

              {voiceOk === null && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 28 }}>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    onClick={() => handleRecord(false)} disabled={isRecording}
                    style={{
                      width: 96, height: 96, borderRadius: '50%', border: 'none',
                      background: isRecording ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                      cursor: isRecording ? 'default' : 'pointer', fontSize: '2rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isRecording ? '0 0 30px rgba(239,68,68,0.6)' : '0 0 30px rgba(124,58,237,0.5)',
                    }}
                  >{isRecording ? '⏹' : '🎙'}</motion.button>
                  <p style={{ color: '#888', fontSize: '0.88rem' }}>
                    {isRecording ? '🔴 Listening… speak clearly' : 'Tap mic to read the sentence'}
                  </p>
                </div>
              )}

              <AnimatePresence>
                {voiceOk === true && (
                  <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ ...styles.resultBox, borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.12)', marginTop: 24 }}
                  >
                    <p style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>✅ Perfect Pronunciation!</p>
                    {voiceText && <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 14 }}>You said: "{voiceText}"</p>}
                    <button style={styles.btnCyan} onClick={goToTranslate}>
                      {hasTamil ? 'Translate Challenge →' : 'Next Sentence →'}
                    </button>
                  </motion.div>
                )}

                {voiceOk === false && (
                  <motion.div key="fail" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ ...styles.resultBox, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', marginTop: 24 }}
                  >
                    <p style={{ color: '#fca5a5', fontWeight: 700, fontSize: '1.05rem', marginBottom: 6 }}>❌ Didn't match — try again!</p>
                    {voiceText && <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 12 }}>You said: "{voiceText}"</p>}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button style={styles.btnSecondary} onClick={() => speak(ex.correctSentence)}>🔊 Hear It</button>
                      <button style={styles.btnCyan} onClick={() => { setVoiceOk(null); setVoiceText(''); setTimeout(() => handleRecord(false), 300) }} disabled={isRecording}>
                        🎤 Try Again
                      </button>
                      <button style={styles.btnSecondary} onClick={goToTranslate}>
                        {hasTamil ? 'Translate →' : 'Next →'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══ PHASE: TRANSLATE (see Tamil → speak English) ══ */}
          {phase === 'translate' && (
            <motion.div key="translate"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>🌐</div>
              <h2 style={{ ...styles.heading, color: '#fbbf24' }}>Translate to English!</h2>
              <p style={styles.subText}>Read the Tamil sentence below and say the English translation aloud.</p>

              {/* Tamil sentence */}
              <div style={{ ...styles.sentenceDisplay, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', marginBottom: 8 }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.02em' }}>
                  {ex.tamilMeaning}
                </span>
              </div>
              <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 24 }}>
                Hint: English answer has {ex.correctSentence.split(' ').length} words
              </p>

              {transOk === null && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    onClick={() => handleRecord(true)} disabled={isRecording}
                    style={{
                      width: 96, height: 96, borderRadius: '50%', border: 'none',
                      background: isRecording ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                      cursor: isRecording ? 'default' : 'pointer', fontSize: '2rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isRecording ? '0 0 30px rgba(239,68,68,0.6)' : '0 0 30px rgba(245,158,11,0.5)',
                    }}
                  >{isRecording ? '⏹' : '🎙'}</motion.button>
                  <p style={{ color: '#888', fontSize: '0.88rem' }}>
                    {isRecording ? '🔴 Listening… say English translation' : 'Tap mic to speak English translation'}
                  </p>
                </div>
              )}

              <AnimatePresence>
                {transOk === true && (
                  <motion.div key="tok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ ...styles.resultBox, borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.12)', marginTop: 24 }}
                  >
                    <p style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>✅ Correct Translation!</p>
                    {transText && <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 4 }}>You said: "{transText}"</p>}
                    <p style={{ color: '#67e8f9', fontSize: '0.9rem', marginBottom: 14 }}>Answer: "{ex.correctSentence}"</p>
                    <button style={styles.btnCyan} onClick={advance}>Next Sentence →</button>
                  </motion.div>
                )}

                {transOk === false && (
                  <motion.div key="tfail" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ ...styles.resultBox, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', marginTop: 24 }}
                  >
                    <p style={{ color: '#fca5a5', fontWeight: 700, fontSize: '1.05rem', marginBottom: 6 }}>❌ Not quite — try again!</p>
                    {transText && <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 8 }}>You said: "{transText}"</p>}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button style={styles.btnSecondary} onClick={() => speak(ex.correctSentence)}>🔊 Hear Answer</button>
                      <button style={styles.btnCyan}
                        onClick={() => { setTransOk(null); setTransText(''); setTimeout(() => handleRecord(true), 300) }}
                        disabled={isRecording}
                      >🎤 Try Again</button>
                      <button style={styles.btnSecondary} onClick={advance}>Next →</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

const styles = {
  pageWrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0d0d1a 0%, #0a0a14 100%)',
    position: 'relative', color: '#fff',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  navbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  logo:    { color: '#a78bfa', fontWeight: 800, fontSize: '1.1rem', textDecoration: 'none' },
  navLink: { color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' },
  main: { maxWidth: 680, margin: '0 auto', padding: '36px 24px 80px', position: 'relative', zIndex: 1 },
  progressBar: { height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', borderRadius: 6, transition: 'width 0.4s ease' },
  heading:  { fontSize: '1.3rem', fontWeight: 700, color: '#e2e8f0', textAlign: 'center', marginBottom: 8 },
  subText:  { color: '#888', fontSize: '0.88rem', textAlign: 'center', marginBottom: 20 },
  sentenceZone: {
    minHeight: 80, border: '2px dashed rgba(124,58,237,0.4)', borderRadius: 16,
    padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 10,
    alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,0.06)',
  },
  wordPool: { display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  wordTile: {
    padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.35)',
    background: 'rgba(6,182,212,0.1)', color: '#67e8f9',
    fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s',
  },
  wordTilePlaced: {
    padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.5)',
    background: 'rgba(124,58,237,0.25)', color: '#c4b5fd',
    fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  wrongBox: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 14, padding: '16px 20px', textAlign: 'center', marginTop: 16,
  },
  sentenceDisplay: {
    background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
    borderRadius: 16, padding: '18px 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexWrap: 'wrap', gap: 8, marginTop: 20,
  },
  resultBox: { border: '1px solid', borderRadius: 16, padding: '18px 24px', textAlign: 'center' },
  card: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24, padding: '48px 36px', textAlign: 'center', maxWidth: 480, margin: '0 auto',
  },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24 },
  btnPrimary: {
    padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', textDecoration: 'none',
    display: 'inline-block', marginTop: 12,
  },
  btnSecondary: {
    padding: '10px 22px', borderRadius: 12, background: 'rgba(255,255,255,0.08)',
    color: '#ddd', fontWeight: 600, fontSize: '0.9rem',
    border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
  },
  btnCyan: {
    padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem',
  },
}
