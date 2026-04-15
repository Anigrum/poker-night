import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTable, lockTable, lockPlayer, updatePlayer, joinTable } from '../api'

export default function TableView() {
  const { code } = useParams()
  const navigate = useNavigate()

  const adminSecret = localStorage.getItem(`admin_secret_${code}`)
  const playerId = localStorage.getItem(`player_id_${code}`)
  const playerToken = localStorage.getItem(`player_token_${code}`)

  const isAdmin = !!adminSecret
  const isPlayer = !!playerId

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [chips, setChips] = useState('')
  const [buyIns, setBuyIns] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [lockingPlayer, setLockingPlayer] = useState(false)

  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)

  const load = async () => {
    try {
      const res = await getTable(code)
      setData(res)
      if (playerId) {
        const me = res.players.find(p => p.id == playerId)
        if (me) {
          setChips(me.chips_remaining ?? '')
          setBuyIns(me.buy_ins)
        }
      }
    } catch (err) {
      setError(err.detail || 'השולחן לא נמצא')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [code])

  const handleLock = async () => {
    if (!window.confirm('לנעול את השולחן? השחקנים לא יוכלו לערוך את הנתונים שלהם אחרי זה.')) return
    try {
      await lockTable(code, adminSecret)
      await load()
    } catch (err) {
      setError(err.detail || 'נכשל בנעילת השולחן')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    setError('')
    try {
      await updatePlayer(playerId, {
        player_token: playerToken,
        chips_remaining: parseFloat(chips),
        buy_ins: parseInt(buyIns),
      })
      setSaveMsg('נשמר!')
      await load()
    } catch (err) {
      setError(err.detail || 'נכשל בשמירה')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 2000)
    }
  }

  const handleLockPlayer = async () => {
    if (!window.confirm('לנעול את התוצאות שלך? לא תוכל לערוך אחרי זה.')) return
    setLockingPlayer(true)
    setError('')
    try {
      await lockPlayer(playerId, playerToken)
      await load()
    } catch (err) {
      setError(err.detail || 'נכשל בנעילה')
    } finally {
      setLockingPlayer(false)
    }
  }

  const handleJoinAsPlayer = async (e) => {
    e.preventDefault()
    setJoining(true)
    setError('')
    try {
      const res = await joinTable(code, joinName.trim())
      localStorage.setItem(`player_id_${code}`, res.player.id)
      localStorage.setItem(`player_token_${code}`, res.player_token)
      await load()
      window.location.reload()
    } catch (err) {
      setError(err.detail || 'נכשל בהצטרפות')
    } finally {
      setJoining(false)
    }
  }

  if (loading) return <div className="center">טוען...</div>
  if (!data) return <div className="center error">{error || 'השולחן לא נמצא'}</div>

  const { table, players } = data
  const me = isPlayer ? players.find(p => p.id == playerId) : null

  return (
    <div className="table-view">
      <div className="table-header">
        <h1>{table.name}</h1>
        <div className="table-meta">
          <span className="code-badge">{table.code}</span>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            ₪{table.buy_in_price} = {table.chips_per_buy_in} ג'טונים
          </span>
          {table.is_locked && <span className="locked-badge">נעול</span>}
        </div>
        <p className="host">מארח: {table.admin_name}</p>
      </div>

      {error && <div className="error">{error}</div>}

      {table.is_locked && (
        <div className="settlement-banner">
          <button onClick={() => navigate(`/table/${code}/settlement`)}>
            צפה בחישוב התשלומים
          </button>
        </div>
      )}

      {isAdmin && !table.is_locked && (
        <div className="admin-panel">
          <button className="btn-danger" onClick={handleLock}>
            נעל שולחן וחשב תשלומים
          </button>
          {!isPlayer && (
            <form className="join-as-player" onSubmit={handleJoinAsPlayer}>
              <input
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                placeholder="השם שלך (הצטרף כשחקן)"
                required
              />
              <button type="submit" className="btn-secondary" disabled={joining}>
                {joining ? '...' : 'הצטרף'}
              </button>
            </form>
          )}
        </div>
      )}

      {isPlayer && me && !table.is_locked && !me.is_locked && (
        <div className="player-form-card">
          <h3>התוצאות שלך</h3>
          <form className="form" onSubmit={handleSave}>
            <label>
              מספר ביי-אינים
              <input
                type="number"
                min="1"
                step="1"
                value={buyIns}
                onChange={e => setBuyIns(e.target.value)}
                required
              />
            </label>
            <label>
              ג'טונים שנשארו
              <input
                type="number"
                min="0"
                step="1"
                value={chips}
                onChange={e => setChips(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? 'שומר...' : saveMsg || 'שמור'}
            </button>
          </form>
          <button
            className="btn-danger"
            style={{ marginTop: '0.75rem', width: '100%' }}
            onClick={handleLockPlayer}
            disabled={lockingPlayer}
          >
            נעל את התוצאות שלי
          </button>
        </div>
      )}

      {isPlayer && me && !table.is_locked && me.is_locked && (
        <div className="player-form-card" style={{ opacity: 0.7 }}>
          <h3>התוצאות שלך (נעולות)</h3>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
            <span>ביי-אינים: <strong style={{ color: 'var(--text)' }}>{me.buy_ins}</strong></span>
            <span>ג'טונים: <strong style={{ color: 'var(--text)' }}>{me.chips_remaining ?? '—'}</strong></span>
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            ממתין למארח לסגור את השולחן...
          </p>
        </div>
      )}

      {isPlayer && me && table.is_locked && (
        <div className="player-form-card" style={{ opacity: 0.7 }}>
          <h3>התוצאות שלך (השולחן נעול)</h3>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
            <span>ביי-אינים: <strong style={{ color: 'var(--text)' }}>{me.buy_ins}</strong></span>
            <span>ג'טונים: <strong style={{ color: 'var(--text)' }}>{me.chips_remaining ?? '—'}</strong></span>
          </div>
        </div>
      )}

      <div className="section">
        <h2>שחקנים ({players.length})</h2>
        <div className="players-grid">
          {players.map(p => (
            <div key={p.id} className={`player-card${p.id == playerId ? ' me' : ''}`}>
              <div className="player-name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{p.name}{p.id == playerId ? ' (אתה)' : ''}</span>
                {p.is_locked && <span style={{ fontSize: '0.7rem', color: 'var(--gold)', border: '1px solid var(--gold-dim)', borderRadius: '4px', padding: '1px 5px' }}>נעול</span>}
              </div>
              <div className="player-stats">
                <span>{p.buy_ins} ביי-אין{p.buy_ins !== 1 ? 'ים' : ''}</span>
                <span>
                  {p.chips_remaining !== null && p.chips_remaining !== undefined
                    ? `${p.chips_remaining} ג'טונים`
                    : 'טרם הוזן'}
                </span>
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              אין שחקנים עדיין. שתף את הקוד <strong style={{ color: 'var(--gold)' }}>{table.code}</strong> עם החברים.
            </p>
          )}
        </div>
      </div>

      <button className="btn-link" onClick={() => navigate('/')}>חזרה לדף הבית</button>
    </div>
  )
}
