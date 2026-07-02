import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getPackages, getPackage, createPackage, updatePackage, deletePackage,
  assignLessonToPackage, adminGetLessons,
} from '../services/api'
import AdminNav from '../components/AdminNav'

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)',
  accent: '#38bdf8', gold: '#fbbf24', success: '#34d399',
  danger: '#f87171', purple: '#818cf8', orange: '#fb923c',
  text: '#e2e8f0', muted: '#64748b',
}
const glass = (a = T.accent) => ({ background: T.card, border: `1px solid ${a}25`, borderRadius: 16, backdropFilter: 'blur(12px)' })
const btn = (bg, col = '#fff') => ({ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', background: bg, color: col })
const input = { width: '100%', padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: T.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }

const PKG_LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const CATEGORIES = ['Grammar', 'Vocabulary', 'Conversation']
const CAT_ICON = { Grammar: '📝', Vocabulary: '📖', Conversation: '💬' }
const CAT_COLOR = { Grammar: '#818cf8', Vocabulary: '#34d399', Conversation: '#fb923c' }

export default function AdminPackages() {
  const [packages, setPackages] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)       // { type:'add'|'edit', pkg? }
  const [form, setForm] = useState({ name: '', level: 'Beginner', description: '', displayOrder: 1, isActive: true })
  const [detail, setDetail] = useState(null)     // { package, lessons } for the open package
  const [msg, setMsg] = useState('')

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, lr] = await Promise.all([getPackages(), adminGetLessons().catch(() => ({ data: [] }))])
      setPackages(pr.data || [])
      setLessons(lr.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm({ name: '', level: 'Beginner', description: '', displayOrder: packages.length + 1, isActive: true }); setModal({ type: 'add' }) }
  const openEdit = (p) => {
    setForm({ name: p.name, level: p.level, description: p.description || '', displayOrder: p.display_order, isActive: p.is_active })
    setModal({ type: 'edit', pkg: p })
  }

  const save = async (e) => {
    e.preventDefault()
    try {
      if (modal.type === 'add') await createPackage(form)
      else await updatePackage(modal.pkg.package_id, form)
      setModal(null); flash('Package saved'); load()
    } catch { flash('Error saving package') }
  }

  const del = async (id) => {
    if (!window.confirm('Deactivate this package? Its lessons will be unlinked (not deleted).')) return
    try { await deletePackage(id); flash('Package deactivated'); if (detail?.package?.package_id === id) setDetail(null); load() }
    catch { flash('Error deleting package') }
  }

  const openDetail = async (id) => {
    try { const r = await getPackage(id); setDetail(r.data) } catch { flash('Failed to load package') }
  }

  const assign = async (lessonId, packageId, category) => {
    try {
      await assignLessonToPackage({ lessonId, packageId, category })
      flash('Lesson assigned'); load()
      if (detail) openDetail(detail.package.package_id)
    } catch { flash('Error assigning lesson') }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AdminNav activePath="/admin/packages" />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 4px' }}>📦 Learning Packages</h1>
              <p style={{ color: T.muted, fontSize: '0.88rem', margin: 0 }}>Group lessons by level and category (Grammar / Vocabulary / Conversation)</p>
            </div>
            <button onClick={openAdd} style={{ ...btn('linear-gradient(135deg,#38bdf8,#818cf8)'), padding: '10px 20px' }}>➕ Add Package</button>
          </div>

          {msg && (
            <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid #34d39940', borderRadius: 10, padding: '10px 16px', marginBottom: 20, color: T.success, fontSize: '0.88rem' }}>✓ {msg}</div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
              {packages.map(p => (
                <motion.div key={p.package_id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  style={{ ...glass(T.purple), padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{p.name}</div>
                    <span style={{ background: 'rgba(129,140,248,0.15)', color: T.purple, borderRadius: 6, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{p.level}</span>
                  </div>
                  {p.description && <div style={{ color: T.muted, fontSize: '0.82rem', marginBottom: 12, lineHeight: 1.5 }}>{p.description}</div>}
                  <div style={{ color: T.accent, fontSize: '0.82rem', fontWeight: 700, marginBottom: 14 }}>📚 {p.lesson_count} lessons</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={btn('rgba(56,189,248,0.15)', T.accent)} onClick={() => openDetail(p.package_id)}>View / Assign</button>
                    <button style={btn('rgba(129,140,248,0.15)', T.purple)} onClick={() => openEdit(p)}>Edit</button>
                    <button style={btn('rgba(248,113,113,0.15)', T.danger)} onClick={() => del(p.package_id)}>Del</button>
                  </div>
                </motion.div>
              ))}
              {!packages.length && <div style={{ color: T.muted, padding: 40 }}>No packages yet. Click "Add Package".</div>}
            </div>
          )}

          {/* Package detail — lessons grouped by category + assign panel */}
          {detail && (
            <div style={{ ...glass(T.accent), padding: '22px 24px', marginTop: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{detail.package.name} — lessons</h2>
                <button style={btn('rgba(255,255,255,0.08)', T.muted)} onClick={() => setDetail(null)}>✕ Close</button>
              </div>

              {CATEGORIES.map(cat => {
                const inCat = (detail.lessons || []).filter(l => (l.category || 'Grammar') === cat)
                return (
                  <div key={cat} style={{ marginBottom: 18 }}>
                    <div style={{ fontWeight: 700, color: CAT_COLOR[cat], marginBottom: 8 }}>{CAT_ICON[cat]} {cat} ({inCat.length})</div>
                    {inCat.length === 0
                      ? <div style={{ color: T.muted, fontSize: '0.82rem', paddingLeft: 22 }}>No {cat.toLowerCase()} lessons.</div>
                      : <div style={{ display: 'grid', gap: 6, paddingLeft: 22 }}>
                          {inCat.map(l => (
                            <div key={l.lessonid} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 12px' }}>
                              <span style={{ color: T.muted, fontFamily: 'monospace', fontSize: '0.8rem' }}>#{l.lessonorder}</span>
                              <span style={{ flex: 1, fontSize: '0.88rem' }}>{l.lessonname}</span>
                            </div>
                          ))}
                        </div>}
                  </div>
                )
              })}

              {/* Assign a lesson into this package */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginTop: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 10, color: T.gold }}>➕ Assign a lesson to this package</div>
                <AssignRow lessons={lessons} packageId={detail.package.package_id} onAssign={assign} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      <AnimatePresence>
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()} style={{ ...glass(T.accent), padding: '26px 28px', maxWidth: 460, width: '100%' }}>
              <h2 style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 20 }}>{modal.type === 'add' ? '➕ Add Package' : '✏️ Edit Package'}</h2>
              <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>NAME</label>
                  <input required style={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Beginner Package" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>LEVEL</label>
                    <select style={{ ...input, cursor: 'pointer' }} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                      {PKG_LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>ORDER</label>
                    <input type="number" style={input} value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>DESCRIPTION</label>
                  <textarea rows={2} style={{ ...input, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                {modal.type === 'edit' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Active
                  </label>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button type="button" onClick={() => setModal(null)} style={{ ...btn('rgba(255,255,255,0.06)', T.muted), flex: 1, padding: '11px 0' }}>Cancel</button>
                  <button type="submit" style={{ ...btn('linear-gradient(135deg,#38bdf8,#818cf8)'), flex: 2, padding: '11px 0' }}>{modal.type === 'add' ? 'Create' : 'Save'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AssignRow({ lessons, packageId, onAssign }) {
  const [lessonId, setLessonId] = useState('')
  const [category, setCategory] = useState('Grammar')
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <select value={lessonId} onChange={e => setLessonId(e.target.value)} style={{ ...input, width: 'auto', flex: 1, minWidth: 180, cursor: 'pointer' }}>
        <option value="">Select lesson…</option>
        {lessons.map(l => <option key={l.lessonid} value={l.lessonid}>#{l.lessonorder} — {l.lessonname}</option>)}
      </select>
      <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...input, width: 'auto', cursor: 'pointer' }}>
        {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
      </select>
      <button disabled={!lessonId} style={{ ...btn(lessonId ? T.success : 'rgba(255,255,255,0.08)', lessonId ? '#000' : T.muted) }}
        onClick={() => { if (lessonId) { onAssign(parseInt(lessonId), packageId, category); setLessonId('') } }}>
        Assign
      </button>
    </div>
  )
}
