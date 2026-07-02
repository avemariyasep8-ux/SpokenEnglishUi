import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getConversation } from '../services/api'
import { speak, speakTamil, listen, normalizeText, isSpeechRecognitionSupported } from '../services/speechUtils'

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)',
  accent: '#38bdf8', accent2: '#818cf8', accent3: '#34d399',
  gold: '#fbbf24', danger: '#f87171', orange: '#fb923c',
  text: '#e2e8f0', muted: '#64748b',
}

// Accept the learner's reply if it closely matches the expected response.
function matches(said, expected) {
  const n1 = normalizeText(said)
  const n2 = normalizeText(expected)
  if (!n2) return true
  if (n1 === n2 || n1.includes(n2)) return true
  const words = n2.split(' ').filter(Boolean)
  const hit = words.filter(w => n1.includes(w)).length
  return hit >= Math.ceil(words.length * 0.7)
}

export default function ConversationPlay() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [conv, setConv] = useState(null)
  const [turns, setTurns] = useState([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)          // current turn index
  const [history, setHistory] = useState([]) // [{ who:'system'|'learner', text }]
  const [phase, setPhase] = useState('idle')  // idle | listening | done
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState(null) // null | 'pass' | 'fail'
  const [showHint, setShowHint] = useState(false)
  const [finished, setFinished] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    getConversation(id)
      .then(r => { setConv(r.data.conversation); setTurns(r.data.turns || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  // When a new turn becomes current, show the system line + speak it.
  useEffect(() => {
    if (loading || finished) return
    const turn = turns[idx]
    if (!turn) return
    setHistory(h => [...h, { who: 'system', text: turn.system_text }])
    setTimeout(() => speak(turn.system_text), 300)
    setFeedback(null); setShowHint(false); setTyped(''); setPhase('idle')
    // System-only line (no expected response) → auto-advance after a beat.
    if (!turn.expected_response) {
      const t = setTimeout(() => next(), 1600)
      return () => clearTimeout(t)
    }
  }, [idx, loading])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history])

  const turn = turns[idx]

  const next = () => {
    if (idx + 1 >= turns.length) setFinished(true)
    else setIdx(i => i + 1)
  }

  const accept = (saidText) => {
    setHistory(h => [...h, { who: 'learner', text: saidText }])
    setFeedback('pass')
    speak('Correct!')
    setTimeout(next, 1200)
  }

  const submitTyped = () => {
    if (!typed.trim()) return
    if (matches(typed, turn.expected_response)) accept(typed.trim())
    else { setFeedback('fail'); speak('Try again.') }
  }

  const mic = async () => {
    if (phase === 'listening') return
    setPhase('listening'); setFeedback(null)
    try {
      const said = await listen()
      setPhase('idle')
      if (matches(said, turn.expected_response)) accept(said)
      else { setHistory(h => [...h, { who: 'learner', text: said }]); setFeedback('fail'); speak('Not quite. Try again.') }
    } catch {
      setPhase('idle')
    }
  }

  if (loading) {
    return <Center><div style={{ color: T.muted }}>Loading conversation…</div></Center>
  }
  if (!conv) {
    return <Center><div style={{ color: T.danger }}>Conversation not found.</div></Center>
  }

  const bubble = (who) => ({
    maxWidth: '78%', padding: '11px 16px', borderRadius: 16, fontSize: '0.95rem', lineHeight: 1.5,
    alignSelf: who === 'system' ? 'flex-start' : 'flex-end',
    background: who === 'system' ? 'rgba(56,189,248,0.12)' : 'linear-gradient(135deg,#34d399,#059669)',
    color: who === 'system' ? T.text : '#04110b',
    border: who === 'system' ? '1px solid rgba(56,189,248,0.25)' : 'none',
    borderBottomLeftRadius: who === 'system' ? 4 : 16,
    borderBottomRightRadius: who === 'system' ? 16 : 4,
  })

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, background: 'rgba(8,12,20,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,179,237,0.12)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, zIndex: 10 }}>
        <button onClick={() => navigate('/conversations')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: T.muted, cursor: 'pointer', padding: '4px 10px' }}>✕</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800 }}>💬 {conv.title}</div>
          <div style={{ color: T.muted, fontSize: '0.75rem' }}>{conv.scenario} · {conv.level}</div>
        </div>
        <div style={{ color: T.muted, fontSize: '0.8rem' }}>{Math.min(idx + 1, turns.length)}/{turns.length}</div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', maxWidth: 640, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence initial={false}>
          {history.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={bubble(m.who)}>{m.text}</div>
            </motion.div>
          ))}
        </AnimatePresence>

        {feedback === 'fail' && turn?.expected_response && (
          <div style={{ alignSelf: 'flex-end', color: T.danger, fontSize: '0.82rem', marginTop: -4 }}>
            ❌ Not quite — try again{turn.tamil_hint ? ' or use the hint' : ''}
          </div>
        )}

        {finished && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ ...glassCard(T.gold), padding: '32px', textAlign: 'center', marginTop: 20 }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>🎉</div>
            <h2 style={{ color: T.gold, fontWeight: 900, marginBottom: 8 }}>Conversation Complete!</h2>
            <p style={{ color: T.muted, marginBottom: 20 }}>Great job practicing “{conv.title}”.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => window.location.reload()} style={pill('linear-gradient(135deg,#38bdf8,#818cf8)', '#fff')}>🔁 Practice Again</button>
              <button onClick={() => navigate('/conversations')} style={pill('rgba(255,255,255,0.08)', T.text)}>← All Conversations</button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input dock */}
      {!finished && turn?.expected_response && (
        <div style={{ borderTop: '1px solid rgba(99,179,237,0.12)', background: 'rgba(8,12,20,0.9)', padding: '14px 18px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {turn.tamil_hint && (
              <div style={{ marginBottom: 10, textAlign: 'center' }}>
                <button onClick={() => setShowHint(s => !s)} style={pill('rgba(251,191,36,0.12)', T.gold)}>
                  {showHint ? '🙈 Hide hint' : '💡 Hint'}
                </button>
                {showHint && (
                  <div style={{ marginTop: 8, color: T.gold, fontFamily: "'Noto Sans Tamil', sans-serif" }}>
                    {turn.tamil_hint}
                    <button onClick={() => speakTamil(turn.tamil_hint)} style={{ ...pill('transparent', T.gold), marginLeft: 8, padding: '4px 10px' }}>🔊</button>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {isSpeechRecognitionSupported() && (
                <motion.button onClick={mic}
                  animate={phase === 'listening' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: phase === 'listening' ? Infinity : 0 }}
                  style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: 'pointer', fontSize: '1.3rem',
                    background: phase === 'listening' ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff' }}>
                  {phase === 'listening' ? '👂' : '🎤'}
                </motion.button>
              )}
              <input value={typed} onChange={e => setTyped(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitTyped()}
                placeholder="Type your reply…"
                style={{ flex: 1, padding: '13px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${feedback === 'fail' ? T.danger : 'rgba(255,255,255,0.12)'}`, color: T.text, fontSize: '0.95rem', outline: 'none' }} />
              <button onClick={submitTyped} disabled={!typed.trim()}
                style={{ ...pill(typed.trim() ? 'linear-gradient(135deg,#34d399,#059669)' : 'rgba(255,255,255,0.08)', typed.trim() ? '#04110b' : T.muted), padding: '13px 20px' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const glassCard = (a) => ({ background: 'rgba(12,20,36,0.97)', border: `1px solid ${a}30`, borderRadius: 18 })
const pill = (bg, col) => ({ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: bg, color: col })
function Center({ children }) {
  return <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
}
