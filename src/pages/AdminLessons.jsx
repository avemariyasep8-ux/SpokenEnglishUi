import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getLessons, deleteLesson, getLessonStats,
  adminCreateLesson, adminUpdateLesson,
  downloadTemplate, importLessons, importWordContent, importMcq, importArrange,
  importTranslate, importReading,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import AdminNav from '../components/AdminNav'

const LANG = 1
const LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'College', 'Professional']
const LEVEL_ICONS = { Beginner: '🌱', Elementary: '📗', Intermediate: '📘', College: '🎓', Professional: '💼' }

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)',
  accent: '#38bdf8', gold: '#fbbf24', success: '#34d399',
  danger: '#f87171', purple: '#818cf8', orange: '#fb923c',
  text: '#e2e8f0', muted: '#64748b',
}
const glass = (a = T.accent) => ({
  background: T.card, border: `1px solid ${a}25`,
  borderRadius: 16, backdropFilter: 'blur(12px)',
})
const btn = (color = T.accent, bg = null) => ({
  padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
  fontWeight: 700, fontSize: '0.82rem', color: bg ? '#000' : color,
  background: bg || `${color}15`, transition: 'all 0.15s',
})

const IMPORT_TYPES = [
  { key: 'lessons',     label: 'Lessons',      icon: '📚', color: T.accent,  desc: 'LessonOrder, LessonName, Description, IsPremium, Level',   fn: importLessons },
  { key: 'wordcontent', label: 'Word Content',  icon: '📖', color: T.success, desc: 'LessonId, WordName, SentencePattern, DefinitionEn, DefinitionTa, ExampleEn, ExampleTa', fn: importWordContent },
  { key: 'mcq',         label: 'MCQ Questions', icon: '✏️', color: T.purple,  desc: 'LessonId, QuestionText, Option1, Option2, Option3, Option4, CorrectOption(1-4)', fn: importMcq },
  { key: 'arrange',     label: 'Arrange Words', icon: '🧩', color: T.orange,  desc: 'LessonId, CorrectSentence, TamilMeaning', fn: importArrange },
  { key: 'translate',   label: 'Translate',     icon: '🌐', color: T.gold,    desc: 'LessonId, CorrectSentence, TamilMeaning', fn: importTranslate },
  { key: 'reading',     label: 'Reading',       icon: '📢', color: T.danger,  desc: 'LessonId, SentenceText, DisplayOrder', fn: importReading },
]

function ImportModal({ onClose }) {
  const [tab, setTab] = useState('lessons')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()
  const current = IMPORT_TYPES.find(t => t.key === tab)

  const handleDownload = async () => {
    try {
      const res = await downloadTemplate(tab)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = `${tab}_template.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Failed to download template') }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true); setResult(null)
    try {
      const res = await current.fn(file)
      setResult({ ok: true, msg: res.data.message || `Imported ${res.data.imported} rows` })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.message || 'Import failed. Check your CSV format.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{ ...glass(T.gold), padding: '28px 28px', maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ color: T.gold, fontWeight: 900, fontSize: '1.2rem', margin: 0 }}>📥 Import Lesson Data</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
        </div>

        {/* Type tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {IMPORT_TYPES.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setFile(null); setResult(null) }}
              style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.82rem',
                background: tab === t.key ? t.color : 'rgba(255,255,255,0.06)',
                color: tab === t.key ? '#000' : T.muted }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: '0.75rem', color: T.muted, fontWeight: 700, marginBottom: 4 }}>CSV COLUMNS REQUIRED:</div>
          <code style={{ fontSize: '0.78rem', color: current.color, lineHeight: 1.6 }}>{current.desc}</code>
        </div>

        {/* Download template */}
        <button onClick={handleDownload}
          style={{ width: '100%', padding: '10px 18px', borderRadius: 10, border: `1px solid ${current.color}40`,
            background: `${current.color}10`, color: current.color, fontWeight: 700, fontSize: '0.88rem',
            cursor: 'pointer', marginBottom: 14 }}>
          ⬇ Download {current.label} Template (CSV)
        </button>

        {/* File upload */}
        <div style={{ border: `2px dashed ${file ? current.color : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 12, padding: '24px 16px', textAlign: 'center', marginBottom: 16,
          cursor: 'pointer', transition: 'all 0.2s' }}
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { setFile(e.target.files[0]); setResult(null) }} />
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>📄</span>
          {file
            ? <span style={{ color: current.color, fontWeight: 600 }}>{file.name}</span>
            : <span style={{ color: T.muted, fontSize: '0.88rem' }}>Click to select CSV file</span>}
        </div>

        {result && (
          <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 14, fontSize: '0.88rem',
            background: result.ok ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${result.ok ? T.success : T.danger}40`,
            color: result.ok ? T.success : T.danger }}>
            {result.ok ? '✅' : '❌'} {result.msg}
          </div>
        )}

        <button onClick={handleImport} disabled={!file || loading}
          style={{ width: '100%', padding: '12px 20px', borderRadius: 11, border: 'none',
            fontWeight: 700, fontSize: '0.92rem', cursor: file && !loading ? 'pointer' : 'default',
            background: file && !loading ? `linear-gradient(135deg,${current.color},${current.color}99)` : 'rgba(255,255,255,0.06)',
            color: file && !loading ? '#000' : T.muted }}>
          {loading ? 'Importing…' : `⬆ Import ${current.label}`}
        </button>
      </motion.div>
    </div>
  )
}

export default function AdminLessons() {
  const { logout } = useAuth()
  const [lessons, setLessons] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type: 'add'|'edit', lesson? }
  const [importOpen, setImportOpen] = useState(false)
  const [form, setForm] = useState({ lessonName: '', description: '', lessonTypeID: 1, lessonOrder: 1, isActive: true, isPremium: false, level: 'Beginner' })
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [lr, sr] = await Promise.all([
        getLessons(LANG),
        getLessonStats().catch(() => ({ data: [] })),
      ])
      setLessons(lr.data || [])
      const sm = {}
      ;(sr.data || []).forEach(s => { sm[s.lessonid] = s })
      setStats(sm)
    } finally {
      setLoading(false)
    }
  }

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const openEdit = (lesson) => {
    setForm({
      lessonID: lesson.lessonID, lessonName: lesson.lessonName,
      description: lesson.description || '', lessonTypeID: lesson.lessonTypeID || 1,
      lessonOrder: lesson.lessonOrder, isActive: lesson.isActive ?? true,
      isPremium: lesson.isPremium ?? false, level: lesson.level || 'Beginner', languageID: LANG,
    })
    setModal({ type: 'edit', lesson })
  }

  const openAdd = () => {
    setForm({ lessonName: '', description: '', lessonTypeID: 1,
      lessonOrder: lessons.length + 1, isActive: true, isPremium: false, level: 'Beginner', languageID: LANG })
    setModal({ type: 'add' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Admin endpoints persist level + premium (the /lessons path does not).
    const payload = {
      lessonName: form.lessonName, description: form.description,
      lessonOrder: form.lessonOrder, isActive: form.isActive,
      isPremium: form.isPremium, level: form.level,
    }
    try {
      if (modal.type === 'add') await adminCreateLesson(payload)
      else await adminUpdateLesson(form.lessonID, payload)
      setModal(null); load(); flash('Lesson saved!')
    } catch { flash('Error saving lesson') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lesson?')) return
    try { await deleteLesson(id); load(); flash('Lesson deleted') }
    catch { flash('Error deleting lesson') }
  }

  const exportLessons = async () => {
    try {
      const res = await fetch('/api/admin/export/lessons', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'lessons.csv'; a.click()
    } catch { flash('Export failed') }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw',
          background: 'radial-gradient(ellipse,rgba(56,189,248,0.05) 0%,transparent 70%)', borderRadius: '50%' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AdminNav activePath="/admin/lessons" />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 80px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 4px' }}>Lesson Management</h1>
              <p style={{ color: T.muted, fontSize: '0.88rem', margin: 0 }}>Add, edit lessons and import content in bulk</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setImportOpen(true)}
                style={{ padding: '10px 20px', borderRadius: 11, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.88rem',
                  background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1a1a00' }}>
                📥 Import Data
              </button>
              <button onClick={exportLessons}
                style={{ padding: '10px 20px', borderRadius: 11, border: '1px solid rgba(52,211,153,0.3)',
                  background: 'rgba(52,211,153,0.08)', color: T.success, fontWeight: 700,
                  fontSize: '0.88rem', cursor: 'pointer' }}>
                📤 Export Lessons
              </button>
              <button onClick={openAdd}
                style={{ padding: '10px 20px', borderRadius: 11, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.88rem',
                  background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff' }}>
                ➕ Add Lesson
              </button>
            </div>
          </div>

          {msg && (
            <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid #34d39940',
              borderRadius: 10, padding: '10px 16px', marginBottom: 20, color: T.success, fontSize: '0.88rem' }}>
              ✓ {msg}
            </div>
          )}

          {/* Import help banner */}
          <div style={{ ...glass(T.gold), padding: '14px 20px', marginBottom: 22,
            display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.4rem' }}>💡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: T.gold, fontSize: '0.9rem', marginBottom: 2 }}>Bulk Import with CSV</div>
              <div style={{ color: T.muted, fontSize: '0.82rem' }}>
                Click "Import Data" → select type → download template → fill in data → upload.
                Supports: Lessons (with Level), Word Content, MCQ, Arrange, Translate, Reading.
              </div>
            </div>
          </div>

          {/* Lesson table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading…</div>
          ) : (
            <div style={{ ...glass(T.accent), overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['#','Lesson Name','Level','Words','MCQ','Arrange','Translate','Reading','Status','Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left',
                        color: T.muted, fontWeight: 700, fontSize: '0.75rem', letterSpacing: 1, textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l) => {
                    const s = stats[l.lessonID] || {}
                    return (
                      <tr key={l.lessonID} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '12px 14px', color: T.muted, fontFamily: 'monospace' }}>
                          {l.lessonOrder}
                          {l.isPremium && <span style={{ marginLeft: 6, fontSize: '0.7rem', background: 'rgba(251,191,36,0.15)',
                            color: T.gold, borderRadius: 5, padding: '2px 7px', fontFamily: 'sans-serif' }}>💎</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: T.text }}>{l.lessonName}</div>
                          <div style={{ color: T.muted, fontSize: '0.78rem', marginTop: 2, maxWidth: 260,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {l.description}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: 'rgba(129,140,248,0.12)', color: T.purple,
                            borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                            {LEVEL_ICONS[l.level] || '🌱'} {l.level || 'Beginner'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: s.wordcount > 0 ? T.success : T.danger, fontWeight: 700 }}>
                          {s.wordcount ?? '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: s.mcqcount > 0 ? T.accent : T.danger, fontWeight: 700 }}>
                          {s.mcqcount ?? '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: s.arrangecount > 0 ? T.orange : T.danger, fontWeight: 700 }}>
                          {s.arrangecount ?? '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: s.translatecount > 0 ? T.gold : T.danger, fontWeight: 700 }}>
                          {s.translatecount ?? '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: s.readingcount > 0 ? T.accent : T.danger, fontWeight: 700 }}>
                          {s.readingcount ?? '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ color: l.isActive ? T.success : T.muted, fontWeight: 700, fontSize: '0.82rem' }}>
                            {l.isActive ? '● Active' : '○ Off'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Link to={`/admin/lesson/${l.lessonID}/content`}
                              style={{ ...btn(T.success), textDecoration: 'none', padding: '6px 14px' }}
                              title="Manage all content">⚙ Manage</Link>
                            <button onClick={() => openEdit(l)} style={btn(T.purple)}>Edit</button>
                            <button onClick={() => handleDelete(l.lessonID)}
                              style={btn(T.danger)}>Del</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {lessons.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: T.muted }}>
                  No lessons yet. Click "Add Lesson" or use "Import Data".
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ ...glass(T.accent), padding: '28px 28px', maxWidth: 480, width: '100%' }}>
              <h2 style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 22 }}>
                {modal.type === 'add' ? '➕ Add New Lesson' : '✏️ Edit Lesson'}
              </h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>
                    LESSON NAME
                  </label>
                  <input required value={form.lessonName}
                    onChange={e => setForm({...form, lessonName: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)', color: T.text, fontSize: '0.92rem',
                      outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>
                    DESCRIPTION
                  </label>
                  <textarea rows={3} value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)', color: T.text, fontSize: '0.88rem',
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>ORDER</label>
                    <input type="number" value={form.lessonOrder}
                      onChange={e => setForm({...form, lessonOrder: parseInt(e.target.value)})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)', color: T.text, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>TYPE ID</label>
                    <input type="number" value={form.lessonTypeID}
                      onChange={e => setForm({...form, lessonTypeID: parseInt(e.target.value)})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)', color: T.text, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>
                    LEVEL
                  </label>
                  <select value={form.level}
                    onChange={e => setForm({...form, level: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)', color: T.text, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
                    {LEVELS.map(lv => <option key={lv} value={lv}>{LEVEL_ICONS[lv]} {lv}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input type="checkbox" checked={form.isActive}
                      onChange={e => setForm({...form, isActive: e.target.checked})} />
                    Active
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input type="checkbox" checked={form.isPremium}
                      onChange={e => setForm({...form, isPremium: e.target.checked})} />
                    💎 Premium
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="button" onClick={() => setModal(null)}
                    style={{ flex: 1, padding: '11px 0', borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.05)', color: T.muted, cursor: 'pointer', fontWeight: 700 }}>
                    Cancel
                  </button>
                  <button type="submit"
                    style={{ flex: 2, padding: '11px 0', borderRadius: 11, border: 'none',
                      background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    {modal.type === 'add' ? 'Create Lesson' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {importOpen && <ImportModal onClose={() => { setImportOpen(false); load() }} />}
      </AnimatePresence>
    </div>
  )
}
