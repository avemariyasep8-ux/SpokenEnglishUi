import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../services/api'
import AdminNav from '../components/AdminNav'

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)',
  accent: '#38bdf8', gold: '#fbbf24', success: '#34d399',
  danger: '#f87171', text: '#e2e8f0', muted: '#64748b',
}

const glass = (a = T.accent) => ({
  background: T.card, border: `1px solid ${a}25`,
  borderRadius: 16, padding: '20px 22px',
})

const inp = (extra = {}) => ({
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  color: T.text, fontSize: '0.9rem', outline: 'none',
  boxSizing: 'border-box', ...extra,
})

const blankMcq = () => ({
  question: '',
  options: [
    { text: '', correct: true },
    { text: '', correct: false },
    { text: '', correct: false },
    { text: '', correct: false },
  ],
})

const blankArr = () => ({ sentence: '', hint: '' })
const blankRead = () => ({ sentence: '' })
const blankWord = () => ({ wordName: '', pattern: '', defEn: '', defTa: '', exEn: '', exTa: '' })

export default function AdminAddLesson() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step,    setStep]    = useState(1)   // 1=basic 2=words 3=mcq 4=arrange 5=reading
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState({ text: '', ok: true })
  const [lessonId, setLessonId] = useState(null)

  // Step 1 — Basic info
  const [basic, setBasic] = useState({ name: '', description: '', typeId: 1, order: 1, langId: 1 })

  // Step 2 — Word Content
  const [words, setWords] = useState([blankWord()])

  // Step 3 — MCQ
  const [mcqs, setMcqs] = useState([blankMcq()])

  // Step 4 — Arrange
  const [arrs, setArrs] = useState([blankArr()])

  // Step 5 — Reading
  const [reads, setReads] = useState([blankRead()])

  if (user?.role !== 'Admin') {
    return <div style={{ color: T.danger, padding: 40, textAlign: 'center' }}>⛔ Admin only</div>
  }

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 4000) }

  // ── Step 1: Create lesson ─────────────────────────────────────────────────
  const saveBasic = async () => {
    if (!basic.name.trim()) return flash('Lesson name is required', false)
    setSaving(true)
    try {
      const res = await API.post('/lessons', {
        lessonName: basic.name, description: basic.description,
        lessonTypeID: basic.typeId, lessonOrder: basic.order, languageID: basic.langId,
      })
      const id = res.data.lessonID
      setLessonId(id)
      flash(`✓ Lesson created (ID: ${id})`)
      setStep(2)
    } catch (e) {
      flash(e.response?.data?.message || 'Failed to create lesson', false)
    } finally { setSaving(false) }
  }

  // ── Step 2: Word content ──────────────────────────────────────────────────
  const saveWords = async () => {
    setSaving(true)
    let ok = 0
    for (const [i, w] of words.entries()) {
      if (!w.wordName.trim()) continue
      try {
        await API.post('/wordcontent', {
          lessonId: lessonId, wordName: w.wordName, sentencePattern: w.pattern,
          definitionEn: w.defEn, definitionTa: w.defTa,
          exampleEn: w.exEn, exampleTa: w.exTa, displayOrder: i + 1,
        })
        ok++
      } catch {}
    }
    flash(`✓ Saved ${ok} word content entries`)
    setStep(3)
    setSaving(false)
  }

  // ── Step 3: MCQ ───────────────────────────────────────────────────────────
  const saveMcqs = async () => {
    setSaving(true)
    let ok = 0
    for (const m of mcqs) {
      if (!m.question.trim()) continue
      try {
        const qRes = await API.post('/meaning/question', {
          lessonId: lessonId, questionText: m.question, languageId: basic.langId,
        })
        const qId = qRes.data.questionID
        for (const o of m.options) {
          if (!o.text.trim()) continue
          await API.post('/meaning/option', {
            questionId: qId, optionText: o.text, isCorrect: o.correct,
          })
        }
        ok++
      } catch {}
    }
    flash(`✓ Saved ${ok} MCQ questions`)
    setStep(4)
    setSaving(false)
  }

  // ── Step 4: Arrange ───────────────────────────────────────────────────────
  const saveArrs = async () => {
    setSaving(true)
    let ok = 0
    for (const a of arrs) {
      if (!a.sentence.trim()) continue
      try {
        await API.post('/arrange', {
          lessonId: lessonId, correctAnswer: a.sentence,
          hintText: a.hint, languageId: basic.langId,
        })
        ok++
      } catch {}
    }
    flash(`✓ Saved ${ok} arrange sentences`)
    setStep(5)
    setSaving(false)
  }

  // ── Step 5: Reading ───────────────────────────────────────────────────────
  const saveReads = async () => {
    setSaving(true)
    let ok = 0
    for (const r of reads) {
      if (!r.sentence.trim()) continue
      try {
        await API.post('/reading', {
          lessonId: lessonId, sentenceText: r.sentence, languageId: basic.langId,
        })
        ok++
      } catch {}
    }
    flash(`✓ Saved ${ok} reading sentences. Lesson complete!`)
    setSaving(false)
    setTimeout(() => navigate('/admin'), 2000)
  }

  const stepLabels = ['Basic Info', 'Word Content', 'MCQ Quiz', 'Arrange', 'Reading']

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at top left,rgba(56,189,248,0.06),transparent 60%)' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>

        <AdminNav activePath="/admin/lessons" />

        <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 20px 80px' }}>

          {/* Step progress */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
            {stepLabels.map((l, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
                <div style={{ height: 4, borderRadius: 99, marginBottom: 6,
                  background: i + 1 <= step ? 'linear-gradient(90deg,#38bdf8,#818cf8)' : 'rgba(255,255,255,0.08)' }} />
                <span style={{ color: i + 1 <= step ? T.accent : T.muted }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Flash message */}
          {msg.text && (
            <div style={{ padding: '12px 18px', borderRadius: 10, marginBottom: 20, fontSize: '0.9rem',
              background: msg.ok ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
              border: `1px solid ${msg.ok ? T.success : T.danger}40`,
              color: msg.ok ? T.success : T.danger }}>
              {msg.text}
            </div>
          )}

          {/* ── STEP 1: Basic ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div style={glass()}>
              <h2 style={{ color: T.accent, marginBottom: 20, fontSize: '1.1rem' }}>📌 Lesson Details</h2>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ color: T.muted, fontSize: '0.82rem', display: 'block', marginBottom: 5 }}>Lesson Name *</label>
                  <input style={inp()} placeholder="e.g. Modal Verbs" value={basic.name}
                    onChange={e => setBasic(b => ({ ...b, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ color: T.muted, fontSize: '0.82rem', display: 'block', marginBottom: 5 }}>Description</label>
                  <textarea style={{ ...inp(), height: 80, resize: 'vertical' }} placeholder="Short lesson description…"
                    value={basic.description} onChange={e => setBasic(b => ({ ...b, description: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: T.muted, fontSize: '0.82rem', display: 'block', marginBottom: 5 }}>Lesson Order</label>
                    <input type="number" style={inp()} value={basic.order}
                      onChange={e => setBasic(b => ({ ...b, order: +e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ color: T.muted, fontSize: '0.82rem', display: 'block', marginBottom: 5 }}>Type ID</label>
                    <select style={{ ...inp(), cursor: 'pointer' }} value={basic.typeId}
                      onChange={e => setBasic(b => ({ ...b, typeId: +e.target.value }))}>
                      <option value={1}>Tense</option>
                      <option value={2}>Grammar</option>
                      <option value={3}>Vocabulary</option>
                      <option value={4}>Conversation</option>
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={saveBasic} disabled={saving}
                style={{ marginTop: 24, padding: '13px 32px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff',
                  fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: '0.95rem' }}>
                {saving ? 'Creating…' : 'Create Lesson & Continue →'}
              </button>
            </div>
          )}

          {/* ── STEP 2: Word Content ──────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 style={{ color: T.accent, marginBottom: 20, fontSize: '1.1rem' }}>📖 Word Content (Definitions & Examples)</h2>
              {words.map((w, i) => (
                <div key={i} style={{ ...glass(T.success), marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ color: T.success, fontWeight: 700, fontSize: '0.85rem' }}>Word {i + 1}</span>
                    {words.length > 1 && <button onClick={() => setWords(w => w.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[
                      ['Word/Phrase', 'wordName', 'e.g. "should"'],
                      ['Sentence Pattern', 'pattern', 'e.g. Subject + should + verb'],
                      ['Definition (English)', 'defEn', 'e.g. Used to give advice'],
                      ['Definition (Tamil)', 'defTa', 'தமிழ் விளக்கம்'],
                      ['Example (English)', 'exEn', 'e.g. You should eat healthy food.'],
                      ['Example (Tamil)', 'exTa', 'தமிழ் உதாரணம்'],
                    ].map(([label, field, ph]) => (
                      <div key={field}>
                        <label style={{ color: T.muted, fontSize: '0.78rem', display: 'block', marginBottom: 4 }}>{label}</label>
                        <input style={inp()} placeholder={ph} value={w[field]}
                          onChange={e => setWords(ws => ws.map((x, j) => j === i ? { ...x, [field]: e.target.value } : x))} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setWords(w => [...w, blankWord()])}
                  style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${T.success}50`, background: 'transparent', color: T.success, cursor: 'pointer', fontWeight: 700 }}>
                  + Add Word
                </button>
                <button onClick={saveWords} disabled={saving}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : 'Save & Next →'}
                </button>
                <button onClick={() => setStep(3)}
                  style={{ padding: '12px 20px', borderRadius: 10, border: `1px solid rgba(255,255,255,0.1)`, background: 'transparent', color: T.muted, cursor: 'pointer' }}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: MCQ ───────────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 style={{ color: T.accent, marginBottom: 20, fontSize: '1.1rem' }}>❓ MCQ Questions</h2>
              {mcqs.map((m, i) => (
                <div key={i} style={{ ...glass(T.accent), marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ color: T.accent, fontWeight: 700, fontSize: '0.85rem' }}>Q{i + 1}</span>
                    {mcqs.length > 1 && <button onClick={() => setMcqs(q => q.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer' }}>✕</button>}
                  </div>
                  <input style={{ ...inp(), marginBottom: 12 }} placeholder="Question text…" value={m.question}
                    onChange={e => setMcqs(qs => qs.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} />
                  {m.options.map((o, oi) => (
                    <div key={oi} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <input type="radio" checked={o.correct}
                        onChange={() => setMcqs(qs => qs.map((x, j) => j !== i ? x : {
                          ...x, options: x.options.map((p, k) => ({ ...p, correct: k === oi }))
                        }))} style={{ flexShrink: 0 }} />
                      <input style={{ ...inp() }} placeholder={`Option ${oi + 1}`} value={o.text}
                        onChange={e => setMcqs(qs => qs.map((x, j) => j !== i ? x : {
                          ...x, options: x.options.map((p, k) => k === oi ? { ...p, text: e.target.value } : p)
                        }))} />
                    </div>
                  ))}
                  <p style={{ color: T.muted, fontSize: '0.76rem', marginTop: 6 }}>● = correct answer</p>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setMcqs(q => [...q, blankMcq()])}
                  style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${T.accent}50`, background: 'transparent', color: T.accent, cursor: 'pointer', fontWeight: 700 }}>
                  + Add Question
                </button>
                <button onClick={saveMcqs} disabled={saving}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : 'Save & Next →'}
                </button>
                <button onClick={() => setStep(4)} style={{ padding: '12px 20px', borderRadius: 10, border: `1px solid rgba(255,255,255,0.1)`, background: 'transparent', color: T.muted, cursor: 'pointer' }}>Skip</button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Arrange ───────────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 style={{ color: T.accent, marginBottom: 20, fontSize: '1.1rem' }}>🧩 Arrange Sentences</h2>
              {arrs.map((a, i) => (
                <div key={i} style={{ ...glass(T.gold), marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ color: T.gold, fontWeight: 700, fontSize: '0.85rem' }}>Sentence {i + 1}</span>
                    {arrs.length > 1 && <button onClick={() => setArrs(a => a.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer' }}>✕</button>}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div>
                      <label style={{ color: T.muted, fontSize: '0.78rem', display: 'block', marginBottom: 4 }}>Correct Sentence *</label>
                      <input style={inp()} placeholder="e.g. She goes to school every day."
                        value={a.sentence} onChange={e => setArrs(arr => arr.map((x, j) => j === i ? { ...x, sentence: e.target.value } : x))} />
                    </div>
                    <div>
                      <label style={{ color: T.muted, fontSize: '0.78rem', display: 'block', marginBottom: 4 }}>Pattern Hint (optional)</label>
                      <input style={inp()} placeholder="e.g. Subject + verb + place + time"
                        value={a.hint} onChange={e => setArrs(arr => arr.map((x, j) => j === i ? { ...x, hint: e.target.value } : x))} />
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setArrs(a => [...a, blankArr()])}
                  style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${T.gold}50`, background: 'transparent', color: T.gold, cursor: 'pointer', fontWeight: 700 }}>
                  + Add Sentence
                </button>
                <button onClick={saveArrs} disabled={saving}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : 'Save & Next →'}
                </button>
                <button onClick={() => setStep(5)} style={{ padding: '12px 20px', borderRadius: 10, border: `1px solid rgba(255,255,255,0.1)`, background: 'transparent', color: T.muted, cursor: 'pointer' }}>Skip</button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Reading ───────────────────────────────────────────── */}
          {step === 5 && (
            <div>
              <h2 style={{ color: T.accent, marginBottom: 20, fontSize: '1.1rem' }}>🎙 Reading Sentences (Voice Practice)</h2>
              {reads.map((r, i) => (
                <div key={i} style={{ ...glass(T.danger), marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ color: T.danger, fontWeight: 700, fontSize: '0.85rem' }}>Sentence {i + 1}</span>
                    {reads.length > 1 && <button onClick={() => setReads(r => r.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer' }}>✕</button>}
                  </div>
                  <input style={inp()} placeholder="e.g. I am learning spoken English every day."
                    value={r.sentence} onChange={e => setReads(rs => rs.map((x, j) => j === i ? { ...x, sentence: e.target.value } : x))} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setReads(r => [...r, blankRead()])}
                  style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${T.danger}50`, background: 'transparent', color: T.danger, cursor: 'pointer', fontWeight: 700 }}>
                  + Add Sentence
                </button>
                <button onClick={saveReads} disabled={saving}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#34d399,#059669)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : '✓ Finish & Save Lesson'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
