import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export default function Register() {
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', mobnumber: '', password: '', confirm: '',
    fullName: '', schoolId: '', schoolRole: '', className: '',
  })
  const [schools, setSchools] = useState([])
  const [showSchool, setShowSchool] = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`${BASE}/school`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setSchools(Array.isArray(d) ? d.filter(s => s.is_active) : []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 6)       { setError('Password must be at least 6 characters.'); return }
    if (showSchool && !form.schoolRole) { setError('Please select your role in the school.'); return }
    setLoading(true)
    try {
      await register(form.email, form.mobnumber, form.password, {
        fullName: form.fullName,
        schoolId: showSchool && form.schoolId ? parseInt(form.schoolId) : null,
        schoolRole: showSchool ? form.schoolRole : null,
        className: showSchool ? form.className : null,
      })
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Email or Mobile may already exist.')
    } finally { setLoading(false) }
  }

  const inp = { width: '100%', padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontSize: '0.78rem', color: '#64748b', marginBottom: 5, display: 'block', fontWeight: 600 }

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div className="auth-page">
        <motion.div className="auth-card"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>🚀</div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Start your English learning journey today</p>
          </div>

          {error && <div className="alert alert-error mb-4">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>Full Name</label>
              <input style={inp} type="text" placeholder="Your full name"
                value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Email Address *</label>
              <input id="reg-email" style={inp} type="email" placeholder="you@email.com" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Mobile Number *</label>
              <input id="reg-mob" style={inp} type="text" placeholder="e.g. 9876543210" required
                value={form.mobnumber} onChange={e => setForm({ ...form, mobnumber: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Password *</label>
              <input id="reg-password" style={inp} type="password" placeholder="Min 6 characters" required
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Confirm Password *</label>
              <input id="reg-confirm" style={inp} type="password" placeholder="Re-enter password" required
                value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
            </div>

            {/* School toggle */}
            <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 12, padding: '14px 18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={showSchool} onChange={e => setShowSchool(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <span style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>🏫 I belong to a school / institution</span>
              </label>

              {showSchool && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                  <div>
                    <label style={lbl}>School</label>
                    <select value={form.schoolId} onChange={e => setForm({ ...form, schoolId: e.target.value })}
                      style={{ ...inp, cursor: 'pointer' }}>
                      <option value="">Select school (optional)</option>
                      {schools.map(s => <option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Role *</label>
                    <select value={form.schoolRole} onChange={e => setForm({ ...form, schoolRole: e.target.value })}
                      style={{ ...inp, cursor: 'pointer' }}>
                      <option value="">Select your role</option>
                      <option value="Student">🎒 Student</option>
                      <option value="Teacher">👩‍🏫 Teacher</option>
                      <option value="Headmaster">🏛 Headmaster / Principal</option>
                    </select>
                  </div>
                  {form.schoolRole === 'Student' && (
                    <div>
                      <label style={lbl}>Class / Section (optional)</label>
                      <input style={inp} type="text" placeholder="e.g. 10-A, Grade 8"
                        value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} />
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <button id="reg-btn" type="submit" className="btn btn-primary w-full"
              style={{ justifyContent: 'center', padding: '13px', marginTop: 4 }} disabled={loading}>
              {loading ? 'Creating Account...' : '🚀 Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--violet-glow)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
