import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminNav from '../components/AdminNav'
import {
  getWordContent, addWordContent, updateWordContent, deleteWordContent,
  getMeaningQuestionsAdmin, addMeaningQuestion, updateMeaningQuestion, deleteMeaningQuestion,
  addMeaningOption, updateMeaningOption, deleteMeaningOption,
  getArrangeSentences, addArrangeSentence, deleteArrangeSentence,
  getLessonDetail,
} from '../services/api'

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)',
  accent: '#38bdf8', gold: '#fbbf24', danger: '#f87171',
  success: '#34d399', text: '#e2e8f0', muted: '#64748b',
}
const glass = (a = T.accent) => ({
  background: T.card, border: `1px solid ${a}25`,
  borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(12px)',
})
const btn = (bg, col = '#fff') => ({
  padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontWeight: 700, fontSize: '0.82rem', background: bg, color: col,
})
const LANG = 1

// ─── Word Content ────────────────────────────────────────────────────────────
function WordContentTab({ lessonId, flash }) {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  const load = useCallback(async () => {
    const r = await getWordContent(lessonId, LANG)
    setItems(r.data ?? [])
  }, [lessonId])

  useEffect(() => { load() }, [load])

  const blank = { wordName: '', sentencePattern: '', definitionEn: '', definitionTa: '', exampleEn: '', exampleTa: '', displayOrder: 0 }

  const openNew = () => { setEditing('new'); setForm({ ...blank, lessonId: +lessonId }) }
  const openEdit = (item) => {
    setEditing(item.contentId ?? item.content_id)
    setForm({
      lessonId: +lessonId,
      wordName: item.wordName ?? item.word_name ?? '',
      sentencePattern: item.sentencePattern ?? item.sentence_pattern ?? '',
      definitionEn: item.definitionEn ?? item.definition_en ?? '',
      definitionTa: item.definitionTa ?? item.definition_ta ?? '',
      exampleEn: item.exampleEn ?? item.example_en ?? '',
      exampleTa: item.exampleTa ?? item.example_ta ?? '',
      displayOrder: item.displayOrder ?? item.display_order ?? 0,
    })
  }

  const save = async () => {
    const payload = {
      lessonId: form.lessonId, wordName: form.wordName, sentencePattern: form.sentencePattern,
      definitionEn: form.definitionEn, definitionTa: form.definitionTa,
      exampleEn: form.exampleEn, exampleTa: form.exampleTa, displayOrder: +form.displayOrder,
    }
    if (editing === 'new') {
      await addWordContent(payload)
      flash('Word content added')
    } else {
      await updateWordContent(editing, payload)
      flash('Word content updated')
    }
    setEditing(null); load()
  }

  const del = async (id) => {
    if (!confirm('Delete this word content?')) return
    await deleteWordContent(id)
    flash('Deleted'); load()
  }

  const F = ({ label, field, ta }) => (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ color: T.muted, fontSize: '0.78rem', marginBottom: 4 }}>{label}</div>
      {ta
        ? <textarea value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            rows={2} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
        : <input value={form[field] ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: T.text, fontSize: '0.9rem', boxSizing: 'border-box' }} />}
    </label>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ color: T.muted, fontSize: '0.88rem' }}>{items.length} words</span>
        <button style={btn('linear-gradient(135deg,#38bdf8,#818cf8)')} onClick={openNew}>+ Add Word</button>
      </div>

      {editing && (
        <div style={{ ...glass(T.accent), marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, color: T.accent }}>{editing === 'new' ? 'Add Word Content' : 'Edit Word Content'}</h3>
          <F label="Word / Title *" field="wordName" />
          <F label="Sentence Pattern (e.g. Subject + IS + ...)" field="sentencePattern" />
          <F label="Definition (English)" field="definitionEn" ta />
          <F label="Definition (Tamil)" field="definitionTa" ta />
          <F label="Example (English)" field="exampleEn" ta />
          <F label="Example (Tamil)" field="exampleTa" ta />
          <F label="Display Order" field="displayOrder" />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button style={btn(T.success)} onClick={save}>Save</button>
            <button style={btn('rgba(255,255,255,0.08)', T.muted)} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {items.map(item => {
          const id = item.contentId ?? item.content_id
          const name = item.wordName ?? item.word_name
          const defEn = item.definitionEn ?? item.definition_en
          return (
            <div key={id} style={{ ...glass(T.success), display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: T.text }}>{name}</div>
                {defEn && <div style={{ color: T.muted, fontSize: '0.83rem', marginTop: 4 }}>{defEn}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={btn('rgba(56,189,248,0.15)', T.accent)} onClick={() => openEdit(item)}>Edit</button>
                <button style={btn('rgba(248,113,113,0.15)', T.danger)} onClick={() => del(id)}>Del</button>
              </div>
            </div>
          )
        })}
        {!items.length && <div style={{ color: T.muted, textAlign: 'center', padding: 32 }}>No word content yet. Click "+ Add Word" to start.</div>}
      </div>
    </div>
  )
}

// ─── MCQ Tab ─────────────────────────────────────────────────────────────────
function MCQTab({ lessonId, flash }) {
  const [questions, setQuestions] = useState([])
  const [editQ, setEditQ] = useState(null)
  const [newQText, setNewQText] = useState('')
  const [addingQ, setAddingQ] = useState(false)
  const [editOpt, setEditOpt] = useState(null)

  const load = useCallback(async () => {
    const r = await getMeaningQuestionsAdmin(lessonId, LANG)
    setQuestions(r.data ?? [])
  }, [lessonId])

  useEffect(() => { load() }, [load])

  const saveQ = async (q) => {
    await updateMeaningQuestion({ QuestionID: q.questionID, LanguageID: LANG, QuestionText: q.editText })
    flash('Question updated'); setEditQ(null); load()
  }

  const addQ = async () => {
    if (!newQText.trim()) return
    await addMeaningQuestion({ LessonID: +lessonId, LanguageID: LANG, QuestionText: newQText })
    flash('Question added'); setNewQText(''); setAddingQ(false); load()
  }

  const delQ = async (id) => {
    if (!confirm('Delete this question and all its options?')) return
    await deleteMeaningQuestion(id); flash('Deleted'); load()
  }

  const saveOpt = async (opt) => {
    await updateMeaningOption({ OptionID: opt.optionID, LanguageID: LANG, OptionText: opt.editText, IsCorrect: opt.editCorrect })
    flash('Option updated'); setEditOpt(null); load()
  }

  const addOpt = async (qId, text, isCorrect) => {
    await addMeaningOption({ QuestionID: qId, LanguageID: LANG, OptionText: text, IsCorrect: isCorrect })
    flash('Option added'); load()
  }

  const delOpt = async (id) => {
    await deleteMeaningOption(id); flash('Option deleted'); load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ color: T.muted, fontSize: '0.88rem' }}>{questions.length} questions</span>
        <button style={btn('linear-gradient(135deg,#38bdf8,#818cf8)')} onClick={() => setAddingQ(true)}>+ Add Question</button>
      </div>

      {addingQ && (
        <div style={{ ...glass(T.accent), marginBottom: 20 }}>
          <div style={{ color: T.muted, fontSize: '0.78rem', marginBottom: 6 }}>Question Text (use ___ for blank)</div>
          <input value={newQText} onChange={e => setNewQText(e.target.value)}
            placeholder="He ___ to school daily"
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: T.text, marginBottom: 12, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btn(T.success)} onClick={addQ}>Add</button>
            <button style={btn('rgba(255,255,255,0.08)', T.muted)} onClick={() => setAddingQ(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {questions.map(q => (
          <div key={q.questionID} style={glass(T.gold)}>
            {editQ === q.questionID
              ? <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input value={q.editText ?? q.questionText} onChange={e => setQuestions(qs => qs.map(x => x.questionID === q.questionID ? { ...x, editText: e.target.value } : x))}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: T.text }} />
                  <button style={btn(T.success)} onClick={() => saveQ({ ...q, editText: q.editText ?? q.questionText })}>Save</button>
                  <button style={btn('rgba(255,255,255,0.08)', T.muted)} onClick={() => setEditQ(null)}>✕</button>
                </div>
              : <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700 }}>Q: {q.questionText}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={btn('rgba(56,189,248,0.15)', T.accent)} onClick={() => setEditQ(q.questionID)}>Edit</button>
                    <button style={btn('rgba(248,113,113,0.15)', T.danger)} onClick={() => delQ(q.questionID)}>Del</button>
                  </div>
                </div>
            }

            <div style={{ display: 'grid', gap: 6 }}>
              {(q.options ?? []).map(opt => (
                <div key={opt.optionID} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px' }}>
                  {editOpt === opt.optionID
                    ? <>
                        <input value={opt.editText ?? opt.optionText} onChange={e => setQuestions(qs => qs.map(x => ({ ...x, options: x.options?.map(o => o.optionID === opt.optionID ? { ...o, editText: e.target.value } : o) })))}
                          style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', color: T.text }} />
                        <label style={{ color: T.gold, fontSize: '0.8rem', display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input type="checkbox" checked={opt.editCorrect ?? opt.isCorrect} onChange={e => setQuestions(qs => qs.map(x => ({ ...x, options: x.options?.map(o => o.optionID === opt.optionID ? { ...o, editCorrect: e.target.checked } : o) })))} />
                          Correct
                        </label>
                        <button style={btn(T.success)} onClick={() => saveOpt({ ...opt, editText: opt.editText ?? opt.optionText, editCorrect: opt.editCorrect ?? opt.isCorrect })}>✓</button>
                        <button style={btn('rgba(255,255,255,0.06)', T.muted)} onClick={() => setEditOpt(null)}>✕</button>
                      </>
                    : <>
                        <span style={{ color: opt.isCorrect ? T.success : T.muted, fontWeight: opt.isCorrect ? 700 : 400, flex: 1 }}>
                          {opt.isCorrect ? '✓ ' : ''}{opt.optionText}
                        </span>
                        <button style={btn('rgba(56,189,248,0.1)', T.accent)} onClick={() => setEditOpt(opt.optionID)}>Edit</button>
                        <button style={btn('rgba(248,113,113,0.1)', T.danger)} onClick={() => delOpt(opt.optionID)}>✕</button>
                      </>
                  }
                </div>
              ))}
            </div>
            <AddOptionInline qId={q.questionID} onAdd={addOpt} />
          </div>
        ))}
        {!questions.length && <div style={{ color: T.muted, textAlign: 'center', padding: 32 }}>No MCQ questions yet.</div>}
      </div>
    </div>
  )
}

function AddOptionInline({ qId, onAdd }) {
  const [text, setText] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [open, setOpen] = useState(false)
  if (!open) return <button style={{ ...btn('rgba(255,255,255,0.05)', T.muted), marginTop: 8 }} onClick={() => setOpen(true)}>+ Add Option</button>
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Option text..."
        style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: T.text, fontSize: '0.85rem' }} />
      <label style={{ color: T.gold, fontSize: '0.8rem', display: 'flex', gap: 4, alignItems: 'center', whiteSpace: 'nowrap' }}>
        <input type="checkbox" checked={isCorrect} onChange={e => setIsCorrect(e.target.checked)} /> Correct
      </label>
      <button style={btn(T.success)} onClick={() => { onAdd(qId, text, isCorrect); setText(''); setIsCorrect(false); setOpen(false) }}>Add</button>
      <button style={btn('rgba(255,255,255,0.06)', T.muted)} onClick={() => setOpen(false)}>✕</button>
    </div>
  )
}

// ─── Arrange Tab ─────────────────────────────────────────────────────────────
function ArrangeTab({ lessonId, flash }) {
  const [sentences, setSentences] = useState([])
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')

  const load = useCallback(async () => {
    const r = await getArrangeSentences(lessonId, LANG)
    setSentences(r.data ?? [])
  }, [lessonId])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!newText.trim()) return
    await addArrangeSentence({ LessonId: +lessonId, LanguageId: LANG, CorrectSentence: newText })
    flash('Arrange sentence added'); setNewText(''); setAdding(false); load()
  }

  const del = async (id) => {
    if (!confirm('Delete this arrange sentence?')) return
    await deleteArrangeSentence(id); flash('Deleted'); load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ color: T.muted, fontSize: '0.88rem' }}>{sentences.length} sentences</span>
        <button style={btn('linear-gradient(135deg,#38bdf8,#818cf8)')} onClick={() => setAdding(true)}>+ Add Sentence</button>
      </div>

      {adding && (
        <div style={{ ...glass(T.accent), marginBottom: 20 }}>
          <div style={{ color: T.muted, fontSize: '0.78rem', marginBottom: 6 }}>Correct Sentence (words will be auto-split and shuffled)</div>
          <input value={newText} onChange={e => setNewText(e.target.value)}
            placeholder="I drink coffee every morning"
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: T.text, marginBottom: 12, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btn(T.success)} onClick={add}>Add</button>
            <button style={btn('rgba(255,255,255,0.08)', T.muted)} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {sentences.map(s => (
          <div key={s.arrangeSentenceID} style={{ ...glass(T.success), display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{s.correctSentence}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(s.words ?? []).map(w => (
                  <span key={w.wordID} style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: '0.8rem', color: T.success }}>
                    {w.wordText}
                  </span>
                ))}
              </div>
            </div>
            <button style={btn('rgba(248,113,113,0.15)', T.danger)} onClick={() => del(s.arrangeSentenceID)}>Del</button>
          </div>
        ))}
        {!sentences.length && <div style={{ color: T.muted, textAlign: 'center', padding: 32 }}>No arrange sentences yet.</div>}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminLessonContent() {
  const { lessonId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState(null)
  const [tab, setTab] = useState('words')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getLessonDetail(lessonId).then(r => setLesson(r.data)).catch(() => {})
  }, [lessonId])

  if (user?.role !== 'Admin') {
    return <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.danger }}>⛔ Admin only</div>
  }

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const tabs = [
    { id: 'words',   label: '📖 Word Content' },
    { id: 'mcq',     label: '❓ MCQ Questions' },
    { id: 'arrange', label: '🔀 Arrange Sentences' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <AdminNav activePath="/admin/lessons" />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px' }}>
        {msg && (
          <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid #34d39940', color: T.success, borderRadius: 10, padding: '10px 18px', marginBottom: 20, fontSize: '0.9rem' }}>
            {msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                background: tab === t.id ? T.accent : 'rgba(255,255,255,0.06)',
                color: tab === t.id ? '#000' : T.muted }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'words'   && <WordContentTab lessonId={lessonId} flash={flash} />}
        {tab === 'mcq'     && <MCQTab         lessonId={lessonId} flash={flash} />}
        {tab === 'arrange' && <ArrangeTab      lessonId={lessonId} flash={flash} />}
      </div>
    </div>
  )
}
