import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' })

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)', accent: '#38bdf8', accent2: '#818cf8',
  accent3: '#34d399', gold: '#fbbf24', danger: '#f87171', text: '#e2e8f0', muted: '#64748b',
}
const glass = (a = T.accent) => ({ background: T.card, border: `1px solid ${a}22`, borderRadius: 14, backdropFilter: 'blur(12px)' })

export default function AdminSchools() {
  const [schools, setSchools] = useState([])
  const [selected, setSelected] = useState(null)
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ schoolName: '', schoolCode: '', address: '', contactEmail: '', contactPhone: '' })
  const [msg, setMsg] = useState('')

  const loadSchools = async () => {
    const r = await fetch(`${BASE}/school`, { headers: authHeaders() })
    const data = await r.json()
    setSchools(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const loadSchoolDetail = async (school) => {
    setSelected(school)
    const [u, s, p] = await Promise.all([
      fetch(`${BASE}/school/${school.school_id}/users`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${BASE}/school/${school.school_id}/stats`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${BASE}/school/${school.school_id}/progress`, { headers: authHeaders() }).then(r => r.json()),
    ])
    setUsers(Array.isArray(u) ? u : [])
    setStats(s)
    setProgress(Array.isArray(p) ? p : [])
  }

  const approveUser = async (schoolId, userId) => {
    await fetch(`${BASE}/school/${schoolId}/users/${userId}/approve`, { method: 'POST', headers: authHeaders() })
    loadSchoolDetail(selected)
  }

  const createSchool = async () => {
    const r = await fetch(`${BASE}/school`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(form)
    })
    if (r.ok) {
      setMsg('School created!'); setShowForm(false)
      setForm({ schoolName: '', schoolCode: '', address: '', contactEmail: '', contactPhone: '' })
      loadSchools()
    } else setMsg('Failed to create school')
    setTimeout(() => setMsg(''), 3000)
  }

  useEffect(() => { loadSchools() }, [])

  const roleColor = { Student: T.accent3, Teacher: T.accent2, Headmaster: T.gold }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <nav style={{ background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,179,237,0.1)', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link to="/admin" style={{ color: T.accent, textDecoration: 'none', fontWeight: 900, fontSize: '1.1rem' }}>✦ Admin</Link>
        <span style={{ color: T.muted }}>/ Schools</span>
        <div style={{ flex: 1 }} />
        <Link to="/admin" style={{ color: T.muted, textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Admin</Link>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Left: School list */}
        <div style={{ flex: '0 0 320px', minWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>🏫 Schools</h2>
            <button onClick={() => setShowForm(v => !v)}
              style={{ padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
              + Add School
            </button>
          </div>

          {msg && <div style={{ ...glass(T.accent3), padding: '10px 16px', marginBottom: 12, color: T.accent3, fontSize: '0.85rem' }}>{msg}</div>}

          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ ...glass(T.accent), padding: 16, marginBottom: 16, overflow: 'hidden' }}>
                {[
                  ['schoolName', 'School Name *'],
                  ['schoolCode', 'School Code'],
                  ['address', 'Address'],
                  ['contactEmail', 'Contact Email'],
                  ['contactPhone', 'Contact Phone'],
                ].map(([key, label]) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.75rem', color: T.muted, marginBottom: 4 }}>{label}</div>
                    <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: T.text, fontSize: '0.88rem', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={createSchool} style={{ flex: 1, padding: '9px', borderRadius: 8, background: 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Save</button>
                  <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '9px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: T.muted, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? <div style={{ color: T.muted, textAlign: 'center', padding: 40 }}>Loading…</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {schools.map(s => (
                <motion.div key={s.school_id} onClick={() => loadSchoolDetail(s)} whileHover={{ x: 2 }}
                  style={{ ...glass(selected?.school_id === s.school_id ? T.accent : T.muted), padding: '14px 18px', cursor: 'pointer',
                    border: `1px solid ${selected?.school_id === s.school_id ? T.accent : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.school_name}</div>
                  <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: 4 }}>
                    Code: {s.school_code || '—'} · {s.student_count || 0} Students · {s.teacher_count || 0} Teachers
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: s.is_active ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', color: s.is_active ? T.accent3 : T.danger }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </motion.div>
              ))}
              {schools.length === 0 && <div style={{ color: T.muted, fontSize: '0.88rem', textAlign: 'center', padding: 24 }}>No schools yet. Add one above.</div>}
            </div>
          )}
        </div>

        {/* Right: School detail */}
        <div style={{ flex: 1, minWidth: 400 }}>
          {!selected ? (
            <div style={{ ...glass(T.muted), padding: 40, textAlign: 'center', color: T.muted }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏫</div>
              <p>Select a school to view details</p>
            </div>
          ) : (
            <>
              <div style={{ ...glass(T.accent), padding: '20px 24px', marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 900, color: T.accent }}>{selected.school_name}</h2>
                <div style={{ color: T.muted, fontSize: '0.85rem' }}>{selected.contact_email} · {selected.contact_phone}</div>
              </div>

              {/* Stats */}
              {stats && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Students', value: stats.total_students || 0, icon: '👨‍🎓', color: T.accent3 },
                    { label: 'Teachers', value: stats.total_teachers || 0, icon: '👩‍🏫', color: T.accent2 },
                    { label: 'Pending', value: stats.pending_approvals || 0, icon: '⏳', color: T.gold },
                    { label: 'Avg Lessons', value: stats.avg_lessons_per_student || 0, icon: '📚', color: T.accent },
                  ].map(s => (
                    <div key={s.label} style={{ flex: '1 1 100px', ...glass(s.color), padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24 }}>{s.icon}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.72rem', color: T.muted }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* User list */}
              <div style={{ ...glass(T.accent2), padding: '16px 20px', marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700 }}>👥 Members</h3>
                {users.length === 0 ? (
                  <div style={{ color: T.muted, fontSize: '0.85rem' }}>No users yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {users.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: T.muted }}>{u.email} {u.class_name ? `· Class: ${u.class_name}` : ''}</div>
                        </div>
                        <span style={{ fontSize: '0.72rem', padding: '2px 10px', borderRadius: 99, background: `${roleColor[u.school_role] || T.muted}20`, color: roleColor[u.school_role] || T.muted, fontWeight: 700 }}>
                          {u.school_role}
                        </span>
                        {!u.is_approved && (
                          <button onClick={() => approveUser(selected.school_id, u.user_id)}
                            style={{ padding: '4px 12px', borderRadius: 6, background: 'linear-gradient(135deg,#34d399,#059669)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}>
                            Approve
                          </button>
                        )}
                        {u.is_approved && <span style={{ fontSize: '0.72rem', color: T.accent3 }}>✓ Active</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student progress */}
              {progress.length > 0 && (
                <div style={{ ...glass(T.accent3), padding: '16px 20px' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700 }}>📊 Student Progress</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {progress.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.full_name}</div>
                          <div style={{ fontSize: '0.72rem', color: T.muted }}>Streak: {p.current_streak} days · XP: {p.total_xp}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: T.accent3, fontSize: '0.95rem' }}>{p.lessons_completed}</div>
                          <div style={{ fontSize: '0.7rem', color: T.muted }}>lessons</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
