import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API, {
  adminGetStats, adminGetUsers, adminSetRole, adminToggleUser, adminResetPassword, grantUserAccess,
  adminReportsOverview, adminReportsUsers,
  adminExportCsv,
  importLessons, importWordContent, importMcq, importArrange,
  downloadTemplate,
  getLessons, deleteLesson,
} from '../services/api'
import AdminNav from '../components/AdminNav'

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)',
  accent: '#38bdf8', gold: '#fbbf24', danger: '#f87171',
  success: '#34d399', text: '#e2e8f0', muted: '#64748b',
  sidebar: 'rgba(8,14,26,0.98)', border: 'rgba(99,179,237,0.1)',
}

const glass = (a = T.accent) => ({
  background: T.card, border: `1px solid ${a}25`,
  borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(12px)',
})

const NAV_ITEMS = [
  { id: 'overview',  icon: '📊', label: 'Overview' },
  { id: 'lessons',   icon: '📚', label: 'Lessons' },
  { id: 'users',     icon: '👥', label: 'Users' },
  { id: 'reports',   icon: '📈', label: 'Reports' },
  { id: 'import',    icon: '📥', label: 'Import' },
  { id: 'export',    icon: '📤', label: 'Export' },
]

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Read tab from URL hash: /admin#users → tab='users'
  const hashTab = location.hash.replace('#', '')
  const [tab, setTab] = useState(hashTab || 'overview')
  const [stats, setStats]         = useState(null)
  const [users, setUsers]         = useState([])
  const [lessons, setLessons]     = useState([])
  const [reports, setReports]     = useState(null)
  const [userReports, setUserReports] = useState([])
  const [loading, setLoading]     = useState(true)
  const [msg, setMsg]             = useState({ text: '', type: 'success' })
  const [importResults, setImportResults] = useState({})

  // Sync tab when URL hash changes (nav bar clicks)
  useEffect(() => {
    const h = location.hash.replace('#', '')
    if (h) setTab(h)
  }, [location.hash])

  useEffect(() => {
    if (user?.role !== 'Admin') return
    Promise.all([
      adminGetStats().then(r => setStats(r.data)).catch(() => {}),
      adminGetUsers().then(r => setUsers(r.data ?? [])).catch(() => {}),
      getLessons(1).then(r => setLessons(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (tab === 'reports' && !reports) {
      adminReportsOverview().then(r => setReports(r.data)).catch(() => setReports({}))
      adminReportsUsers().then(r => setUserReports(r.data ?? [])).catch(() => {})
    }
  }, [tab])

  if (user?.role !== 'Admin') {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.danger, fontSize: '1.2rem' }}>
        ⛔ Admin access only
      </div>
    )
  }

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'success' }), 3500)
  }

  const setRole = async (id, role) => {
    try {
      await adminSetRole(id, role)
      setUsers(u => u.map(x => x.id === id ? { ...x, role } : x))
      flash(`Role updated to ${role}`)
    } catch { flash('Failed to update role', 'error') }
  }

  const toggleUser = async (id) => {
    try {
      await adminToggleUser(id)
      setUsers(u => u.map(x => x.id === id ? { ...x, isactive: !x.isactive } : x))
      flash('User status updated')
    } catch { flash('Failed to toggle user', 'error') }
  }

  const resetPassword = async (id, email) => {
    const np = window.prompt(`Set new password for ${email}:\n(min 6 characters)`)
    if (!np) return
    if (np.length < 6) { flash('Password must be at least 6 characters', 'error'); return }
    try {
      await adminResetPassword(id, np)
      flash(`Password updated for ${email}`)
    } catch { flash('Failed to reset password', 'error') }
  }

  const grantAccess = async (id, grant) => {
    try {
      await grantUserAccess(id, grant)
      setUsers(u => u.map(x => x.id === id ? { ...x, role: grant ? 'Premium' : 'User' } : x))
      flash(grant ? 'Premium access granted' : 'Premium access revoked')
    } catch { flash('Failed to update access', 'error') }
  }

  const doExport = async (type) => {
    try {
      const res = await adminExportCsv(type)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `${type}_export.csv`; a.click()
      URL.revokeObjectURL(url)
      flash(`${type} exported`)
    } catch { flash('Export failed', 'error') }
  }

  const doImport = async (type, file) => {
    if (!file) return
    try {
      const importFns = { lessons: importLessons, wordcontent: importWordContent, mcq: importMcq, arrange: importArrange }
      const res = await importFns[type](file)
      setImportResults(r => ({ ...r, [type]: res.data }))
      flash(`Imported: ${res.data.imported ?? 0} rows, Skipped: ${res.data.skipped ?? 0}`)
    } catch (e) {
      flash(e.response?.data?.message ?? 'Import failed', 'error')
    }
  }

  const doDeleteLesson = async (id) => {
    if (!window.confirm('Delete this lesson and all its content?')) return
    try {
      await deleteLesson(id)
      setLessons(l => l.filter(x => (x.lessonID ?? x.lessonId) !== id))
      flash('Lesson deleted')
    } catch { flash('Delete failed', 'error') }
  }

  const doGetTemplate = async (type) => {
    try {
      const res = await downloadTemplate(type)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `template_${type}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { flash('Template download failed', 'error') }
  }

  // ── Sub-components ──────────────────────────────────────────

  const StatCard = ({ label, value, icon, color }) => (
    <div style={{ ...glass(color), textAlign: 'center', minWidth: 130 }}>
      <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.78rem', color: T.muted, marginTop: 4 }}>{label}</div>
    </div>
  )

  const ImportSection = ({ type, label, desc }) => (
    <div style={{ ...glass(T.gold), marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div style={{ color: T.muted, fontSize: '0.82rem' }}>{desc}</div>
        </div>
        <button onClick={() => doGetTemplate(type)}
          style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.muted, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          ⬇ Template
        </button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="file" accept=".csv"
          onChange={e => doImport(type, e.target.files[0])}
          style={{ color: T.text, fontSize: '0.85rem', flex: 1, minWidth: 180 }} />
      </div>
      {importResults[type] && (
        <div style={{ marginTop: 10, color: T.success, fontSize: '0.84rem' }}>
          ✓ Imported: {importResults[type].imported ?? 0} &nbsp; Skipped: {importResults[type].skipped ?? 0}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      <AdminNav activePath="/admin" />

      {/* Tab bar */}
      <div style={{ background: 'rgba(8,12,20,0.9)', borderBottom: `1px solid ${T.border}`, padding: '0 24px', display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            style={{ padding: '12px 18px', background: 'none', border: 'none',
              borderBottom: tab === item.id ? `2px solid ${T.accent}` : '2px solid transparent',
              color: tab === item.id ? T.accent : T.muted,
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: tab === item.id ? 700 : 500,
              whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px', minWidth: 0 }}>

          {msg.text && (
            <div style={{ background: msg.type === 'error' ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)',
              border: `1px solid ${msg.type === 'error' ? T.danger : T.success}40`,
              color: msg.type === 'error' ? T.danger : T.success,
              borderRadius: 10, padding: '10px 18px', marginBottom: 20, fontSize: '0.88rem' }}>
              {msg.text}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div>
              <h2 style={{ marginBottom: 20, fontSize: '1.3rem', fontWeight: 800 }}>📊 Overview</h2>
              {loading ? (
                <div style={{ color: T.muted }}>Loading…</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 14, marginBottom: 28 }}>
                    <StatCard label="Total Users"   value={stats?.totalUsers}   icon="👥" color={T.accent}   />
                    <StatCard label="Total Lessons" value={stats?.totalLessons} icon="📚" color={T.success}  />
                    <StatCard label="Active Subs"   value={stats?.activeSubs}   icon="👑" color={T.gold}     />
                    <StatCard label="Admins"        value={stats?.admins}       icon="🔑" color={T.danger}   />
                  </div>

                  <h3 style={{ marginBottom: 14, fontSize: '1rem', color: T.muted, fontWeight: 600 }}>Quick Actions</h3>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
                    {[
                      { label: '➕ Add Lesson',    action: () => navigate('/admin/add-lesson'), style: { background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff' } },
                      { label: '📥 Import CSV',    action: () => setTab('import'),   style: { background: 'rgba(255,255,255,0.05)', color: T.muted, border: `1px solid ${T.border}` } },
                      { label: '📤 Export CSV',    action: () => setTab('export'),   style: { background: 'rgba(255,255,255,0.05)', color: T.muted, border: `1px solid ${T.border}` } },
                      { label: '👥 Manage Users',  action: () => setTab('users'),    style: { background: 'rgba(255,255,255,0.05)', color: T.muted, border: `1px solid ${T.border}` } },
                      { label: '📈 Reports',       action: () => setTab('reports'),  style: { background: 'rgba(255,255,255,0.05)', color: T.muted, border: `1px solid ${T.border}` } },
                    ].map(b => (
                      <button key={b.label} onClick={b.action}
                        style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', ...b.style }}>
                        {b.label}
                      </button>
                    ))}
                  </div>

                  <h3 style={{ marginBottom: 14, fontSize: '1rem', color: T.muted, fontWeight: 600 }}>Lessons ({lessons.length})</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
                    {lessons.slice(0, 8).map(l => {
                      const id = l.lessonID ?? l.lessonId
                      return (
                        <div key={id} style={{ ...glass(T.accent), display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{l.lessonName ?? l.title}</div>
                          <div style={{ color: T.muted, fontSize: '0.78rem' }}>Order: {l.displayOrder}</div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                            <Link to={`/admin/lesson/${id}/content`} style={{ fontSize: '0.78rem', color: T.accent, textDecoration: 'none' }}>Content →</Link>
                            <Link to={`/admin/meaning/${id}`}        style={{ fontSize: '0.78rem', color: T.success, textDecoration: 'none' }}>MCQ</Link>
                            <Link to={`/admin/arrange/${id}`}        style={{ fontSize: '0.78rem', color: T.gold, textDecoration: 'none' }}>Arrange</Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── LESSONS ── */}
          {tab === 'lessons' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>📚 Lesson Management</h2>
                <button onClick={() => navigate('/admin/add-lesson')}
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>
                  ➕ Add Lesson
                </button>
              </div>

              <div style={{ ...glass(T.accent), overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['ID', 'Lesson Name', 'Order', 'Premium', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: T.muted, fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map(l => {
                      const id = l.lessonID ?? l.lessonId
                      return (
                        <tr key={id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 12px', color: T.muted }}>{id}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.lessonName ?? l.title}</td>
                          <td style={{ padding: '10px 12px', color: T.muted }}>{l.displayOrder}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ color: l.isPremium ? T.gold : T.muted, fontWeight: 700, fontSize: '0.8rem' }}>
                              {l.isPremium ? '👑 Premium' : 'Free'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <Link to={`/admin/lesson/${id}/content`}
                                style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(56,189,248,0.12)', color: T.accent, fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}>
                                📖 Content
                              </Link>
                              <Link to={`/admin/meaning/${id}`}
                                style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(52,211,153,0.1)', color: T.success, fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}>
                                ❓ MCQ
                              </Link>
                              <Link to={`/admin/arrange/${id}`}
                                style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(251,191,36,0.1)', color: T.gold, fontSize: '0.78rem', textDecoration: 'none', fontWeight: 700 }}>
                                🔀 Arrange
                              </Link>
                              <button onClick={() => doDeleteLesson(id)}
                                style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(248,113,113,0.12)', color: T.danger, fontSize: '0.78rem', fontWeight: 700 }}>
                                🗑 Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {lessons.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: 24, color: T.muted, textAlign: 'center' }}>No lessons found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div>
              <h2 style={{ marginBottom: 8, fontSize: '1.3rem', fontWeight: 800 }}>👥 User Management</h2>
              <div style={{ marginBottom: 18, color: T.muted, fontSize: '0.84rem' }}>
                {users.length} users &nbsp;·&nbsp;
                {users.filter(u => u.role === 'Admin').length} admins &nbsp;·&nbsp;
                {users.filter(u => u.role === 'Premium').length} premium &nbsp;·&nbsp;
                {users.filter(u => !u.isactive).length} banned
              </div>

              <div style={{ ...glass(T.accent), overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['ID', 'Email', 'Mobile', 'Role', 'Status', 'Subscription', 'Password', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 10px', textAlign: 'left', color: T.muted, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '9px 10px', color: T.muted }}>{u.id}</td>
                        <td style={{ padding: '9px 10px' }}>{u.email}</td>
                        <td style={{ padding: '9px 10px', color: T.muted }}>{u.mobilenumber || '—'}</td>
                        <td style={{ padding: '9px 10px' }}>
                          <select value={u.role} onChange={e => setRole(u.id, e.target.value)}
                            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: T.text, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                            <option value="Premium">Premium</option>
                          </select>
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          <span style={{ color: u.isactive ? T.success : T.danger, fontWeight: 700, fontSize: '0.8rem' }}>
                            {u.isactive ? '✓ Active' : '✗ Banned'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 10px', color: u.substatus === 'active' ? T.gold : T.muted, fontSize: '0.78rem' }}>
                          {u.planname ? `${u.planname} (${u.substatus})` : 'Free'}
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          <button onClick={() => resetPassword(u.id, u.email)}
                            style={{ padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                              background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                            🔑 Reset
                          </button>
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            <button onClick={() => toggleUser(u.id)}
                              style={{ padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                                background: u.isactive ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)',
                                color: u.isactive ? T.danger : T.success }}>
                              {u.isactive ? 'Ban' : 'Unban'}
                            </button>
                            {u.role !== 'Admin' && (
                              <button onClick={() => grantAccess(u.id, u.role !== 'Premium')}
                                style={{ padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                                  background: u.role === 'Premium' ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.08)',
                                  color: T.gold }}>
                                {u.role === 'Premium' ? '👑 Revoke' : '👑 Grant'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: 24, color: T.muted, textAlign: 'center' }}>No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <div>
              <h2 style={{ marginBottom: 20, fontSize: '1.3rem', fontWeight: 800 }}>📈 User Reports</h2>

              {reports ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
                  <StatCard label="Active Learners"   value={reports.activeLearners}   icon="🎓" color={T.accent}  />
                  <StatCard label="Lessons Completed" value={reports.lessonsCompleted} icon="✅" color={T.success} />
                  <StatCard label="Avg Accuracy"
                    value={reports.avgAccuracy != null ? `${Math.round(reports.avgAccuracy)}%` : '—'}
                    icon="🎯" color={T.gold} />
                  <StatCard label="Total Answers"     value={reports.totalAnswers}      icon="📝" color={T.muted}   />
                </div>
              ) : (
                <div style={{ color: T.muted, marginBottom: 28 }}>Loading reports…</div>
              )}

              <h3 style={{ marginBottom: 14, fontSize: '1rem', color: T.muted, fontWeight: 600 }}>Per-User Progress</h3>
              <div style={{ ...glass(T.success), overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['User ID', 'Email', 'Lessons Tried', 'Total Answers', 'Correct', 'Accuracy'].map(h => (
                        <th key={h} style={{ padding: '10px 10px', textAlign: 'left', color: T.muted, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userReports.map((r, i) => {
                      const acc = r.totalAnswers ? Math.round((r.correctAnswers ?? 0) / r.totalAnswers * 100) : 0
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '9px 10px', color: T.muted }}>{r.userId ?? r.userID}</td>
                          <td style={{ padding: '9px 10px' }}>{r.email}</td>
                          <td style={{ padding: '9px 10px', color: T.accent }}>{r.lessonsAttempted ?? 0}</td>
                          <td style={{ padding: '9px 10px' }}>{r.totalAnswers ?? 0}</td>
                          <td style={{ padding: '9px 10px', color: T.success }}>{r.correctAnswers ?? 0}</td>
                          <td style={{ padding: '9px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 50, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${acc}%`, height: '100%', background: acc >= 70 ? T.success : acc >= 40 ? T.gold : T.danger, borderRadius: 4 }} />
                              </div>
                              <span style={{ color: acc >= 70 ? T.success : acc >= 40 ? T.gold : T.danger, fontWeight: 700, fontSize: '0.8rem' }}>{acc}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {userReports.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 24, color: T.muted, textAlign: 'center' }}>
                        {reports ? 'No user activity data yet' : 'Loading…'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── IMPORT ── */}
          {tab === 'import' && (
            <div>
              <h2 style={{ marginBottom: 8, fontSize: '1.3rem', fontWeight: 800 }}>📥 Import CSV Data</h2>
              <p style={{ color: T.muted, fontSize: '0.85rem', marginBottom: 24 }}>
                Download a template CSV, fill it in, then upload it here. Duplicates are skipped automatically.
              </p>
              <ImportSection type="lessons"     label="📚 Lessons"      desc="Import lesson names and display orders" />
              <ImportSection type="wordcontent" label="📖 Word Content"  desc="Definitions, sentence patterns, examples (EN + TA)" />
              <ImportSection type="mcq"         label="❓ MCQ Questions" desc="Multiple-choice questions with options and correct answer" />
              <ImportSection type="arrange"     label="🔀 Arrange Words" desc="Sentence arrangement exercises" />
            </div>
          )}

          {/* ── EXPORT ── */}
          {tab === 'export' && (
            <div>
              <h2 style={{ marginBottom: 8, fontSize: '1.3rem', fontWeight: 800 }}>📤 Export CSV Data</h2>
              <p style={{ color: T.muted, fontSize: '0.85rem', marginBottom: 24 }}>
                Download all data as CSV. The exported file can be re-imported using the Import tab.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                {[
                  { type: 'lessons',     icon: '📚', label: 'Export Lessons',      desc: 'All lesson names, order, premium flag' },
                  { type: 'wordcontent', icon: '📖', label: 'Export Word Content',  desc: 'Definitions, patterns, examples EN+TA' },
                  { type: 'mcq',         icon: '❓', label: 'Export MCQ',           desc: 'All questions and answer options' },
                ].map(e => (
                  <div key={e.type} style={{ ...glass(T.success) }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{e.icon}</div>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.95rem' }}>{e.label}</div>
                    <div style={{ color: T.muted, fontSize: '0.81rem', marginBottom: 18 }}>{e.desc}</div>
                    <button onClick={() => doExport(e.type)}
                      style={{ padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.88rem',
                        background: 'linear-gradient(135deg,#34d399,#059669)', color: '#fff', width: '100%' }}>
                      ⬇ Download CSV
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

      </div>
    </div>
  )
}
