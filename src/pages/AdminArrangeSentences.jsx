import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getArrangeSentences, addArrangeSentence, deleteArrangeSentence } from '../services/api'
import { useAuth } from '../context/AuthContext'

const LANGUAGE_ID = 1

export default function AdminArrangeSentences() {
  const { lessonId } = useParams()
  const { logout } = useAuth()
  const [sentences, setSentences] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    correctSentence: '',
    tamilMeaning: '',
    words: ''
  })

  useEffect(() => {
    fetchSentences()
  }, [lessonId])

  const fetchSentences = async () => {
    setLoading(true)
    try {
      const res = await getArrangeSentences(lessonId, LANGUAGE_ID)
      setSentences(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        lessonID: parseInt(lessonId),
        languageID: LANGUAGE_ID,
        correctSentence: form.correctSentence,
        tamilMeaning: form.tamilMeaning,
        words: form.words.split(',').map(s => s.trim()).filter(s => s !== '')
      }
      await addArrangeSentence(payload)
      setShowModal(false)
      setForm({ correctSentence: '', tamilMeaning: '', words: '' })
      fetchSentences()
    } catch (err) {
      alert('Error adding sentence')
    }
  }

  const handleDelete = async (sid) => {
    if (!window.confirm('Are you sure you want to delete this sentence?')) return
    try {
      await deleteArrangeSentence(sid)
      fetchSentences()
    } catch (err) {
      alert('Error deleting sentence')
    }
  }

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <nav className="navbar">
          <span className="navbar-logo">✦ Spoken English (Admin)</span>
          <div className="navbar-links">
            <Link to="/admin/lessons" className="nav-link">Lesson Management</Link>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
          </div>
        </nav>

        <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <Link to="/admin/lessons" className="text-violet-glow text-sm hover:underline">← Back to Lessons</Link>
              <h1 className="heading-md mt-2">🧩 Manage Arrange Words</h1>
              <p className="text-muted">Lesson #{lessonId} — Sentence rearrangement exercises</p>
            </div>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              + New Sentence
            </button>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : sentences.length === 0 ? (
            <div className="alert alert-info">No sentences found for this lesson. Click "+ New Sentence" to add one.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {sentences.map((s, i) => (
                <motion.div key={s.arrangeSentenceID} className="card"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div className="text-violet-glow font-bold mb-1">Tamil: {s.tamilMeaning || '---'}</div>
                    <div className="heading-sm mb-2">{s.correctSentence}</div>
                    <div className="flex gap-2 flex-wrap">
                      {s.words.sort((a,b) => a.correctOrder - b.correctOrder).map(w => (
                        <span key={w.wordID} className="badge badge-cyan">{w.wordText}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(s.arrangeSentenceID)} className="btn btn-sm btn-danger" style={{ marginLeft: 20 }}>
                    Delete
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}>
              <h2 className="heading-sm mb-6">Add Arrange Sentence</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold mb-1 block">Correct Sentence (English)</label>
                  <input className="form-input w-full" required placeholder="e.g. She eats rice everyday"
                    value={form.correctSentence} onChange={e => setForm({...form, correctSentence: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block">Tamil Meaning (Optional)</label>
                  <input className="form-input w-full" placeholder="e.g. அவள் ஒவ்வொரு நாளும் சாப்பிடுவாள்"
                    value={form.tamilMeaning} onChange={e => setForm({...form, tamilMeaning: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block">Words (Comma separated)</label>
                  <textarea className="form-input w-full" required rows="3" placeholder="e.g. She, eats, rice, everyday"
                    value={form.words} onChange={e => setForm({...form, words: e.target.value})} />
                  <p className="text-xs text-muted mt-1">Order matters. Provide words in the correct sequence.</p>
                </div>
                <div className="flex gap-4 mt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
