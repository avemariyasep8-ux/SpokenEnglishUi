import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  adminGetConversations, getConversation, createConversation, updateConversation, deleteConversation,
  addConversationTurn, updateConversationTurn, deleteConversationTurn,
} from '../services/api'
import AdminNav from '../components/AdminNav'

const T = {
  bg: '#080c14', card: 'rgba(12,20,36,0.97)',
  accent: '#38bdf8', gold: '#fbbf24', success: '#34d399',
  danger: '#f87171', purple: '#818cf8', orange: '#fb923c',
  text: '#e2e8f0', muted: '#64748b',
}
const glass = (a = T.accent) => ({ background: T.card, border: `1px solid ${a}25`, borderRadius: 16, backdropFilter: 'blur(12px)' })
const btn = (bg, col = '#fff') => ({ padding: '7px 15px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', background: bg, color: col })
const input = { width: '100%', padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: T.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']

export default function AdminConversations() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)         // {type:'add'|'edit', conv?}
  const [form, setForm] = useState({ title: '', scenario: '', description: '', level: 'Beginner', displayOrder: 1, isActive: true })
  const [detail, setDetail] = useState(null)       // {conversation, turns}
  const [msg, setMsg] = useState('')

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminGetConversations(); setItems(r.data || []) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm({ title: '', scenario: '', description: '', level: 'Beginner', displayOrder: items.length + 1, isActive: true }); setModal({ type: 'add' }) }
  const openEdit = (c) => { setForm({ title: c.title, scenario: c.scenario || '', description: c.description || '', level: c.level, displayOrder: c.display_order, isActive: c.is_active }); setModal({ type: 'edit', conv: c }) }

  const save = async (e) => {
    e.preventDefault()
    try {
      if (modal.type === 'add') await createConversation(form)
      else await updateConversation(modal.conv.conversation_id, form)
      setModal(null); flash('Conversation saved'); load()
    } catch { flash('Error saving conversation') }
  }

  const del = async (id) => {
    if (!window.confirm('Delete this conversation and all its turns?')) return
    try { await deleteConversation(id); flash('Deleted'); if (detail?.conversation?.conversation_id === id) setDetail(null); load() }
    catch { flash('Error deleting') }
  }

  const openDetail = async (id) => {
    try { const r = await getConversation(id); setDetail(r.data) } catch { flash('Failed to load') }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <AdminNav activePath="/admin/conversations" />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 4px' }}>💬 Conversations</h1>
            <p style={{ color: T.muted, fontSize: '0.88rem', margin: 0 }}>Interactive dialogue scenarios (Tea Shop, Restaurant, Interview…)</p>
          </div>
          <button onClick={openAdd} style={{ ...btn('linear-gradient(135deg,#fb923c,#ea580c)'), padding: '10px 20px' }}>➕ Add Conversation</button>
        </div>

        {msg && <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid #34d39940', borderRadius: 10, padding: '10px 16px', marginBottom: 20, color: T.success, fontSize: '0.88rem' }}>✓ {msg}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
            {items.map(c => (
              <motion.div key={c.conversation_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ ...glass(T.orange), padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>{c.title}</div>
                  <span style={{ background: 'rgba(251,146,60,0.15)', color: T.orange, borderRadius: 6, padding: '2px 9px', fontSize: '0.7rem', fontWeight: 700 }}>{c.level}</span>
                </div>
                <div style={{ color: T.muted, fontSize: '0.78rem', marginBottom: 12 }}>{c.scenario} · 💬 {c.turn_count} turns {c.is_active ? '' : '· (inactive)'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={btn('rgba(56,189,248,0.15)', T.accent)} onClick={() => openDetail(c.conversation_id)}>Turns</button>
                  <button style={btn('rgba(129,140,248,0.15)', T.purple)} onClick={() => openEdit(c)}>Edit</button>
                  <Link to={`/conversation/${c.conversation_id}/play`} style={{ ...btn('rgba(52,211,153,0.15)', T.success), textDecoration: 'none' }}>▶ Preview</Link>
                  <button style={btn('rgba(248,113,113,0.15)', T.danger)} onClick={() => del(c.conversation_id)}>Del</button>
                </div>
              </motion.div>
            ))}
            {!items.length && <div style={{ color: T.muted, padding: 40 }}>No conversations yet. Click "Add Conversation".</div>}
          </div>
        )}

        {detail && <TurnEditor detail={detail} reload={() => openDetail(detail.conversation.conversation_id)} onClose={() => setDetail(null)} flash={flash} refreshList={load} />}
      </div>

      <AnimatePresence>
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} onClick={e => e.stopPropagation()}
              style={{ ...glass(T.orange), padding: '26px 28px', maxWidth: 460, width: '100%' }}>
              <h2 style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 18 }}>{modal.type === 'add' ? '➕ Add Conversation' : '✏️ Edit Conversation'}</h2>
              <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="TITLE"><input required style={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Tea Shop" /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="SCENARIO"><input style={input} value={form.scenario} onChange={e => setForm({ ...form, scenario: e.target.value })} placeholder="Tea Shop" /></Field>
                  <Field label="LEVEL">
                    <select style={{ ...input, cursor: 'pointer' }} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="DESCRIPTION"><textarea rows={2} style={{ ...input, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
                  <Field label="ORDER"><input type="number" style={input} value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} /></Field>
                  {modal.type === 'edit' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer', paddingBottom: 8 }}>
                      <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Active
                    </label>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button type="button" onClick={() => setModal(null)} style={{ ...btn('rgba(255,255,255,0.06)', T.muted), flex: 1, padding: '11px 0' }}>Cancel</button>
                  <button type="submit" style={{ ...btn('linear-gradient(135deg,#fb923c,#ea580c)'), flex: 2, padding: '11px 0' }}>{modal.type === 'add' ? 'Create' : 'Save'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

// Turn editor for a selected conversation
function TurnEditor({ detail, reload, onClose, flash, refreshList }) {
  const cid = detail.conversation.conversation_id
  const [editing, setEditing] = useState(null)   // 'new' | turnId
  const [form, setForm] = useState({ systemText: '', expectedResponse: '', tamilHint: '', turnOrder: 0 })

  const openNew = () => { setEditing('new'); setForm({ systemText: '', expectedResponse: '', tamilHint: '', turnOrder: (detail.turns?.length || 0) + 1 }) }
  const openEdit = (t) => { setEditing(t.turn_id); setForm({ systemText: t.system_text, expectedResponse: t.expected_response || '', tamilHint: t.tamil_hint || '', turnOrder: t.turn_order }) }

  const save = async () => {
    if (!form.systemText.trim()) return
    const payload = { turnOrder: +form.turnOrder || 0, systemText: form.systemText.trim(), expectedResponse: form.expectedResponse.trim() || null, tamilHint: form.tamilHint.trim() || null }
    try {
      if (editing === 'new') await addConversationTurn(cid, payload)
      else await updateConversationTurn(editing, payload)
      setEditing(null); flash('Turn saved'); reload(); refreshList()
    } catch { flash('Error saving turn') }
  }

  const del = async (turnId) => {
    if (!window.confirm('Delete this turn?')) return
    try { await deleteConversationTurn(turnId); flash('Turn deleted'); reload(); refreshList() } catch { flash('Error') }
  }

  return (
    <div style={{ ...glass(T.accent), padding: '22px 24px', marginTop: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{detail.conversation.title} — dialogue turns</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn('linear-gradient(135deg,#34d399,#059669)', '#04110b')} onClick={openNew}>+ Add Turn</button>
          <button style={btn('rgba(255,255,255,0.08)', T.muted)} onClick={onClose}>✕ Close</button>
        </div>
      </div>

      {editing && (
        <div style={{ ...glass(T.orange), padding: 18, marginBottom: 16 }}>
          <Field label="SYSTEM SAYS *"><input style={input} value={form.systemText} onChange={e => setForm(f => ({ ...f, systemText: e.target.value }))} placeholder="What would you like?" /></Field>
          <div style={{ height: 10 }} />
          <Field label="EXPECTED LEARNER REPLY (blank = system-only line, auto-advances)"><input style={input} value={form.expectedResponse} onChange={e => setForm(f => ({ ...f, expectedResponse: e.target.value }))} placeholder="I would like a tea" /></Field>
          <div style={{ height: 10 }} />
          <Field label="TAMIL HINT (optional)"><input style={{ ...input, fontFamily: "'Noto Sans Tamil', sans-serif" }} value={form.tamilHint} onChange={e => setForm(f => ({ ...f, tamilHint: e.target.value }))} placeholder="எனக்கு ஒரு டீ வேண்டும்" /></Field>
          <div style={{ height: 10 }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
            <div style={{ width: 120 }}><Field label="ORDER"><input type="number" style={input} value={form.turnOrder} onChange={e => setForm(f => ({ ...f, turnOrder: e.target.value }))} /></Field></div>
            <button style={btn(T.success, '#04110b')} onClick={save}>Save Turn</button>
            <button style={btn('rgba(255,255,255,0.08)', T.muted)} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {(detail.turns || []).map(t => (
          <div key={t.turn_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
            <span style={{ color: T.muted, fontFamily: 'monospace', fontSize: '0.8rem', paddingTop: 2 }}>{t.turn_order}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.accent, fontSize: '0.9rem' }}><b>System:</b> {t.system_text}</div>
              {t.expected_response
                ? <div style={{ color: T.success, fontSize: '0.85rem', marginTop: 2 }}><b>Learner:</b> {t.expected_response}</div>
                : <div style={{ color: T.muted, fontSize: '0.78rem', marginTop: 2, fontStyle: 'italic' }}>(system-only line)</div>}
              {t.tamil_hint && <div style={{ color: T.gold, fontSize: '0.8rem', marginTop: 2, fontFamily: "'Noto Sans Tamil', sans-serif" }}>💡 {t.tamil_hint}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={btn('rgba(56,189,248,0.15)', T.accent)} onClick={() => openEdit(t)}>Edit</button>
              <button style={btn('rgba(248,113,113,0.15)', T.danger)} onClick={() => del(t.turn_id)}>Del</button>
            </div>
          </div>
        ))}
        {!(detail.turns || []).length && <div style={{ color: T.muted, padding: 20, textAlign: 'center' }}>No turns yet. Click "+ Add Turn".</div>}
      </div>
    </div>
  )
}
