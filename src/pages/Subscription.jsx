import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSubscriptionPlans, subscribe, getMySubscription } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Subscription() {
  const { user } = useAuth()
  const [plans, setPlans]       = useState([])
  const [mySub, setMySub]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [paying, setPaying]     = useState(null)
  const [success, setSuccess]   = useState('')

  useEffect(() => {
    Promise.all([
      getSubscriptionPlans(),
      user?.userId ? getMySubscription(user.userId) : Promise.resolve({ data: null }),
    ]).then(([pR, sR]) => {
      setPlans(pR.data || [])
      if (sR.data?.status && sR.data.status !== 'none') setMySub(sR.data)
    }).finally(() => setLoading(false))
  }, [user])

  const handleSubscribe = async (plan) => {
    if (!user?.userId) return alert('Please login first.')
    setPaying(plan.planId)
    try {
      const payRef = `PAY-${Date.now()}-${user.userId}`
      await subscribe({ UserId: user.userId, PlanId: plan.planId, PaymentRef: payRef })
      setSuccess(`🎉 You are now subscribed to ${plan.planName}! Enjoy learning!`)
      const sR = await getMySubscription(user.userId)
      if (sR.data?.status) setMySub(sR.data)
    } catch {
      alert('Subscription failed. Please try again.')
    } finally {
      setPaying(null)
    }
  }

  const ICONS  = { 1: '🌱', 12: '⭐', 24: '🚀' }
  const COLORS = { 1: '#06b6d4', 12: '#7c3aed', 24: '#f59e0b' }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0b1a', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div className="star-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Navbar */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/dashboard" style={{ color: '#555', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}>← Dashboard</Link>
          <span style={{ color: '#c4b5fd', fontWeight: 900, fontSize: '1.1rem', marginLeft: 'auto' }}>✦ Spoken English</span>
        </nav>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>👑</div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#c4b5fd', marginBottom: 8 }}>Choose Your Plan</h1>
            <p style={{ color: '#666', fontSize: '1rem' }}>Unlock all lessons, voice practice, and Tamil support</p>
          </motion.div>

          {/* Current subscription */}
          {mySub && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 18, padding: '18px 24px', marginBottom: 30, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✅ Active Subscription</div>
              <p style={{ color: '#6ee7b7', fontWeight: 700, margin: '0 0 4px' }}>{mySub.planName}</p>
              <p style={{ color: '#444', fontSize: '0.85rem', margin: 0 }}>Valid until: {new Date(mySub.endDate).toLocaleDateString()} · {mySub.daysRemaining} days remaining</p>
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.35)', borderRadius: 14, padding: '16px 22px', marginBottom: 24, textAlign: 'center', color: '#6ee7b7', fontWeight: 700 }}>
              {success}
            </motion.div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {plans.map((plan, i) => {
                const color = COLORS[plan.durationMonths] || '#7c3aed'
                const icon  = ICONS[plan.durationMonths]  || '📚'
                const popular = plan.durationMonths === 12
                const features = (plan.features || '').split('•').map(f => f.trim()).filter(Boolean)
                return (
                  <motion.div key={plan.planId}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ position: 'relative', background: popular ? `rgba(124,58,237,0.12)` : 'rgba(255,255,255,0.04)', border: `2px solid ${popular ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`, borderRadius: 22, padding: '28px 22px', textAlign: 'center' }}>
                    {popular && (
                      <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#7c3aed', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '4px 14px', borderRadius: 99, letterSpacing: 1, whiteSpace: 'nowrap' }}>
                        MOST POPULAR
                      </div>
                    )}
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{icon}</div>
                    <h3 style={{ color: color, fontWeight: 900, fontSize: '1.2rem', marginBottom: 6 }}>{plan.planName}</h3>
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ color: '#e2e8f0', fontSize: '2rem', fontWeight: 900 }}>₹{plan.priceInr}</span>
                      <span style={{ color: '#555', fontSize: '0.85rem' }}>/{plan.durationMonths === 1 ? 'mo' : plan.durationMonths === 12 ? 'yr' : '2yr'}</span>
                    </div>
                    {plan.durationMonths > 1 && (
                      <div style={{ color: '#6ee7b7', fontSize: '0.78rem', fontWeight: 700, marginBottom: 16 }}>
                        Save {plan.durationMonths === 12 ? '58%' : '68%'} vs monthly
                      </div>
                    )}
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', textAlign: 'left' }}>
                      {features.map((f, fi) => (
                        <li key={fi} style={{ color: '#a1a1b5', fontSize: '0.85rem', padding: '4px 0', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={paying === plan.planId}
                      style={{ width: '100%', padding: '13px', borderRadius: 13, border: `2px solid ${color}`, background: popular ? `linear-gradient(135deg,${color},#4f46e5)` : `rgba(124,58,237,0.15)`, color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: paying === plan.planId ? 'not-allowed' : 'pointer', opacity: paying === plan.planId ? 0.7 : 1, transition: 'all 0.2s' }}>
                      {paying === plan.planId ? '⏳ Processing…' : 'Subscribe Now'}
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}

          <p style={{ textAlign: 'center', color: '#333', fontSize: '0.8rem', marginTop: 32 }}>
            🔒 Secure payment • Cancel anytime • No hidden charges
          </p>
        </div>
      </div>
    </div>
  )
}
