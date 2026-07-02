import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getConversations } from '../services/api'
import { useAuth } from '../context/AuthContext'

const T = {
  bg: '#080c14', accent: '#38bdf8', gold: '#fbbf24', success: '#34d399',
  orange: '#fb923c', text: '#e2e8f0', muted: '#64748b', danger: '#f87171',
}

const SCENARIO_ICON = {
  'Tea Shop': '☕', 'Restaurant': '🍽️', 'Shopping': '🛍️', 'Bus Stand': '🚌',
  'Hospital': '🏥', 'Office': '🏢', 'Interview': '🧑‍💼', 'College': '🎓', 'Friends': '👥',
}

export default function Conversations() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getConversations().then(r => setItems(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <nav style={{ background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,179,237,0.1)', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 900, color: T.accent, fontSize: '1.1rem' }}>✦ Spoken English</span>
        <div style={{ flex: 1 }} />
        <Link to="/dashboard"     style={{ color: T.muted, textDecoration: 'none', fontSize: '0.88rem' }}>Dashboard</Link>
        <Link to="/lessons"       style={{ color: T.muted, textDecoration: 'none', fontSize: '0.88rem' }}>Lessons</Link>
        <Link to="/conversations" style={{ color: T.accent, textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>Conversations</Link>
        <Link to="/progress"      style={{ color: T.muted, textDecoration: 'none', fontSize: '0.88rem' }}>Progress</Link>
        {user?.role === 'Admin' && <Link to="/admin" style={{ color: T.danger, textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>⚙ Admin</Link>}
        <button onClick={logout} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: T.muted, cursor: 'pointer', fontSize: '0.85rem' }}>Logout</button>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 20px 80px' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 900, marginBottom: 6 }}>💬 Conversation Practice</h1>
        <p style={{ color: T.muted, marginBottom: 28, fontSize: '0.9rem' }}>Practise real-life situations — speak or type your replies, and the app checks them.</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 40, textAlign: 'center', color: T.muted }}>
            No conversations available yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 18 }}>
            {items.map((c, i) => (
              <motion.div key={c.conversation_id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ background: 'rgba(12,20,36,0.97)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 18, padding: '22px 22px' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>{SCENARIO_ICON[c.scenario] || '💬'}</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>{c.title}</div>
                {c.description && <div style={{ color: T.muted, fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 12 }}>{c.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ background: 'rgba(251,146,60,0.15)', color: T.orange, borderRadius: 6, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{c.level}</span>
                  <span style={{ color: T.muted, fontSize: '0.75rem' }}>💬 {c.turn_count} turns</span>
                </div>
                <button onClick={() => navigate(`/conversation/${c.conversation_id}/play`)}
                  style={{ display: 'block', width: '100%', textAlign: 'center', padding: '11px 20px', borderRadius: 11, border: 'none',
                    background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                  ▶ Start Conversation
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
