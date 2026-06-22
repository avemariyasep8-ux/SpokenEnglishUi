import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getMeaningQuestionsAdmin, addMeaningQuestion, updateMeaningQuestion, deleteMeaningQuestion, addMeaningOption, updateMeaningOption, deleteMeaningOption } from '../services/api'
import { useAuth } from '../context/AuthContext'
import AdminNav from '../components/AdminNav'

const LANGUAGE_ID = 1

export default function AdminMeaningQuestions() {
  const { lessonId } = useParams()
  const { logout } = useAuth()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type: 'add-q'|'edit-q'|'add-o'|'edit-o', data?: any }
  const [form, setForm] = useState({})

  useEffect(() => {
    fetchQuestions()
  }, [lessonId])

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const res = await getMeaningQuestionsAdmin(lessonId, LANGUAGE_ID)
      setQuestions(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (type, data = null) => {
    if (type.includes('q')) {
      setForm(data || { lessonID: parseInt(lessonId), languageID: LANGUAGE_ID, questionText: '' })
    } else {
      setForm(data || { questionID: modal?.parentQuestionId, languageID: LANGUAGE_ID, optionText: '', isCorrect: false })
    }
    setModal({ type, data, parentQuestionId: data?.questionID || modal?.parentQuestionId })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (modal.type === 'add-q') await addMeaningQuestion(form)
      else if (modal.type === 'edit-q') await updateMeaningQuestion(form)
      else if (modal.type === 'add-o') await addMeaningOption({ ...form, questionID: modal.parentQuestionId })
      else if (modal.type === 'edit-o') await updateMeaningOption(form)
      
      setModal(null)
      fetchQuestions()
    } catch (err) {
      alert('Error saving data')
    }
  }

  const handleDeleteQ = async (id) => {
    if (!window.confirm('Delete question and all options?')) return
    await deleteMeaningQuestion(id)
    fetchQuestions()
  }

  const handleDeleteO = async (id) => {
    if (!window.confirm('Delete this option?')) return
    await deleteMeaningOption(id)
    fetchQuestions()
  }

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AdminNav activePath="/admin/lessons" />

        <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
          <div className="flex justify-between items-center mb-10">
            <div>
              <Link to="/admin/lessons" className="text-cyan text-sm mb-2 block">← Back to Lessons</Link>
              <h1 className="heading-md">Manage Choose the Answer</h1>
              <p className="text-muted">Edit questions and multiple-choice options</p>
            </div>
            <button onClick={() => handleOpenModal('add-q')} className="btn btn-primary">
              + Add Question
            </button>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="flex flex-col gap-8">
              {questions.map((q, i) => (
                <motion.div key={q.questionID} className="bg-dark-glass rounded-2xl border border-white/10 overflow-hidden"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}>
                  <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/5">
                    <div>
                      <span className="text-xs font-bold text-violet-glow uppercase tracking-widest mb-1 block">Question #{q.questionID}</span>
                      <h3 className="text-xl font-bold">{q.questionText}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenModal('edit-q', q)} className="btn btn-secondary btn-sm">Edit</button>
                      <button onClick={() => handleDeleteQ(q.questionID)} className="btn btn-sm" style={{ background: 'rgba(255,100,100,0.1)', color: '#ff6b6b' }}>Delete</button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold opacity-60 uppercase">Options</h4>
                      <button onClick={() => { setModal({ parentQuestionId: q.questionID }); handleOpenModal('add-o') }} 
                        className="text-cyan text-sm font-bold hover:underline">+ Add Option</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map(opt => (
                        <div key={opt.optionID} className={`p-4 rounded-xl border flex justify-between items-center ${opt.isCorrect ? 'border-green/40 bg-green/5' : 'border-white/5 bg-white/5'}`}>
                          <div className="flex items-center gap-3">
                            {opt.isCorrect ? <span className="text-green">✅</span> : <span className="opacity-20">○</span>}
                            <span>{opt.optionText}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleOpenModal('edit-o', { ...opt, languageID: LANGUAGE_ID })} className="text-xs opacity-60 hover:opacity-100">Edit</button>
                            <button onClick={() => handleDeleteO(opt.optionID)} className="text-xs text-red-400 opacity-60 hover:opacity-100">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modal?.type && (
          <div className="modal-overlay">
            <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <h2 className="heading-sm mb-6">
                {modal.type === 'add-q' ? 'Add Question' : modal.type === 'edit-q' ? 'Edit Question' : modal.type === 'add-o' ? 'Add Option' : 'Edit Option'}
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {modal.type.includes('q') ? (
                  <div>
                    <label className="text-xs font-bold mb-1 block">Question Text</label>
                    <input className="form-input" required value={form.questionText || ''}
                      onChange={e => setForm({...form, questionText: e.target.value})} />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-bold mb-1 block">Option Text</label>
                      <input className="form-input" required value={form.optionText || ''}
                        onChange={e => setForm({...form, optionText: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.isCorrect || false}
                        onChange={e => setForm({...form, isCorrect: e.target.checked})} />
                      <label className="text-sm">Correct Answer</label>
                    </div>
                  </>
                )}
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setModal(null)} className="btn btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn btn-primary flex-1">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
