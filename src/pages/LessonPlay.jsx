import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getMeaningQuestions, getArrangeSentences, getReadingSentences,
  getWordContent, saveAnswer, updateStreak
} from '../services/api'
import { speak, speakWordByWord, speakTamil, listen, normalizeText, diffWords } from '../services/speechUtils'
import { useAuth } from '../context/AuthContext'

const LANG = 1
const MAX_MCQ = 5
const MAX_ARR = 5
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)

function matchVoice(transcript, target) {
  const n1 = normalizeText(transcript)
  const n2 = normalizeText(target)
  if (n1 === n2 || n1.includes(n2)) return true
  const words = n2.split(' ').filter(Boolean)
  return words.filter(w => n1.includes(w)).length >= Math.ceil(words.length * 0.7)
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:      '#080c14',
  card:    'rgba(12,20,36,0.95)',
  border:  'rgba(99,179,237,0.15)',
  accent1: '#38bdf8',
  accent2: '#818cf8',
  accent3: '#34d399',
  danger:  '#f87171',
  gold:    '#fbbf24',
  text:    '#e2e8f0',
  muted:   '#64748b',
}

const glass = (tint = T.accent1, glow = false) => ({
  background: `linear-gradient(135deg, rgba(12,20,36,0.97) 0%, rgba(15,25,45,0.95) 100%)`,
  border: `1px solid ${tint}30`,
  borderRadius: 20,
  boxShadow: glow ? `0 0 32px ${tint}22, inset 0 1px 0 ${tint}20` : `0 4px 24px rgba(0,0,0,0.4)`,
  backdropFilter: 'blur(16px)',
})

const btn = (variant = 'primary') => {
  const v = {
    primary:  { background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', border: 'none' },
    success:  { background: 'linear-gradient(135deg,#34d399,#059669)', color: '#fff', border: 'none' },
    danger:   { background: 'linear-gradient(135deg,#f87171,#dc2626)', color: '#fff', border: 'none' },
    ghost:    { background: 'rgba(255,255,255,0.05)', color: T.text, border: `1px solid rgba(255,255,255,0.12)` },
    outline:  { background: 'transparent', color: T.accent1, border: `1.5px solid ${T.accent1}` },
    gold:     { background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1a1a00', border: 'none' },
  }[variant]
  return {
    ...v, padding: '13px 28px', borderRadius: 14, fontWeight: 700,
    fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.18s',
    width: '100%', display: 'block', textAlign: 'center',
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function TopBar({ hearts, xp, step, total, onLang, lang, onExit }) {
  const pct = total > 0 ? (step / total) * 100 : 0
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(8,12,20,0.92)',
      backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,179,237,0.1)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Exit button */}
        <button onClick={onExit}
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, color: '#64748b', cursor: 'pointer', fontSize: '1rem',
            padding: '4px 10px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        {/* Hearts */}
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} style={{ fontSize: '1.2rem', opacity: i < hearts ? 1 : 0.2 }}>♥</span>
          ))}
        </div>
        {/* Progress bar */}
        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#818cf8)', borderRadius: 99 }}
            animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
        </div>
        {/* XP */}
        <div style={{ fontSize: '0.82rem', color: T.gold, fontWeight: 700, whiteSpace: 'nowrap' }}>⚡{xp}</div>
        {/* Lang toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 3, gap: 2 }}>
          {['EN','தமிழ்'].map(l => (
            <button key={l} onClick={() => onLang(l === 'EN' ? 'en' : 'ta')}
              style={{ padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                background: (l === 'EN') === (lang === 'en') ? T.accent1 : 'transparent',
                color: (l === 'EN') === (lang === 'en') ? '#fff' : T.muted }}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Gem({ color = '#38bdf8', size = 52, animate = false }) {
  return (
    <motion.div
      animate={animate ? { scale: [1, 1.08, 1], filter: [`drop-shadow(0 0 8px ${color})`, `drop-shadow(0 0 18px ${color})`, `drop-shadow(0 0 8px ${color})`] } : {}}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      style={{ fontSize: size, display: 'inline-block', lineHeight: 1 }}>
      💎
    </motion.div>
  )
}

function SpeakRow({ text, lang, onTamilSpeak }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
      <button onClick={() => speak(text)}
        style={{ ...btn('ghost'), width: 'auto', padding: '8px 18px', fontSize: '0.82rem' }}>🔊 English</button>
      <button onClick={() => speak(text, 'en-US', 0.58)}
        style={{ ...btn('ghost'), width: 'auto', padding: '8px 18px', fontSize: '0.82rem' }}>🐢 Slow</button>
      <button onClick={() => onTamilSpeak?.(text)}
        style={{ ...btn('ghost'), width: 'auto', padding: '8px 18px', fontSize: '0.82rem', color: '#f59e0b', borderColor: '#f59e0b50' }}>
        🎙 தமிழ்
      </button>
    </div>
  )
}

function WordByWordDiff({ diff }) {
  if (!diff?.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', justifyContent: 'center', marginTop: 14 }}>
      {diff.map((d, i) => (
        <span key={i} style={{
          padding: '4px 10px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
          background: d.correct ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
          color: d.correct ? T.accent3 : T.danger,
          border: `1px solid ${d.correct ? T.accent3 : T.danger}40`,
        }}>{d.correct ? '✓' : '✗'} {d.word}</span>
      ))}
    </div>
  )
}

function HintPanel({ pattern }) {
  const [open, setOpen] = useState(false)
  if (!pattern) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ ...btn('outline'), width: 'auto', padding: '7px 16px', fontSize: '0.8rem', margin: '0 auto', display: 'block' }}>
        {open ? '▲' : '💡'} Pattern Hint
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ ...glass(T.accent2), padding: '12px 18px', marginTop: 10, textAlign: 'center', color: T.accent2, fontFamily: 'monospace', fontSize: '0.88rem', letterSpacing: 0.5 }}>
            {pattern}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Step screens ─────────────────────────────────────────────────────────────

function IntroStep({ lessonName, onNext }) {
  useEffect(() => {
    setTimeout(() => speak(`Welcome! Today we will learn about ${lessonName}. Let us begin!`), 600)
  }, [lessonName])

  return (
    <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      style={{ ...glass(T.accent1, true), padding: '40px 28px', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
      <Gem animate size={68} />
      <h1 style={{ fontSize: '2rem', fontWeight: 900, color: T.accent1, marginTop: 20, marginBottom: 8 }}>
        Let's Start!
      </h1>
      <p style={{ color: T.muted, fontSize: '0.95rem', marginBottom: 10 }}>{lessonName}</p>
      <p style={{ color: T.text, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 28, maxWidth: 340, margin: '0 auto 28px' }}>
        Speak clearly. Listen carefully. Take your time — you have got this! 🎯
      </p>
      <button onClick={onNext} style={btn('primary')}>Begin ▶</button>
    </motion.div>
  )
}

function DefinitionStep({ word, lang, onNext, onTamilSpeak }) {
  useEffect(() => { setTimeout(() => speak(word.exampleEn), 700) }, [word])
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: T.accent3, letterSpacing: 3, textTransform: 'uppercase' }}>Word of the Day</span>
      </div>
      {/* Word name card */}
      <div style={{ ...glass(T.accent3, true), padding: '24px 28px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: T.accent3, marginBottom: 6 }}>{word.wordName}</div>
        <div style={{ fontFamily: 'monospace', color: T.accent2, fontSize: '0.85rem', marginBottom: 14 }}>
          📐 {word.sentencePattern}
        </div>
        <div style={{ color: T.text, lineHeight: 1.7, fontSize: '0.93rem' }}>
          {lang === 'ta' ? word.definitionTa : word.definitionEn}
        </div>
      </div>
      {/* Example card */}
      <div style={{ ...glass(T.accent1), padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ fontSize: '0.72rem', color: T.muted, fontWeight: 700, marginBottom: 10, letterSpacing: 2 }}>EXAMPLE</div>
        <div style={{ fontSize: '1.05rem', color: T.text, fontStyle: 'italic', marginBottom: 6 }}>"{word.exampleEn}"</div>
        {lang === 'ta' && <div style={{ color: T.gold, fontSize: '0.9rem' }}>{word.exampleTa}</div>}
        <SpeakRow text={word.exampleEn} onTamilSpeak={onTamilSpeak} />
      </div>
      <button onClick={onNext} style={btn('primary')}>Next →</button>
    </motion.div>
  )
}

function MCQStep({ q, lang, onCorrect, onWrong }) {
  const [selected, setSelected] = useState(null)
  const [checked,  setChecked]  = useState(false)
  const [timer,    setTimer]    = useState(null)

  useEffect(() => { setTimeout(() => speak(q.questionText), 400) }, [q])

  const check = () => {
    if (!selected) return
    setChecked(true)
    if (selected.isCorrect) {
      speak('Correct! Well done.')
      const t = setTimeout(onCorrect, 2500)
      setTimer(t)
    } else {
      speak('Not quite. Try again next time.')
      const t = setTimeout(onWrong, 3000)
      setTimer(t)
    }
  }

  useEffect(() => () => { if (timer) clearTimeout(timer) }, [timer])

  const explanation = checked
    ? selected?.isCorrect
      ? `✅ Correct! "${q.options?.find(o => o.isCorrect)?.optionText}" is the right answer.`
      : `❌ "${q.options?.find(o => o.isCorrect)?.optionText}" was correct.`
    : null

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: T.accent2, letterSpacing: 3, textTransform: 'uppercase' }}>Quiz</span>
      </div>
      <div style={{ ...glass(T.accent2, true), padding: '22px 24px', marginBottom: 20 }}>
        <p style={{ color: T.text, fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.55, margin: 0 }}>
          {q.questionText}
        </p>
        <button onClick={() => speak(q.questionText)}
          style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '0.8rem', marginTop: 8 }}>
          🔊 Hear question
        </button>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        {q.options?.map(opt => {
          let bg = 'rgba(255,255,255,0.04)'
          let border = 'rgba(255,255,255,0.1)'
          let color = T.text
          if (selected?.optionId === opt.optionId && !checked) { bg = 'rgba(56,189,248,0.12)'; border = T.accent1; color = T.accent1 }
          if (checked && opt.isCorrect)  { bg = 'rgba(52,211,153,0.15)'; border = T.accent3; color = T.accent3 }
          if (checked && selected?.optionId === opt.optionId && !opt.isCorrect) { bg = 'rgba(248,113,113,0.15)'; border = T.danger; color = T.danger }
          return (
            <button key={opt.optionId} disabled={checked}
              onClick={() => setSelected(opt)}
              style={{ padding: '14px 20px', borderRadius: 14, border: `2px solid ${border}`,
                background: bg, color, fontWeight: 600, fontSize: '0.95rem',
                textAlign: 'left', cursor: checked ? 'default' : 'pointer', transition: 'all 0.15s' }}>
              {opt.optionText}
            </button>
          )
        })}
      </div>

      {explanation && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{ ...glass(selected?.isCorrect ? T.accent3 : T.danger), padding: '14px 18px', marginBottom: 16,
            color: selected?.isCorrect ? T.accent3 : T.danger, fontSize: '0.9rem', textAlign: 'center' }}>
          {explanation}
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

function ArrangeStep({ sentence, lang, onCorrect, onWrong, onTamilSpeak }) {
  const words = sentence.correctAnswer?.split(' ').filter(Boolean) ?? []
  const [bank,    setBank]    = useState(() => shuffle(words.map((w, i) => ({ id: i, text: w }))))
  const [chosen,  setChosen]  = useState([])
  const [result,  setResult]  = useState(null)

  useEffect(() => {
    setBank(shuffle(words.map((w, i) => ({ id: i, text: w }))))
    setChosen([])
    setResult(null)
  }, [sentence])

  const pick = (item) => { setBank(b => b.filter(x => x.id !== item.id)); setChosen(c => [...c, item]) }
  const put  = (item) => { setChosen(c => c.filter(x => x.id !== item.id)); setBank(b => [...b, item]) }
  const reset = () => { setBank(shuffle(words.map((w, i) => ({ id: i, text: w })))); setChosen([]); setResult(null) }

  const check = () => {
    const ans = chosen.map(x => x.text).join(' ')
    if (normalizeText(ans) === normalizeText(sentence.correctAnswer)) {
      speak('Perfect sentence!'); setResult('correct'); setTimeout(onCorrect, 2000)
    } else {
      speak('Not quite right.'); setResult('wrong'); setTimeout(onWrong, 2500)
    }
  }

  const WordTile = ({ item, onClick, color }) => (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
      onClick={() => onClick(item)}
      style={{ padding: '9px 16px', borderRadius: 10, border: `1.5px solid ${color}40`,
        background: `${color}10`, color, fontWeight: 600, fontSize: '0.9rem',
        cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
      {item.text}
    </motion.button>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: T.gold, letterSpacing: 3, textTransform: 'uppercase' }}>Arrange</span>
      </div>
      <HintPanel pattern={sentence.sentencePattern || sentence.hintText} />

      {/* Chosen area */}
      <div style={{ ...glass(result === 'correct' ? T.accent3 : result === 'wrong' ? T.danger : T.accent1),
        padding: '16px 18px', marginBottom: 14, minHeight: 64,
        display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
        {chosen.length === 0
          ? <span style={{ color: T.muted, fontSize: '0.85rem', fontStyle: 'italic' }}>Tap words below to build the sentence…</span>
          : chosen.map(item => <WordTile key={item.id} item={item} onClick={put} color={
              result === 'correct' ? T.accent3 : result === 'wrong' ? T.danger : T.accent1} />)
        }
      </div>

      {/* Word bank */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
        {bank.map(item => <WordTile key={item.id} item={item} onClick={pick} color={T.accent2} />)}
      </div>

      {result === 'wrong' && (
        <div style={{ color: T.danger, fontSize: '0.88rem', textAlign: 'center', marginBottom: 12 }}>
          Correct: <em style={{ color: T.text }}>{sentence.correctAnswer}</em>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={reset} style={{ ...btn('ghost'), flex: '0 0 auto', width: 'auto', padding: '12px 20px' }}>↺ Reset</button>
        <button onClick={() => speakWordByWord(sentence.correctAnswer)} style={{ ...btn('ghost'), flex: '0 0 auto', width: 'auto', padding: '12px 16px' }}>💡</button>
        <button onClick={check} disabled={chosen.length === 0 || result}
          style={{ ...btn('primary'), flex: 1, opacity: chosen.length === 0 || result ? 0.45 : 1 }}>
          ✓ Check
        </button>
      </div>
    </motion.div>
  )
}

function VoiceStep({ sentence, lang, onPass, onFail, onTamilSpeak }) {
  const [phase,  setPhase]  = useState('idle')   // idle | listening | done
  const [result, setResult] = useState(null)
  const [diff,   setDiff]   = useState(null)
  const [msg,    setMsg]    = useState('')

  const go = async () => {
    setPhase('listening'); setMsg('Listening…'); setDiff(null); setResult(null)
    try {
      const transcript = await listen()
      const ok = matchVoice(transcript, sentence.sentenceText)
      setDiff(diffWords(transcript, sentence.sentenceText))
      setResult(ok ? 'pass' : 'fail')
      setPhase('done')
      if (ok) { speak('Excellent! Great pronunciation!'); setTimeout(onPass, 2000) }
      else    { speak('Close! Review the highlighted words.') }
      setMsg(ok ? 'Excellent!' : `You said: "${transcript}"`)
    } catch (e) {
      setPhase('idle')
      setMsg(e.message || 'Could not hear you. Try again.')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: T.danger, letterSpacing: 3, textTransform: 'uppercase' }}>Speak</span>
      </div>
      <div style={{ ...glass(T.accent1, true), padding: '24px 28px', marginBottom: 18, textAlign: 'center' }}>
        <p style={{ color: T.muted, fontSize: '0.8rem', marginBottom: 8, letterSpacing: 1 }}>READ ALOUD</p>
        <p style={{ color: T.text, fontSize: '1.12rem', fontWeight: 600, lineHeight: 1.6 }}>
          {sentence.sentenceText}
        </p>
        {lang === 'ta' && sentence.translationTa &&
          <p style={{ color: T.gold, fontSize: '0.88rem', marginTop: 8 }}>{sentence.translationTa}</p>}
        <SpeakRow text={sentence.sentenceText} onTamilSpeak={onTamilSpeak} />
      </div>

      {/* Mic button */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <motion.button
          onClick={phase === 'idle' ? go : undefined}
          animate={phase === 'listening' ? { scale: [1, 1.1, 1], boxShadow: ['0 0 0 0 rgba(248,113,113,0)', '0 0 0 18px rgba(248,113,113,0.15)', '0 0 0 0 rgba(248,113,113,0)'] } : {}}
          transition={{ duration: 1.2, repeat: phase === 'listening' ? Infinity : 0 }}
          style={{ width: 88, height: 88, borderRadius: '50%', border: 'none', cursor: phase === 'idle' ? 'pointer' : 'default',
            fontSize: '2rem', background: phase === 'listening'
              ? 'linear-gradient(135deg,#f87171,#dc2626)'
              : result === 'pass' ? 'linear-gradient(135deg,#34d399,#059669)'
              : 'linear-gradient(135deg,#38bdf8,#818cf8)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {phase === 'listening' ? '⏸' : result === 'pass' ? '✓' : '🎙'}
        </motion.button>
        {phase === 'idle' && !result && (
          <p style={{ color: T.muted, fontSize: '0.82rem', marginTop: 10 }}>Tap mic to speak</p>
        )}
      </div>

      {msg && <p style={{ textAlign: 'center', color: result === 'pass' ? T.accent3 : T.muted, fontSize: '0.9rem', marginBottom: 12 }}>{msg}</p>}
      {diff && result === 'fail' && <WordByWordDiff diff={diff} />}

      {result === 'fail' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={go} style={btn('outline')}>🔁 Try Again</button>
          <button onClick={onFail} style={{ ...btn('ghost'), color: T.muted }}>Skip →</button>
        </div>
      )}
    </motion.div>
  )
}

function CompletionScreen({ xp, onDone }) {
  useEffect(() => { speak('Congratulations! Lesson complete. Amazing work!') }, [])
  return (
    <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
      style={{ ...glass(T.gold, true), padding: '48px 32px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.6, delay: 0.2 }}
        style={{ fontSize: '4rem', marginBottom: 20 }}>🏆</motion.div>
      <h2 style={{ fontSize: '2rem', fontWeight: 900, color: T.gold, marginBottom: 8 }}>Lesson Complete!</h2>
      <p style={{ color: T.muted, marginBottom: 24, fontSize: '0.95rem' }}>You earned <span style={{ color: T.gold, fontWeight: 800 }}>+{xp} XP</span> today</p>
      <button onClick={onDone} style={btn('gold')}>Back to Lessons</button>
    </motion.div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LessonPlay() {
  const { lessonId } = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()

  const [loading,  setLoading]  = useState(true)
  const [queue,    setQueue]    = useState([])
  const [cursor,   setCursor]   = useState(0)
  const [hearts,   setHearts]   = useState(3)
  const [xp,       setXp]       = useState(0)
  const [lang,     setLang]     = useState('en')
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    const load = async () => {
      const [wc, mcq, arr, read] = await Promise.all([
        getWordContent(lessonId, LANG).then(r => r.data ?? []).catch(() => []),
        getMeaningQuestions(lessonId, LANG).then(r => r.data ?? []).catch(() => []),
        getArrangeSentences(lessonId, LANG).then(r => r.data ?? []).catch(() => []),
        getReadingSentences(lessonId, LANG).then(r => r.data ?? []).catch(() => []),
      ])

      const q = [{ type: 'intro' }]
      wc.slice(0, 5).forEach(w => { q.push({ type: 'definition', data: w }); q.push({ type: 'example', data: w }) })
      shuffle(mcq).slice(0, MAX_MCQ).forEach(m => q.push({ type: 'mcq', data: m }))
      shuffle(arr).slice(0, MAX_ARR).forEach(a => q.push({ type: 'arrange', data: a }))
      read.slice(0, 3).forEach(r => q.push({ type: 'voice', data: r }))
      q.push({ type: 'done' })
      setQueue(q)
      setLoading(false)
    }
    load()
  }, [lessonId])

  const advance = () => setCursor(c => c + 1)
  const loseHeart = () => { setHearts(h => Math.max(0, h - 1)); advance() }
  const gainXp = (pts) => setXp(x => x + pts)

  useEffect(() => {
    if (done) {
      updateStreak({ userId: user?.id || 0, xpEarned: xp }).catch(() => {})
    }
  }, [done])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AuraBg />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Gem animate size={56} />
          <p style={{ color: T.muted, marginTop: 16 }}>Loading lesson…</p>
        </div>
      </div>
    )
  }

  const step = queue[cursor]
  const total = queue.length

  if (done || step?.type === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <AuraBg />
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <CompletionScreen xp={xp} onDone={() => navigate('/lessons')} />
        </div>
      </div>
    )
  }

  const doTamilSpeak = (text) => speakTamil(text)

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <AuraBg />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <TopBar hearts={hearts} xp={xp} step={cursor} total={total} onLang={setLang} lang={lang} onExit={() => navigate('/lessons')} />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 18px 80px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={cursor} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
              {step?.type === 'intro' && (
                <IntroStep lessonName={`Lesson ${lessonId}`} onNext={advance} />
              )}
              {(step?.type === 'definition' || step?.type === 'example') && step.data?.wordName && (
                <DefinitionStep word={step.data} lang={lang} onNext={advance} onTamilSpeak={doTamilSpeak} />
              )}
              {(step?.type === 'definition' || step?.type === 'example') && !step.data?.wordName && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <p style={{ color: T.muted }}>Loading word content…</p>
                  <button onClick={advance} style={{ ...btn('ghost'), width: 'auto', marginTop: 16, padding: '10px 24px' }}>Skip →</button>
                </div>
              )}
              {step?.type === 'mcq' && (
                <MCQStep q={step.data} lang={lang}
                  onCorrect={() => { gainXp(10); advance() }}
                  onWrong={() => { loseHeart(); gainXp(2) }} />
              )}
              {step?.type === 'arrange' && (
                <ArrangeStep sentence={step.data} lang={lang}
                  onCorrect={() => { gainXp(15); advance() }}
                  onWrong={() => { loseHeart(); gainXp(3) }}
                  onTamilSpeak={doTamilSpeak} />
              )}
              {step?.type === 'voice' && (
                <VoiceStep sentence={step.data} lang={lang}
                  onPass={() => { gainXp(20); advance() }}
                  onFail={() => { loseHeart(); advance() }}
                  onTamilSpeak={doTamilSpeak} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
