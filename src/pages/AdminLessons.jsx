import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getLessons, addLesson, updateLesson, deleteLesson } from '../services/api'
import { useAuth } from '../context/AuthContext'

const LANGUAGE_ID = 1

export default function AdminLessons() {
  const { logout } = useAuth()
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type: 'add'|'edit', lesson?: any }
  const [form, setForm] = useState({ lessonName: '', description: '', lessonTypeID: 1, lessonOrder: 0, isActive: true })

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    setLoading(true)
    try {
      const res = await getLessons(LANGUAGE_ID)
      setLessons(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (type, lesson = null) => {
    if (lesson) {
      setForm({
        lessonID: lesson.lessonID,
        lessonName: lesson.lessonName,
        description: lesson.description || '',
        lessonTypeID: lesson.lessonTypeID || 1,
        lessonOrder: lesson.lessonOrder,
        isActive: lesson.isActive,
        languageID: LANGUAGE_ID
      })
    } else {
      setForm({ lessonName: '', description: '', lessonTypeID: 1, lessonOrder: lessons.length + 1, isActive: true, languageID: LANGUAGE_ID })
    }
    setModal({ type, lesson })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (modal.type === 'add') {
        await addLesson(form)
      } else {
        await updateLesson(form)
      }
      setModal(null)
      fetchLessons()
    } catch (err) {
      alert('Error saving lesson')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return
    try {
      await deleteLesson(id)
      fetchLessons()
    } catch (err) {
      alert('Error deleting lesson')
    }
  }

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <nav className="navbar">
          <span className="navbar-logo">✦ Spoken English (Admin)</span>
          <div className="navbar-links">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/admin/bulk" className="nav-link">Bulk Import</Link>
            <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
          </div>
        </nav>

        <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="heading-md">Lesson Management</h1>
              <p className="text-muted">Create and manage your course structure</p>
            </div>
            <button onClick={() => handleOpenModal('add')} className="btn btn-primary">
              + New Lesson
            </button>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="table-responsive bg-dark-glass rounded-xl p-4 border border-violet-glow/20">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-violet-glow uppercase text-xs font-bold tracking-wider">
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l) => (
                    <tr key={l.lessonID} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-mono">#{l.lessonOrder}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold">{l.lessonName}</div>
                        <div className="text-xs text-muted truncate max-w-xs">{l.description}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="badge badge-violet">{l.typeName || 'General'}</span>
                      </td>
                      <td className="py-4 px-4">
                        {l.isActive ? (
                          <span className="text-green flex items-center gap-1 text-sm">● Active</span>
                        ) : (
                          <span className="text-muted flex items-center gap-1 text-sm">○ Inactive</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/meaning/${l.lessonID}`} className="btn btn-cyan btn-sm" title="Manage Meanings">
                            ❓
                          </Link>
                          <Link to={`/admin/arrange/${l.lessonID}`} className="btn btn-violet btn-sm" style={{ minWidth: 40 }} title="Manage Arrange Sentences">
                            🧩
                          </Link>
                          <button onClick={() => handleOpenModal('edit', l)} className="btn btn-secondary btn-sm">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(l.lessonID)} className="btn btn-sm" style={{ background: 'rgba(255,100,100,0.1)', color: '#ff6b6b' }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <div className="modal-overlay" onClick={() => setModal(null)}>
            <motion.div className="modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}>
              <h2 className="heading-sm mb-6">{modal.type === 'add' ? 'Add New Lesson' : 'Edit Lesson'}</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold mb-1 block">Lesson Name</label>
                  <input className="form-input" required value={form.lessonName}
                    onChange={e => setForm({...form, lessonName: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block">Description</label>
                  <textarea className="form-input" rows="3" value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold mb-1 block">Order</label>
                    <input type="number" className="form-input" value={form.lessonOrder}
                      onChange={e => setForm({...form, lessonOrder: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1 block">Lesson Type ID</label>
                    <input type="number" className="form-input" value={form.lessonTypeID}
                      onChange={e => setForm({...form, lessonTypeID: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={form.isActive}
                    onChange={e => setForm({...form, isActive: e.target.checked})} />
                  <label className="text-sm">Active</label>
                </div>
                <div className="flex gap-4 mt-4">
                  <button type="button" onClick={() => setModal(null)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    {modal.type === 'add' ? 'Create' : 'Save Changes'}
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
