import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' })

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)', accent: '#38bdf8', accent2: '#818cf8',
  accent3: '#34d399', gold: '#fbbf24', danger: '#f87171', text: '#e2e8f0', muted: '#64748b',
}
const glass = (a = T.accent) => ({ background: T.card, border: `1px solid ${a}22`, borderRadius: 14, backdropFilter: 'blur(12px)' })
const btn = (c = T.accent) => ({ padding: '9px 20px', borderRadius: 9, border: 'none', background: c, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' })

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('plans')
  const [editPlan, setEditPlan] = useState(null)
  const [form, setForm] = useState({ planName: '', durationMonths: 1, priceInr: 0, features: '', maxLessons: '' })
  const [msg, setMsg] = useState('')

  const loadPlans = () =>
    fetch(`${BASE}/subscription/plans`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setPlans(Array.isArray(d) ? d : []))

  const loadUsers = () =>
    fetch(`${BASE}/admin/users`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))

  useEffect(() => { loadPlans(); loadUsers() }, [])

  const savePlan = async () => {
    const method = editPlan ? 'PUT' : 'POST'
    const url = editPlan ? `${BASE}/admin/subscription-plans/${editPlan.plan_id}` : `${BASE}/admin/subscription-plans`
    const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) })
    setMsg(r.ok ? (editPlan ? 'Plan updated!' : 'Plan created!') : 'Failed')
    setEditPlan(null); setForm({ planName: '', durationMonths: 1, priceInr: 0, features: '', maxLessons: '' })
    loadPlans(); setTimeout(() => setMsg(''), 3000)
  }

  const grantSubscription = async (userId, planId) => {
    const r = await fetch(`${BASE}/subscription/subscribe`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ userId, planId, paymentRef: 'admin-grant' })
    })
    setMsg(r.ok ? 'Subscription granted!' : 'Failed to grant')
    setTimeout(() => setMsg(''), 3000)
  }

  const planColors = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24']

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <nav style={{ background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(99,179,237,0.1)', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link to="/admin" style={{ color: T.accent, textDecoration: 'none', fontWeight: 900, fontSize: '1.1rem' }}>✦ Admin</Link>
        <span style={{ color: T.muted }}>/ Subscriptions</span>
        <div style={{ flex: 1 }} />
        <Link to="/admin" style={{ color: T.muted, textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Admin</Link>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px 80px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 24 }}>💳 Subscription Management</h1>

        {msg && <div style={{ ...glass(T.accent3), padding: '10px 18px', marginBottom: 18, color: T.accent3, fontSize: '0.88rem' }}>{msg}</div>}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[['plans', '📋 Plans'], ['users', '👥 User Access'], ['grant', '🎁 Grant Access']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '8px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: tab === id ? 700 : 400, fontSize: '0.88rem',
                background: tab === id ? 'linear-gradient(135deg,#38bdf8,#818cf8)' : 'rgba(255,255,255,0.04)', color: tab === id ? '#fff' : T.muted }}>
              {label}
            </button>
          ))}
        </div>

        {/* Plans tab */}
        {tab === 'plans' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, marginBottom: 32 }}>
              {plans.map((p, i) => (
                <motion.div key={p.plan_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  style={{ ...glass(planColors[i % planColors.length]), padding: '20px 20px 16px' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', color: planColors[i % planColors.length], marginBottom: 4 }}>{p.plan_name}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: T.text, marginBottom: 2 }}>
                    {p.price_inr === 0 ? 'Free' : `₹${p.price_inr}`}
                    {p.duration_months > 0 && <span style={{ fontSize: '0.75rem', color: T.muted, fontWeight: 400 }}>/{p.duration_months}mo</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: T.muted, lineHeight: 1.5, marginBottom: 16 }}>{p.features}</div>
                  <button onClick={() => { setEditPlan(p); setForm({ planName: p.plan_name, durationMonths: p.duration_months, priceInr: p.price_inr, features: p.features || '', maxLessons: '' }); setTab('edit') }}
                    style={{ ...btn(planColors[i % planColors.length]), width: '100%', fontSize: '0.8rem', padding: '7px' }}>
                    ✏️ Edit
                  </button>
                </motion.div>
              ))}

              {/* Add new plan card */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ ...glass(T.muted), padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 160 }}
                onClick={() => { setEditPlan(null); setForm({ planName: '', durationMonths: 1, priceInr: 0, features: '', maxLessons: '' }); setTab('edit') }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>+</div>
                <div style={{ color: T.muted, fontSize: '0.85rem' }}>Add New Plan</div>
              </motion.div>
            </div>
          </>
        )}

        {/* Edit plan tab */}
        {tab === 'edit' && (
          <div style={{ ...glass(T.accent), padding: 28, maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700 }}>{editPlan ? '✏️ Edit Plan' : '+ New Plan'}</h3>
            {[
              ['planName', 'Plan Name', 'text'],
              ['durationMonths', 'Duration (months, 0=forever)', 'number'],
              ['priceInr', 'Price (INR)', 'number'],
              ['features', 'Features (description)', 'text'],
            ].map(([key, label, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginBottom: 4 }}>{label}</div>
                <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: T.text, fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={savePlan} style={{ ...btn('linear-gradient(135deg,#38bdf8,#818cf8)'), flex: 1 }}>Save Plan</button>
              <button onClick={() => setTab('plans')} style={{ ...btn('rgba(255,255,255,0.06)'), flex: 1, color: T.muted }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Grant access tab */}
        {tab === 'grant' && (
          <div style={{ ...glass(T.gold), padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>🎁 Grant Subscription to User</h3>
            <p style={{ color: T.muted, fontSize: '0.85rem', marginBottom: 20 }}>Select a user and plan to grant access manually (e.g., after payment confirmation).</p>
            {loading ? <div style={{ color: T.muted }}>Loading users…</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {users.slice(0, 20).map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.email}</div>
                      <div style={{ fontSize: '0.72rem', color: T.muted }}>Role: {u.role}</div>
                    </div>
                    <select onChange={e => e.target.value && grantSubscription(u.id, parseInt(e.target.value))}
                      defaultValue=""
                      style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: T.text, cursor: 'pointer', fontSize: '0.82rem' }}>
                      <option value="">Grant plan…</option>
                      {plans.map(p => <option key={p.plan_id} value={p.plan_id}>{p.plan_name} (₹{p.price_inr})</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User subscriptions tab */}
        {tab === 'users' && (
          <div style={{ ...glass(T.accent2), padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>👥 User Subscription Status</h3>
            {loading ? <div style={{ color: T.muted }}>Loading…</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {users.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 99,
                      background: u.role === 'Premium' ? 'rgba(251,191,36,0.15)' : u.role === 'Admin' ? 'rgba(248,113,113,0.15)' : 'rgba(100,116,139,0.15)',
                      color: u.role === 'Premium' ? T.gold : u.role === 'Admin' ? T.danger : T.muted, fontWeight: 700 }}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
