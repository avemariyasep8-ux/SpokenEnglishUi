import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getMeaningQuestionsAdmin, getArrangeSentences,
  getWordContent, getLessons, updateStreak
} from '../services/api'
import { speak, speakTamil, listen, normalizeText, diffWords, isSpeechRecognitionSupported } from '../services/speechUtils'
import { useAuth } from '../context/AuthContext'

const LANG = 1
const MAX_MCQ = 5
const MAX_ARR = 3
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.95)',
  accent1: '#38bdf8', accent2: '#818cf8', accent3: '#34d399',
  danger: '#f87171', gold: '#fbbf24', orange: '#fb923c',
  text: '#e2e8f0', muted: '#64748b',
}

const glass = (tint = T.accent1, glow = false) => ({
  background: 'linear-gradient(135deg,rgba(12,20,36,0.97) 0%,rgba(15,25,45,0.95) 100%)',
  border: `1px solid ${tint}30`, borderRadius: 20,
  boxShadow: glow ? `0 0 32px ${tint}22, inset 0 1px 0 ${tint}20` : '0 4px 24px rgba(0,0,0,0.4)',
  backdropFilter: 'blur(16px)',
})

const btn = (v = 'primary') => ({
  ...(({
    primary: { background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', border: 'none' },
    success: { background: 'linear-gradient(135deg,#34d399,#059669)', color: '#fff', border: 'none' },
    danger:  { background: 'linear-gradient(135deg,#f87171,#dc2626)', color: '#fff', border: 'none' },
    ghost:   { background: 'rgba(255,255,255,0.05)', color: T.text, border: '1px solid rgba(255,255,255,0.12)' },
    outline: { background: 'transparent', color: T.accent1, border: `1.5px solid ${T.accent1}` },
    gold:    { background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1a1a00', border: 'none' },
    orange:  { background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff', border: 'none' },
  })[v]),
  padding: '13px 28px', borderRadius: 14, fontWeight: 700,
  fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.18s',
  width: '100%', display: 'block', textAlign: 'center',
})

// ── Shared ────────────────────────────────────────────────────────────────────

function AuraBg() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw',
        background: 'radial-gradient(ellipse,rgba(56,189,248,0.07) 0%,transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(ellipse,rgba(129,140,248,0.07) 0%,transparent 70%)', borderRadius: '50%' }} />
    </div>
  )
}

function TopBar({ hearts, xp, step, total, lang, onLang, onExit, phase }) {
  const pct = total > 0 ? (step / total) * 100 : 0
  const barClr = phase === 'retry'
    ? 'linear-gradient(90deg,#fb923c,#f87171)'
    : 'linear-gradient(90deg,#38bdf8,#818cf8)'
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(8,12,20,0.92)',
      backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,179,237,0.1)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onExit}
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, color: T.muted, cursor: 'pointer', fontSize: '1rem',
            padding: '4px 10px', flexShrink: 0 }}>✕</button>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0,1,2].map(i => <span key={i} style={{ fontSize: '1.2rem', opacity: i < hearts ? 1 : 0.2 }}>♥</span>)}
        </div>
        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div style={{ height: '100%', background: barClr, borderRadius: 99 }}
            animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
        </div>
        <div style={{ fontSize: '0.82rem', color: T.gold, fontWeight: 700 }}>⚡{xp}</div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 3, gap: 2 }}>
          {['EN','தமிழ்'].map(l => (
            <button key={l} onClick={() => onLang(l === 'EN' ? 'en' : 'ta')}
              style={{ padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 700,
                background: (l === 'EN') === (lang === 'en') ? T.accent1 : 'transparent',
                color: (l === 'EN') === (lang === 'en') ? '#fff' : T.muted }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepLabel({ text, color }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 18 }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 800, color, letterSpacing: 3,
        textTransform: 'uppercase', background: `${color}15`, padding: '5px 16px', borderRadius: 99 }}>
        {text}
      </span>
    </div>
  )
}

function SpeakRow({ text, onTamil }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
      <button onClick={() => speak(text)}
        style={{ ...btn('ghost'), width: 'auto', padding: '8px 18px', fontSize: '0.82rem' }}>🔊 English</button>
      <button onClick={() => speak(text, 'en-US', 0.58)}
        style={{ ...btn('ghost'), width: 'auto', padding: '8px 18px', fontSize: '0.82rem' }}>🐢 Slow</button>
      {onTamil && (
        <button onClick={() => onTamil(text)}
          style={{ ...btn('ghost'), width: 'auto', padding: '8px 18px', fontSize: '0.82rem',
            color: '#f59e0b', borderColor: '#f59e0b50' }}>🎙 தமிழ்</button>
      )}
    </div>
  )
}

// ── Step 1: Intro ─────────────────────────────────────────────────────────────

function IntroStep({ lessonName, description, onNext }) {
  useEffect(() => {
    setTimeout(() => speak(`Today we learn about ${lessonName}. ${description}. Let us begin!`), 600)
  }, [])

  const steps = ['📝 Meaning & Use', '💬 Example Sentences', '✏️ Fill in Blank', '🧩 Arrange Words', '🌐 Translate']
  return (
    <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      style={{ ...glass(T.accent1, true), padding: '44px 32px', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
      <motion.div
        animate={{ scale: [1,1.1,1], filter: ['drop-shadow(0 0 8px #38bdf8)','drop-shadow(0 0 24px #38bdf8)','drop-shadow(0 0 8px #38bdf8)'] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        style={{ fontSize: 72, marginBottom: 20 }}>📖</motion.div>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: T.accent3, letterSpacing: 3, marginBottom: 12 }}>TODAY'S LESSON</div>
      <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: T.accent1, marginBottom: 12 }}>{lessonName}</h1>
      <p style={{ color: T.muted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 28, maxWidth: 340, margin: '0 auto 28px' }}>
        {description}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
        {steps.map((s, i) => (
          <span key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99,
            padding: '5px 14px', fontSize: '0.78rem', color: T.muted, border: '1px solid rgba(255,255,255,0.08)' }}>
            {s}
          </span>
        ))}
      </div>
      <button onClick={onNext} style={btn('primary')}>▶ Start Learning</button>
    </motion.div>
  )
}

// ── Step 2: Meaning & Use ──────────────────────────────────────────────────────

function MeaningStep({ word, lang, onNext }) {
  useEffect(() => {
    setTimeout(() => speak(`${word.wordName}. ${word.definitionEn}`), 700)
  }, [word])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <StepLabel text="Meaning & Use" color={T.accent3} />

      <div style={{ ...glass(T.accent3, true), padding: '30px 32px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', fontWeight: 900, color: T.accent3, letterSpacing: -1, marginBottom: 10 }}>
          {word.wordName}
        </div>
        {word.sentencePattern && (
          <div style={{ display: 'inline-block', background: 'rgba(129,140,248,0.12)',
            border: '1px solid #818cf840', borderRadius: 10, padding: '6px 18px',
            fontFamily: 'monospace', color: T.accent2, fontSize: '0.88rem', marginBottom: 18 }}>
            📐 {word.sentencePattern}
          </div>
        )}
        <p style={{ color: T.text, lineHeight: 1.8, fontSize: '1rem', margin: 0 }}>
          {lang === 'ta' ? word.definitionTa : word.definitionEn}
        </p>
      </div>

      {word.definitionTa && (
        <div style={{ ...glass(T.gold), padding: '16px 22px', marginBottom: 16 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: T.gold, letterSpacing: 2, marginBottom: 8 }}>
            தமிழ் பொருள் (TAMIL MEANING)
          </div>
          <p style={{ color: T.text, fontSize: '0.95rem', lineHeight: 1.7, margin: 0, fontFamily: "'Noto Sans Tamil', sans-serif" }}>{word.definitionTa}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
        <button onClick={() => speak(word.wordName)}
          style={{ ...btn('ghost'), width: 'auto', padding: '9px 22px', fontSize: '0.85rem' }}>
          🔊 Hear Word
        </button>
        <button onClick={() => speak(`${word.wordName}. ${word.definitionEn}`)}
          style={{ ...btn('ghost'), width: 'auto', padding: '9px 22px', fontSize: '0.85rem' }}>
          📖 Full Meaning
        </button>
      </div>

      <button onClick={onNext} style={btn('primary')}>Next: Example Sentence →</button>
    </motion.div>
  )
}

// ── Step 3: Example Sentence ───────────────────────────────────────────────────

function ExampleStep({ word, lang, onNext }) {
  useEffect(() => {
    setTimeout(() => speak(word.exampleEn), 700)
  }, [word])

  const highlight = (text) => {
    if (!word.wordName || !text) return text
    const parts = text.split(new RegExp(`(${word.wordName})`, 'gi'))
    return parts.map((p, i) =>
      p.toLowerCase() === word.wordName.toLowerCase()
        ? <span key={i} style={{ color: T.accent3, fontWeight: 800, textDecoration: 'underline',
            textDecorationStyle: 'dotted' }}>{p}</span>
        : p
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <StepLabel text="Example Sentence" color={T.accent1} />

      <div style={{ ...glass(T.accent1, true), padding: '28px 28px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: T.muted, letterSpacing: 2, marginBottom: 14 }}>ENGLISH EXAMPLE</div>
        <p style={{ color: T.text, fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
          "{highlight(word.exampleEn)}"
        </p>
        <SpeakRow text={word.exampleEn} onTamil={t => speakTamil(t)} />
      </div>

      {word.exampleTa && (
        <div style={{ ...glass(T.gold), padding: '18px 24px', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: T.gold, letterSpacing: 2, marginBottom: 10 }}>
            தமிழ் மொழிபெயர்ப்பு (TAMIL)
          </div>
          <p style={{ color: T.text, fontSize: '1rem', lineHeight: 1.7, margin: 0, fontFamily: "'Noto Sans Tamil', sans-serif" }}>{word.exampleTa}</p>
          <button onClick={() => speakTamil(word.exampleTa)}
            style={{ ...btn('ghost'), width: 'auto', padding: '7px 16px', fontSize: '0.8rem',
              marginTop: 12, color: T.gold, borderColor: '#f59e0b40' }}>🎙 Tamil Audio</button>
        </div>
      )}

      <div style={{ ...glass(T.accent2), padding: '14px 18px', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.3rem' }}>💡</span>
        <span style={{ color: T.accent2, fontSize: '0.88rem', lineHeight: 1.5 }}>
          Notice <strong style={{ color: T.accent3 }}>{word.wordName}</strong> in the sentence.
          {word.sentencePattern ? ` Pattern: ${word.sentencePattern}` : ''}
        </span>
      </div>

      <button onClick={onNext} style={btn('primary')}>Got it! Continue →</button>
    </motion.div>
  )
}

// ── Step 4: Fill in the Blank MCQ ────────────────────────────────────────────

function MCQStep({ q, lang, onCorrect, onWrong }) {
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => { setTimeout(() => speak(q.questionText), 400) }, [q])

  const check = () => {
    if (!selected) return
    setChecked(true)
    if (selected.isCorrect) {
      speak('Correct! Well done.')
      setTimeout(onCorrect, 2000)
    } else {
      speak('Not quite right. The correct answer is shown.')
      setTimeout(onWrong, 3000)
    }
  }

  const correctOpt = q.options?.find(o => o.isCorrect)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <StepLabel text="Fill in the Blank" color={T.accent2} />

      <div style={{ ...glass(T.accent2, true), padding: '24px 26px', marginBottom: 20 }}>
        <p style={{ color: T.text, fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.6, margin: '0 0 10px' }}>
          {q.questionText}
        </p>
        <button onClick={() => speak(q.questionText)}
          style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '0.8rem' }}>
          🔊 Hear question
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        {q.options?.map((opt, i) => {
          const label = ['A','B','C','D'][i]
          // API returns optionID (capital D) — normalise to handle both casings
          const oid = opt.optionID ?? opt.optionId ?? i
          const sid = selected ? (selected.optionID ?? selected.optionId ?? -1) : null
          let border = 'rgba(255,255,255,0.1)', bg = 'rgba(255,255,255,0.04)', color = T.text
          if (sid === oid && !checked) { bg='rgba(129,140,248,0.15)'; border=T.accent2; color=T.accent2 }
          if (checked && opt.isCorrect) { bg='rgba(52,211,153,0.15)'; border=T.accent3; color=T.accent3 }
          if (checked && sid === oid && !opt.isCorrect) { bg='rgba(248,113,113,0.15)'; border=T.danger; color=T.danger }
          return (
            <button key={oid} disabled={checked} onClick={() => setSelected(opt)}
              style={{ padding: '13px 20px', borderRadius: 14, border: `2px solid ${border}`,
                background: bg, color, fontWeight: 600, fontSize: '0.95rem', textAlign: 'left',
                cursor: checked ? 'default' : 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: `${border}20`,
                border: `1px solid ${border}`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.78rem', fontWeight: 800, flexShrink: 0 }}>
                {checked && opt.isCorrect ? '✓' : checked && sid === oid && !opt.isCorrect ? '✗' : label}
              </span>
              {opt.optionText}
            </button>
          )
        })}
      </div>

      {checked && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{ ...glass(selected?.isCorrect ? T.accent3 : T.danger), padding: '14px 18px',
            marginBottom: 16, color: selected?.isCorrect ? T.accent3 : T.danger, fontSize: '0.9rem', textAlign: 'center' }}>
          {selected?.isCorrect ? '✅ Correct! Great job!' : `❌ Correct answer: "${correctOpt?.optionText}"`}
        </motion.div>
      )}

      {!checked && (
        <button onClick={check} disabled={!selected}
          style={{ ...btn(selected ? 'primary' : 'ghost'), opacity: selected ? 1 : 0.45 }}>
          ✓ Check Answer
        </button>
      )}
    </motion.div>
  )
}

// ── Step 5a: Arrange Sentence ──────────────────────────────────────────────────

function ArrangeStep({ sentence, lang, onCorrect, onWrong }) {
  const correctText = sentence.correctSentence || sentence.correctAnswer || ''
  // Use pre-shuffled words from API if available, else split sentence
  const apiWords = sentence.words?.length
    ? sentence.words.map((w, i) => ({ id: w.wordID ?? i, text: w.wordText }))
    : correctText.split(' ').filter(Boolean).map((w, i) => ({ id: i, text: w }))

  const [bank, setBank] = useState(() => shuffle(apiWords))
  const [chosen, setChosen] = useState([])
  const [result, setResult] = useState(null)

  useEffect(() => {
    setBank(shuffle(apiWords))
    setChosen([]); setResult(null)
  }, [sentence])

  const pick = item => { setBank(b => b.filter(x => x.id !== item.id)); setChosen(c => [...c, item]) }
  const put  = item => { setChosen(c => c.filter(x => x.id !== item.id)); setBank(b => [...b, item]) }
  const reset = () => {
    setBank(shuffle([...apiWords]))
    setChosen([]); setResult(null)
  }

  const check = () => {
    const ans = chosen.map(x => x.text).join(' ')
    if (normalizeText(ans) === normalizeText(correctText)) {
      speak('Perfect! You arranged it correctly!')
      setResult('correct')
      setTimeout(onCorrect, 1800)
    } else {
      speak('Not quite right. The correct sentence is shown.')
      setResult('wrong')
      setTimeout(onWrong, 2800)
    }
  }

  // Also expose correctText for parent ReadStep
  sentence._correctText = correctText

  const Tile = ({ item, onClick, color }) => (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => onClick(item)}
      style={{ padding: '9px 16px', borderRadius: 10, border: `1.5px solid ${color}40`,
        background: `${color}10`, color, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {item.text}
    </motion.button>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <StepLabel text="Arrange the Sentence" color={T.gold} />

      {(sentence.sentencePattern || sentence.hintText) && (
        <div style={{ ...glass(T.accent2), padding: '10px 18px', marginBottom: 14, textAlign: 'center',
          fontFamily: 'monospace', color: T.accent2, fontSize: '0.85rem' }}>
          📐 Pattern: {sentence.sentencePattern || sentence.hintText}
        </div>
      )}

      <div style={{ ...glass(result === 'correct' ? T.accent3 : result === 'wrong' ? T.danger : T.accent1),
        padding: '16px 18px', marginBottom: 14, minHeight: 64,
        display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
        {chosen.length === 0
          ? <span style={{ color: T.muted, fontSize: '0.85rem', fontStyle: 'italic' }}>Tap words below to build the sentence…</span>
          : chosen.map(item => <Tile key={item.id} item={item} onClick={put}
              color={result === 'correct' ? T.accent3 : result === 'wrong' ? T.danger : T.accent1} />)
        }
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
        {bank.map(item => <Tile key={item.id} item={item} onClick={pick} color={T.accent2} />)}
      </div>

      {result === 'wrong' && (
        <div style={{ color: T.danger, fontSize: '0.88rem', textAlign: 'center', marginBottom: 14 }}>
          Correct: <em style={{ color: T.text, fontWeight: 600 }}>"{correctText}"</em>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={reset}
          style={{ ...btn('ghost'), flex: '0 0 auto', width: 'auto', padding: '12px 20px' }}>↺ Reset</button>
        <button onClick={() => speak(correctText)}
          style={{ ...btn('ghost'), flex: '0 0 auto', width: 'auto', padding: '12px 16px' }}>🔊</button>
        <button onClick={check} disabled={chosen.length === 0 || !!result}
          style={{ ...btn('primary'), flex: 1, opacity: chosen.length === 0 || result ? 0.45 : 1 }}>
          ✓ Check
        </button>
      </div>
    </motion.div>
  )
}

// ── Step 5b: Translate Sentence ──────────────────────────────────────────────

function TranslateStep({ sentence, onPass, onSkip }) {
  // Source: arrangesentence_lang — tamilMeaning is the Tamil prompt, correctSentence is the answer
  const tamil   = sentence.tamilMeaning || sentence.tamilmeaning || ''
  const correct = sentence.correctSentence || sentence.correctsentence || ''
  const [phase, setPhase]       = useState('idle')  // idle | listening | done
  const [result, setResult]     = useState(null)     // null | 'pass' | 'fail'
  const [attempts, setAttempts] = useState(0)
  const [msg, setMsg]           = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const MAX_ATTEMPTS = 3

  useEffect(() => {
    setTimeout(() => speak('Read the Tamil sentence and say the English translation.', 'en-US', 0.9), 400)
  }, [tamil])

  const go = async () => {
    if (phase === 'listening') return
    setPhase('listening'); setMsg('Listening… Speak your English translation!'); setResult(null); setShowAnswer(false)
    try {
      const transcript = await listen()
      const n1 = normalizeText(transcript)
      const n2 = normalizeText(correct)
      const words2 = n2.split(' ').filter(Boolean)
      const ok = n1 === n2 || n1.includes(n2) ||
        words2.filter(w => n1.includes(w)).length >= Math.ceil(words2.length * 0.7)
      setResult(ok ? 'pass' : 'fail')
      setPhase('done')
      setAttempts(a => a + 1)
      if (ok) {
        speak('Excellent! Perfect translation!')
        setTimeout(onPass, 1800)
      } else {
        speak('Good try! Listen to the correct answer and try again.')
        setMsg(`You said: "${transcript}"`)
        speak(correct)
      }
    } catch (e) {
      setPhase('idle')
      setMsg(e.message || 'Could not hear. Please try again.')
    }
  }

  const tryAgain = () => { setPhase('idle'); setResult(null); setMsg(''); setShowAnswer(false) }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <StepLabel text="Translate to English" color={T.gold} />

      {/* Tamil sentence to translate */}
      <div style={{ ...glass(T.gold, true), padding: '28px 28px', marginBottom: 18, textAlign: 'center' }}>
        <div style={{ fontSize: '0.68rem', color: T.gold, letterSpacing: 3, marginBottom: 12, fontWeight: 800 }}>
          READ IN TAMIL — SAY IN ENGLISH
        </div>
        <p style={{ color: T.gold, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.6, margin: '0 0 16px', fontFamily: "'Noto Sans Tamil', sans-serif" }}>
          {tamil}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => speakTamil(tamil)}
            style={{ ...btn('ghost'), width: 'auto', padding: '8px 18px', fontSize: '0.82rem',
              color: T.gold, borderColor: '#f59e0b40' }}>🎙 Hear Tamil</button>
          <button onClick={() => setShowAnswer(a => !a)}
            style={{ ...btn('ghost'), width: 'auto', padding: '8px 18px', fontSize: '0.82rem' }}>
            {showAnswer ? '🙈 Hide Answer' : '💡 Hint'}
          </button>
        </div>
        {showAnswer && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 14, padding: '10px 16px', background: 'rgba(251,191,36,.1)',
              borderRadius: 10, color: T.text, fontSize: '1rem', fontStyle: 'italic' }}>
            "{correct}"
          </motion.div>
        )}
      </div>

      {/* Instruction */}
      <div style={{ ...glass(T.accent2), padding: '12px 18px', marginBottom: 18, textAlign: 'center',
        color: T.muted, fontSize: '0.85rem' }}>
        🎤 Translate the Tamil sentence to English and speak it aloud
      </div>

      {!isSpeechRecognitionSupported() ? (
        <div style={{ ...glass(T.orange), padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
          <p style={{ color: T.orange, fontWeight: 700, marginBottom: 6 }}>🎙 Voice input requires Chrome or Edge</p>
          <button onClick={onSkip} style={{ ...btn('ghost'), width: 'auto', padding: '8px 20px', marginTop: 10 }}>Skip →</button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <motion.button onClick={phase !== 'listening' ? go : undefined}
            animate={phase === 'listening' ? { scale: [1,1.12,1], boxShadow: ['0 0 0 0 rgba(251,191,36,0)','0 0 0 18px rgba(251,191,36,0.2)','0 0 0 0 rgba(251,191,36,0)'] } : {}}
            transition={{ duration: 1.2, repeat: phase === 'listening' ? Infinity : 0 }}
            style={{ width: 90, height: 90, borderRadius: '50%', border: 'none',
              cursor: phase === 'listening' ? 'default' : 'pointer', fontSize: '2rem',
              background: phase === 'listening' ? 'linear-gradient(135deg,#fbbf24,#f59e0b)'
                : result === 'pass' ? 'linear-gradient(135deg,#34d399,#059669)'
                : result === 'fail' ? 'linear-gradient(135deg,#f87171,#dc2626)'
                : 'linear-gradient(135deg,#38bdf8,#818cf8)',
              color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            {phase === 'listening' ? '👂' : result === 'pass' ? '✅' : result === 'fail' ? '❌' : '🎤'}
          </motion.button>

          {msg && <p style={{ color: T.muted, fontSize: '0.85rem', marginTop: 12 }}>{msg}</p>}
        </div>
      )}

      {result === 'pass' && (
        <div style={{ ...glass(T.accent3), padding: '14px 20px', textAlign: 'center',
          color: T.accent3, fontWeight: 700, marginBottom: 12 }}>
          ✅ Correct! "{correct}"
        </div>
      )}

      {result === 'fail' && phase === 'done' && (
        <div style={{ ...glass(T.danger), padding: '14px 20px', marginBottom: 16 }}>
          <p style={{ color: T.danger, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Not quite right</p>
          <p style={{ color: T.text, fontSize: '0.88rem', textAlign: 'center' }}>
            Correct: <em style={{ color: T.accent3, fontWeight: 600 }}>"{correct}"</em>
          </p>
          <button onClick={() => speak(correct)}
            style={{ ...btn('ghost'), marginTop: 10, padding: '8px 18px', width: 'auto', fontSize: '0.82rem' }}>
            🔊 Hear Correct Answer
          </button>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {attempts < MAX_ATTEMPTS ? (
              <button onClick={tryAgain} style={btn('outline')}>
                🔁 Try Again ({MAX_ATTEMPTS - attempts} left)
              </button>
            ) : (
              <button onClick={onSkip} style={{ ...btn('ghost'), color: T.muted }}>Skip →</button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── Step 5c: Read Aloud (legacy, kept for retry queue) ───────────────────────

function ReadStep({ sentence, lang, onPass, onSkip }) {
  const text = sentence.correctSentence || sentence.correctAnswer || sentence.sentenceText || ''
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [msg, setMsg] = useState('')
  const [diff, setDiff] = useState(null)
  const MAX_ATTEMPTS = 3

  const go = async () => {
    if (phase === 'listening') return
    setPhase('listening'); setMsg('Listening… Speak now!'); setDiff(null); setResult(null)
    try {
      const transcript = await listen()
      const n1 = normalizeText(transcript)
      const n2 = normalizeText(text)
      const words2 = n2.split(' ').filter(Boolean)
      const ok = n1 === n2 || n1.includes(n2) ||
        words2.filter(w => n1.includes(w)).length >= Math.ceil(words2.length * 0.7)
      setDiff(diffWords(transcript, text))
      setResult(ok ? 'pass' : 'fail')
      setPhase('done')
      setAttempts(a => a + 1)
      if (ok) {
        speak('Excellent pronunciation!')
        setTimeout(onPass, 1800)
      } else {
        speak('Good try! Listen and speak again.')
        setMsg(`You said: "${transcript}"`)
      }
    } catch (e) {
      setPhase('idle')
      setMsg(e.message || 'Could not hear. Please try again.')
    }
  }

  const tryAgain = () => { setPhase('idle'); setResult(null); setDiff(null); setMsg('') }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <StepLabel text="Read Aloud" color={T.danger} />

      <div style={{ ...glass(T.accent1, true), padding: '28px 28px', marginBottom: 18, textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: T.muted, letterSpacing: 2, marginBottom: 14 }}>SAY THIS SENTENCE</div>
        <p style={{ color: T.text, fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.6, marginBottom: 16, margin: '0 0 16px' }}>
          {text}
        </p>
        {lang === 'ta' && sentence.translationTa && (
          <p style={{ color: T.gold, fontSize: '0.9rem', marginBottom: 12 }}>{sentence.translationTa}</p>
        )}
        <SpeakRow text={text} onTamil={sentence.translationTa ? () => speakTamil(sentence.translationTa) : null} />
      </div>

      {!isSpeechRecognitionSupported() ? (
        <div style={{ ...glass(T.orange), padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
          <p style={{ color: T.orange, fontWeight: 700, marginBottom: 6 }}>🎙 Voice input requires Chrome or Edge</p>
          <p style={{ color: T.muted, fontSize: '0.85rem' }}>Listen to the sentence, practice it, then tap Skip to continue.</p>
          <button onClick={onSkip} style={{ ...btn('ghost'), width: 'auto', padding: '8px 20px', marginTop: 10 }}>
            Skip this step →
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <motion.button
            onClick={phase !== 'listening' ? go : undefined}
            animate={phase === 'listening' ? { scale: [1,1.12,1], boxShadow: ['0 0 0 0 rgba(248,113,113,0)','0 0 0 18px rgba(248,113,113,0.15)','0 0 0 0 rgba(248,113,113,0)'] } : {}}
            transition={{ duration: 1.2, repeat: phase === 'listening' ? Infinity : 0 }}
            style={{ width: 90, height: 90, borderRadius: '50%', border: 'none',
              cursor: phase === 'listening' ? 'default' : 'pointer', fontSize: '2rem',
              background: phase === 'listening' ? 'linear-gradient(135deg,#f87171,#dc2626)'
                : result === 'pass' ? 'linear-gradient(135deg,#34d399,#059669)'
                : 'linear-gradient(135deg,#38bdf8,#818cf8)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {phase === 'listening' ? '⏸' : result === 'pass' ? '✓' : '🎙'}
          </motion.button>
          {phase === 'idle' && !result && (
            <p style={{ color: T.muted, fontSize: '0.82rem', marginTop: 10 }}>Tap mic to speak</p>
          )}
          {phase === 'listening' && (
            <p style={{ color: T.danger, fontSize: '0.85rem', marginTop: 10, fontWeight: 600 }}>Recording… speak clearly!</p>
          )}
        </div>
      )}

      {msg && <p style={{ textAlign: 'center', color: result === 'pass' ? T.accent3 : T.muted, fontSize: '0.9rem', marginBottom: 10 }}>{msg}</p>}

      {diff && result === 'fail' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', justifyContent: 'center', marginBottom: 14 }}>
          {diff.map((d, i) => (
            <span key={i} style={{ padding: '4px 10px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600,
              background: d.correct ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
              color: d.correct ? T.accent3 : T.danger,
              border: `1px solid ${d.correct ? T.accent3 : T.danger}40` }}>
              {d.correct ? '✓' : '✗'} {d.word}
            </span>
          ))}
        </div>
      )}

      {result === 'fail' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {attempts < MAX_ATTEMPTS ? (
            <button onClick={tryAgain} style={btn('outline')}>
              🔁 Try Again ({MAX_ATTEMPTS - attempts} left)
            </button>
          ) : (
            <button onClick={onSkip} style={{ ...btn('ghost'), color: T.muted }}>
              Skip for now →
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ── Retry Banner ──────────────────────────────────────────────────────────────

function RetryBanner({ count, onStart }) {
  useEffect(() => { speak(`You had ${count} mistake${count > 1 ? 's' : ''}. Let us practice them again.`) }, [])
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      style={{ ...glass(T.orange, true), padding: '48px 36px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ fontSize: '4rem', marginBottom: 20 }}>🔄</div>
      <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: T.orange, marginBottom: 14 }}>Practice Mistakes!</h2>
      <p style={{ color: T.muted, fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 32 }}>
        You had <span style={{ color: T.orange, fontWeight: 800 }}>{count} mistake{count > 1 ? 's' : ''}</span>.
        Let's go through them again to complete the lesson.
      </p>
      <button onClick={onStart} style={btn('orange')}>▶ Practice Again</button>
    </motion.div>
  )
}

// ── Completion ────────────────────────────────────────────────────────────────

function CompletionScreen({ xp, perfect, onDone }) {
  useEffect(() => {
    speak(perfect
      ? 'Perfect score! No mistakes! You are amazing!'
      : 'Lesson complete! Great work! You practiced everything!')
  }, [])

  return (
    <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
      style={{ ...glass(T.gold, true), padding: '52px 36px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <motion.div animate={{ rotate: [0,10,-10,0] }} transition={{ duration: 0.6, delay: 0.3 }}
        style={{ fontSize: '4.5rem', marginBottom: 20 }}>
        {perfect ? '🏆' : '🎯'}
      </motion.div>
      <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: T.gold, marginBottom: 10 }}>Lesson Complete!</h2>
      {perfect && (
        <div style={{ background: 'rgba(251,191,36,0.1)', borderRadius: 10, padding: '8px 20px',
          color: T.gold, fontWeight: 700, fontSize: '0.9rem', marginBottom: 16 }}>
          ⭐ Perfect Score — No Mistakes!
        </div>
      )}
      <p style={{ color: T.muted, fontSize: '0.95rem', marginBottom: 32 }}>
        You earned <span style={{ color: T.gold, fontWeight: 800 }}>+{xp} XP</span>!
      </p>
      <button onClick={onDone} style={btn('gold')}>← Back to Lessons</button>
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LessonPlay() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const { state: routeState } = useLocation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [lessonInfo, setLessonInfo] = useState({ name: '', description: '' })
  const [mainQueue, setMainQueue] = useState([])
  const [retryQueue, setRetryQueue] = useState([])

  const [phase, setPhase] = useState('main') // main | retry_banner | retry | complete
  const [cursor, setCursor] = useState(0)
  const [retryCursor, setRetryCursor] = useState(0)
  const [wrongItems, setWrongItems] = useState([])

  const [hearts, setHearts] = useState(3)
  const [xp, setXp] = useState(0)
  const [lang, setLang] = useState('en')
  const [perfect, setPerfect] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [wc, mcq, arr] = await Promise.all([
        getWordContent(lessonId, LANG).then(r => r.data ?? []).catch(() => []),
        getMeaningQuestionsAdmin(lessonId, LANG).then(r => r.data ?? []).catch(() => []),
        getArrangeSentences(lessonId, LANG).then(r => r.data ?? []).catch(() => []),
      ])

      // Always fetch lesson name from API (route state may be absent on direct URL access)
      let name = routeState?.lessonName || `Lesson ${lessonId}`
      let desc = routeState?.description || 'Master this topic step by step'

      try {
        const res = await getLessons(LANG)
        const found = (res.data ?? []).find(l => l.lessonID == lessonId || l.lessonId == lessonId)
        if (found) {
          name = found.lessonName || found.name || name
          desc = found.description || desc
        }
      } catch {}

      setLessonInfo({ name, description: desc })

      const q = [{ type: 'intro' }]

      // Meaning + Example for each word content
      wc.slice(0, 5).forEach(w => {
        q.push({ type: 'meaning', data: w })
        q.push({ type: 'example', data: w })
      })

      // Fill in blank MCQ
      shuffle(mcq).slice(0, MAX_MCQ).forEach(m => q.push({ type: 'mcq', data: m }))

      // Arrange + Read Aloud (as original)
      shuffle(arr).slice(0, MAX_ARR).forEach(a => {
        q.push({ type: 'arrange', data: a })
        q.push({ type: 'read', data: a })
      })

      // Translate (speech): use arrange sentences that have tamilMeaning
      const withTamil = arr.filter(a => a.tamilMeaning || a.tamilmeaning)
      const MAX_TR = 3
      shuffle(withTamil).slice(0, MAX_TR).forEach(a => {
        q.push({ type: 'translate', data: a })
      })

      // Voice translation from word content: Tamil example → speak English (same TranslateStep)
      const withBoth = wc.filter(w => w.exampleTa && w.exampleEn)
      shuffle(withBoth).slice(0, 3).forEach(w => {
        q.push({ type: 'translate', data: {
          tamilMeaning: w.exampleTa,
          correctSentence: w.exampleEn,
        }})
      })

      setMainQueue(q)
      setLoading(false)
    }
    load()
  }, [lessonId])

  const advanceMain = () => {
    if (cursor + 1 >= mainQueue.length) {
      if (wrongItems.length > 0) {
        setPhase('retry_banner')
      } else {
        setPhase('complete')
      }
    } else {
      setCursor(c => c + 1)
    }
  }

  const advanceRetry = () => {
    if (retryCursor + 1 >= retryQueue.length) {
      setPhase('complete')
    } else {
      setRetryCursor(c => c + 1)
    }
  }

  const addWrong = (step) => {
    setPerfect(false)
    setHearts(h => Math.max(0, h - 1))
    const items = [step]
    setWrongItems(w => [...w, ...items])
  }

  const startRetry = () => {
    setRetryQueue([...wrongItems])
    setWrongItems([])
    setRetryCursor(0)
    setPhase('retry')
  }

  const gainXp = pts => setXp(x => x + pts)

  useEffect(() => {
    if (phase === 'complete') {
      updateStreak({ userId: user?.id || 0, xpEarned: xp }).catch(() => {})
    }
  }, [phase])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AuraBg />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <motion.div animate={{ scale: [1,1.1,1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ fontSize: 56, marginBottom: 16 }}>📖</motion.div>
          <p style={{ color: T.muted }}>Loading lesson…</p>
        </div>
      </div>
    )
  }

  const isRetry = phase === 'retry'
  const currentStep = isRetry ? retryQueue[retryCursor] : mainQueue[cursor]
  const currentCursor = isRetry ? retryCursor : cursor
  const totalSteps = isRetry ? retryQueue.length : mainQueue.length
  const doNext = isRetry ? advanceRetry : advanceMain

  if (phase === 'complete') {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AuraBg />
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <CompletionScreen xp={xp} perfect={perfect} onDone={() => navigate('/lessons')} />
        </div>
      </div>
    )
  }

  if (phase === 'retry_banner') {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AuraBg />
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <RetryBanner count={wrongItems.length} onStart={startRetry} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <AuraBg />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <TopBar hearts={hearts} xp={xp} step={currentCursor} total={totalSteps}
          lang={lang} onLang={setLang} onExit={() => navigate('/lessons')} phase={phase} />

        <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 18px 80px' }}>
          {isRetry && (
            <div style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)',
              borderRadius: 12, padding: '10px 18px', marginBottom: 20,
              color: T.orange, fontSize: '0.85rem', textAlign: 'center', fontWeight: 700 }}>
              🔄 Practice Round — {retryCursor + 1} of {retryQueue.length}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={`${phase}-${currentCursor}`}
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>

              {currentStep?.type === 'intro' && (
                <IntroStep lessonName={lessonInfo.name} description={lessonInfo.description} onNext={doNext} />
              )}
              {currentStep?.type === 'meaning' && (
                <MeaningStep word={currentStep.data} lang={lang} onNext={doNext} />
              )}
              {currentStep?.type === 'example' && (
                <ExampleStep word={currentStep.data} lang={lang} onNext={doNext} />
              )}
              {currentStep?.type === 'mcq' && (
                <MCQStep q={currentStep.data} lang={lang}
                  onCorrect={() => { gainXp(10); doNext() }}
                  onWrong={() => { addWrong(currentStep); doNext() }} />
              )}
              {currentStep?.type === 'arrange' && (
                <ArrangeStep sentence={currentStep.data} lang={lang}
                  onCorrect={() => { gainXp(15); doNext() }}
                  onWrong={() => { addWrong(currentStep); doNext() }} />
              )}
              {currentStep?.type === 'translate' && (
                <TranslateStep sentence={currentStep.data}
                  onPass={() => { gainXp(20); doNext() }}
                  onSkip={doNext} />
              )}
              {currentStep?.type === 'read' && (
                <ReadStep sentence={currentStep.data} lang={lang}
                  onPass={() => { gainXp(20); doNext() }}
                  onSkip={doNext} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
