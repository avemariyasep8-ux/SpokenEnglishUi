import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const T = {
  accent: '#38bdf8', gold: '#fbbf24', muted: '#64748b',
  success: '#34d399', text: '#e2e8f0', border: 'rgba(99,179,237,0.12)',
}

const NAV_LINKS = [
  { to: '/admin',          label: '📊 Overview',  exact: true },
  { to: '/admin/lessons',  label: '📚 Lessons' },
  { to: '/admin',          label: '👥 Users',     tab: 'users' },
  { to: '/admin',          label: '📈 Reports',   tab: 'reports' },
  { to: '/admin',          label: '📥 Import',    tab: 'import' },
  { to: '/admin',          label: '📤 Export',    tab: 'export' },
]

export default function AdminNav({ activePath }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const current = activePath || location.pathname

  const isActive = (link) => {
    if (link.exact) return current === '/admin' || current === link.to
    return current.startsWith(link.to) && link.to !== '/admin'
  }

  return (
    <nav style={{
      background: 'rgba(8,12,20,0.96)', backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${T.border}`, padding: '0 20px',
      display: 'flex', alignItems: 'center', gap: 0,
      position: 'sticky', top: 0, zIndex: 200, flexWrap: 'wrap',
    }}>
      {/* Brand */}
      <Link to="/admin" style={{ textDecoration: 'none', marginRight: 20, padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 900, color: T.accent, fontSize: '1rem', whiteSpace: 'nowrap' }}>⚙ Admin Panel</span>
      </Link>

      {/* Page links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { to: '/admin',                  label: '📊 Overview',       matchExact: true },
          { to: '/admin/packages',         label: '📦 Packages',       matchExact: false },
          { to: '/admin/lessons',          label: '📚 Lessons',        matchExact: false },
          { to: '/admin/schools',          label: '🏫 Schools',        matchExact: false },
          { to: '/admin/subscriptions',    label: '💳 Subscriptions',  matchExact: false },
        ].map(link => {
          const active = link.matchExact
            ? current === '/admin'
            : current.startsWith(link.to) && link.to !== '/admin'
          return (
            <Link key={link.to} to={link.to}
              style={{
                padding: '14px 16px', textDecoration: 'none', fontSize: '0.84rem', fontWeight: active ? 700 : 500,
                color: active ? T.accent : T.muted, borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
                whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}>
              {link.label}
            </Link>
          )
        })}

        {/* Admin dashboard tabs — link to /admin with hash so AdminDashboard can read them */}
        {[
          { label: '👥 Users',   hash: '#users'   },
          { label: '📈 Reports', hash: '#reports' },
          { label: '📥 Import',  hash: '#import'  },
          { label: '📤 Export',  hash: '#export'  },
        ].map(link => (
          <Link key={link.hash} to={`/admin${link.hash}`}
            style={{
              padding: '14px 16px', textDecoration: 'none', fontSize: '0.84rem', fontWeight: 500,
              color: T.muted, borderBottom: '2px solid transparent', whiteSpace: 'nowrap',
            }}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0', flexShrink: 0 }}>
        <span style={{ color: T.muted, fontSize: '0.78rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.email}
        </span>
        <Link to="/dashboard" style={{ color: T.muted, textDecoration: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          ← User App
        </Link>
        <button onClick={logout}
          style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)', color: T.muted, cursor: 'pointer', fontSize: '0.8rem' }}>
          Logout
        </button>
      </div>
    </nav>
  )
}
