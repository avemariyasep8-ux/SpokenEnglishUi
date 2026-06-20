import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]   = useState({ email: '', mobnumber: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await register(form.email, form.mobnumber, form.password)
      // auto-login after register
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Email or Mobile may already exist.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div className="auth-page">
        <motion.div className="auth-card"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚀</div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Start your English learning journey today</p>
          </div>

          {error && <div className="alert alert-error mb-4">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input id="reg-email" className="form-input" type="email" placeholder="you@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input id="reg-mob" className="form-input" type="text" placeholder="e.g. 9876543210"
                value={form.mobnumber}
                onChange={(e) => setForm({ ...form, mobnumber: e.target.value })}
                required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="reg-password" className="form-input" type="password" placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input id="reg-confirm" className="form-input" type="password" placeholder="Re-enter password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required />
            </div>
            <button id="reg-btn" type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '14px' }} disabled={loading}>
              {loading ? 'Creating Account...' : '🚀 Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account? <Link to="/login" style={{ color: 'var(--violet-glow)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
