import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: '📚', title: 'Lesson Menu',          desc: 'Structured lessons grouped by type and difficulty level.' },
  { icon: '💬', title: 'Word Meanings',         desc: 'MCQ-style quizzes to master vocabulary and word meanings.' },
  { icon: '🧩', title: 'Arrange the Words',     desc: 'Drag and click words into the correct sentence order.' },
  { icon: '📖', title: 'Reading Practice',      desc: 'Practice reading English sentences with audio references.' },
  { icon: '📊', title: 'Track Progress',        desc: 'See your accuracy and attempt history for every lesson.' },
  { icon: '🔐', title: 'Secure Accounts',       desc: 'JWT-based authentication with refresh token support.' },
]

const fade = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }

export default function Landing() {
  const { user } = useAuth()
  return (
    <div className="page-wrapper">
      <div className="star-bg" />

      {/* Hero */}
      <section className="hero">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
          <motion.div variants={fade} className="hero-badge">✨ Supernova English Learning</motion.div>
          <motion.h1 variants={fade} className="heading-lg hero-title">
            Master <span className="gradient-text">Spoken English</span><br />
            Like a Pro
          </motion.h1>
          <motion.p variants={fade} className="hero-subtitle">
            Interactive lessons, vocabulary quizzes, sentence building exercises — all in one stunning platform.
          </motion.p>
          <motion.div variants={fade} className="hero-cta">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard →</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">🚀 Start Learning Free</Link>
                <Link to="/login"    className="btn btn-secondary btn-lg">Sign In</Link>
              </>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="features-section container">
        <div className="text-center">
          <h2 className="section-title gradient-text">Everything You Need</h2>
          <p className="section-subtitle">A complete toolkit for mastering spoken English</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <motion.div key={f.title} className="feature-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              viewport={{ once: true }}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="heading-md" style={{ marginBottom: 16 }}>Ready to shine? 🌟</h2>
          <p className="text-muted" style={{ marginBottom: 32 }}>Join thousands of learners improving their English daily.</p>
          <Link to="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
        </motion.div>
      </section>
    </div>
  )
}
