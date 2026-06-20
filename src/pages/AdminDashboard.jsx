import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../services/api'

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)',
  accent: '#38bdf8', gold: '#fbbf24', danger: '#f87171',
  success: '#34d399', text: '#e2e8f0', muted: '#64748b',
}
const glass = (a = T.accent) => ({
  background: T.card, border: `1px solid ${a}25`,
  borderRadius: 18, padding: '22px 24px', backdropFilter: 'blur(12px)',
})

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats,   setStats]   = useState(null)
  const [users,   setUsers]   = useState([])
  const [tab,     setTab]     = useState('overview')
  const [loading, setLoading] = useState(true)
  const [msg,     setMsg]     = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    if (user?.role !== 'Admin') return
    Promise.all([
      API.get('/admin/stats').then(r => setStats(r.data)),
      API.get('/admin/users').then(r => setUsers(r.data ?? [])),
    ]).finally(() => setLoading(false))
  }, [user])

  if (user?.role !== 'Admin') {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.danger }}>
        ⛔ Admin access only
      </div>
    )
  }

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const setRole = async (id, role) => {
    await API.post(`/admin/users/${id}/role`, { role })
    setUsers(u => u.map(x => x.id === id ? { ...x, role } : x))
    flash(`Role updated to ${role}`)
  }

  const toggleUser = async (id) => {
    await API.post(`/admin/users/${id}/toggle`)
    setUsers(u => u.map(x => x.id === id ? { ...x, isactive: !x.isactive } : x))
    flash('User status toggled')
  }

  const exportCsv = async (type) => {
    const res = await API.get(`/admin/export/${type}`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a'); a.href = url; a.download = `${type}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const importCsv = async () => {
    if (!importFile) return
    const fd = new FormData()
    fd.append('file', importFile)
    const res = await API.post('/admin/import/wordcontent', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    setImportResult(res.data)
    flash(`Imported ${res.data.imported} rows, skipped ${res.data.skipped}`)
  }

  const StatCard = ({ label, value, icon, color }) => (
    <div style={{ ...glass(color), textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: '2.2rem', fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: '0.82rem', color: T.muted, marginTop: 4 }}>{label}</div>
    </div>
  )

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)}
      style={{ padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
        background: tab === id ? T.accent : 'rgba(255,255,255,0.06)',
        color: tab === id ? '#000' : T.muted }}>
      {label}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Aura */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw',
          background: 'radial-gradient(ellipse,rgba(56,189,248,0.06) 0%,transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Navbar */}
        <nav style={{ background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(99,179,237,0.1)', padding: '12px 28px',
          display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontWeight: 900, color: T.accent, fontSize: '1.1rem' }}>⚙ Admin Panel</span>
          <div style={{ flex: 1 }} />
          <Link to="/lessons" style={{ color: T.muted, textDecoration: 'none', fontSize: '0.88rem' }}>← Back to App</Link>
          <button onClick={logout} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: T.muted, cursor: 'pointer', fontSize: '0.85rem' }}>
            Logout
          </button>
        </nav>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 8 }}>Welcome, {user?.email}</h1>
          {msg && (
            <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid #34d39940', color: T.success,
              borderRadius: 10, padding: '10px 18px', marginBottom: 20, fontSize: '0.9rem' }}>
              {msg}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 28 }}>
              <StatCard label="Total Users"    value={stats.totalUsers}  icon="👥" color={T.accent}   />
              <StatCard label="Lessons"        value={stats.totalLessons} icon="📚" color={T.success}  />
              <StatCard label="Active Subs"    value={stats.activeSubs}  icon="👑" color={T.gold}     />
              <StatCard label="Admins"         value={stats.admins}      icon="🔑" color={T.danger}   />
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/admin/add-lesson')}
              style={{ padding: '11px 22px', borderRadius: 11, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
              ➕ Add New Lesson
            </button>
            <Link to="/admin/bulk"
              style={{ padding: '11px 22px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)', color: T.muted, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
              📤 Bulk Upload
            </Link>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <TabBtn id="overview" label="👥 Users" />
            <TabBtn id="export"   label="📤 Export" />
            <TabBtn id="import"   label="📥 Import" />
          </div>

          {/* Users tab */}
          {tab === 'overview' && (
            <div style={{ ...glass(T.accent), overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['ID','Email','Mobile','Role','Status','Subscription','Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: T.muted, fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: T.muted }}>{u.id}</td>
                      <td style={{ padding: '10px 12px' }}>{u.email}</td>
                      <td style={{ padding: '10px 12px', color: T.muted }}>{u.mobilenumber || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <select value={u.role} onChange={e => setRole(u.id, e.target.value)}
                          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: T.text, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                          <option value="User">User</option>
                          <option value="Admin">Admin</option>
                          <option value="Premium">Premium</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: u.isactive ? T.success : T.danger, fontWeight: 700 }}>
                          {u.isactive ? '✓ Active' : '✗ Banned'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: u.substatus === 'active' ? T.gold : T.muted, fontSize: '0.8rem' }}>
                        {u.planname ? `${u.planname} (${u.substatus})` : 'Free'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => toggleUser(u.id)}
                          style={{ padding: '4px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                            background: u.isactive ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)',
                            color: u.isactive ? T.danger : T.success }}>
                          {u.isactive ? 'Ban' : 'Unban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Export tab */}
          {tab === 'export' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              {[
                { type: 'lessons',     label: '📚 Export Lessons',      desc: 'All lesson names and orders' },
                { type: 'wordcontent', label: '📖 Export Word Content',  desc: 'Definitions, patterns, examples' },
                { type: 'mcq',         label: '❓ Export MCQ',           desc: 'Questions and all options' },
              ].map(e => (
                <div key={e.type} style={{ ...glass(T.success) }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{e.label}</div>
                  <div style={{ color: T.muted, fontSize: '0.83rem', marginBottom: 16 }}>{e.desc}</div>
                  <button onClick={() => exportCsv(e.type)}
                    style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', background: 'linear-gradient(135deg,#34d399,#059669)', color: '#fff', width: '100%' }}>
                    ⬇ Download CSV
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Import tab */}
          {tab === 'import' && (
            <div style={{ ...glass(T.gold), maxWidth: 520 }}>
              <h3 style={{ color: T.gold, marginBottom: 6, fontSize: '1.05rem' }}>📥 Import Word Content</h3>
              <p style={{ color: T.muted, fontSize: '0.84rem', marginBottom: 20 }}>
                Upload a CSV exported from the Export tab (same format). New rows are inserted; duplicates are skipped.
              </p>
              <input type="file" accept=".csv"
                onChange={e => setImportFile(e.target.files[0])}
                style={{ display: 'block', marginBottom: 16, color: T.text, fontSize: '0.88rem' }} />
              <button onClick={importCsv} disabled={!importFile}
                style={{ padding: '12px 28px', borderRadius: 11, border: 'none', cursor: importFile ? 'pointer' : 'default',
                  fontWeight: 700, fontSize: '0.9rem', background: importFile ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : 'rgba(255,255,255,0.06)',
                  color: importFile ? '#1a1a00' : T.muted, width: '100%' }}>
                ⬆ Upload & Import
              </button>
              {importResult && (
                <div style={{ marginTop: 16, color: T.success, fontSize: '0.88rem' }}>
                  ✓ Imported: {importResult.imported} rows &nbsp; Skipped: {importResult.skipped}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
