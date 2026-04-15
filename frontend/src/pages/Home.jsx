import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTable, joinTable } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const navigate = useNavigate()
  const { myTables, refreshMyTables } = useAuth()
  const [tab, setTab] = useState('join')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [createForm, setCreateForm] = useState({
    name: '',
    buy_in_price: '',
    chips_per_buy_in: '',
  })

  const [joinForm, setJoinForm] = useState({ code: '', name: '' })

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await createTable({
        name: createForm.name,
        buy_in_price: parseFloat(createForm.buy_in_price),
        chips_per_buy_in: parseInt(createForm.chips_per_buy_in),
      })
      localStorage.setItem(`admin_secret_${res.code}`, res.admin_secret)
      refreshMyTables()
      navigate(`/table/${res.code}`)
    } catch (err) {
      setError(err.detail || 'משהו השתבש')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const code = joinForm.code.trim().toUpperCase()
    try {
      const res = await joinTable(code, joinForm.name.trim())
      localStorage.setItem(`player_id_${code}`, res.player.id)
      localStorage.setItem(`player_token_${code}`, res.player_token)
      refreshMyTables()
      navigate(`/table/${code}`)
    } catch (err) {
      setError(err.detail || 'משהו השתבש')
    } finally {
      setLoading(false)
    }
  }

  const allMyTables = [
    ...myTables.hosted.map(t => ({ ...t, role: 'host' })),
    ...myTables.playing
      .filter(pt => !myTables.hosted.some(ht => ht.code === pt.code))
      .map(t => ({ ...t, role: 'player' })),
  ]

  return (
    <div className="home">
      {allMyTables.length > 0 && (
        <div className="my-tables">
          <h2>השולחנות שלך</h2>
          <div className="table-list">
            {allMyTables.map(t => (
              <div key={t.code} className="table-list-item" onClick={() => navigate(`/table/${t.code}`)}>
                <div className="tli-left">
                  <span className="tli-name">{t.name}</span>
                  <span className="tli-code">{t.code}</span>
                </div>
                <div className="tli-right">
                  {t.is_locked && <span className="locked-badge">נעול</span>}
                  <span className={`role-badge ${t.role}`}>
                    {t.role === 'host' ? 'מארח' : 'שחקן'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={`tab${tab === 'join' ? ' active' : ''}`} onClick={() => { setTab('join'); setError('') }}>
          הצטרף לשולחן
        </button>
        <button className={`tab${tab === 'create' ? ' active' : ''}`} onClick={() => { setTab('create'); setError('') }}>
          צור שולחן
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {tab === 'join' && (
        <form className="form" onSubmit={handleJoin}>
          <label>
            קוד שולחן
            <input
              value={joinForm.code}
              onChange={e => setJoinForm({ ...joinForm, code: e.target.value.toUpperCase() })}
              placeholder="ABC123"
              maxLength={6}
              required
            />
          </label>
          <label>
            השם שלך (יוצג לשאר השחקנים)
            <input
              value={joinForm.name}
              onChange={e => setJoinForm({ ...joinForm, name: e.target.value })}
              placeholder="שם תצוגה"
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '...' : 'הצטרף לשולחן'}
          </button>
        </form>
      )}

      {tab === 'create' && (
        <form className="form" onSubmit={handleCreate}>
          <label>
            שם ערב המשחק
            <input
              value={createForm.name}
              onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="פוקר יום שישי"
              required
            />
          </label>
          <label>
            מחיר ביי-אין (₪)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={createForm.buy_in_price}
              onChange={e => setCreateForm({ ...createForm, buy_in_price: e.target.value })}
              placeholder="50"
              required
            />
          </label>
          <label>
            ג'טונים לכל ביי-אין
            <input
              type="number"
              min="1"
              step="1"
              value={createForm.chips_per_buy_in}
              onChange={e => setCreateForm({ ...createForm, chips_per_buy_in: e.target.value })}
              placeholder="1000"
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '...' : 'צור שולחן'}
          </button>
        </form>
      )}
    </div>
  )
}
