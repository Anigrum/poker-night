import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSettlement } from '../api'

export default function Settlement() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getSettlement(code)
      .then(setData)
      .catch(err => setError(err.detail || 'לא ניתן לטעון את החישוב'))
  }, [code])

  if (error) return <div className="center error">{error}</div>
  if (!data) return <div className="center">מחשב...</div>

  const { transactions, player_nets } = data

  return (
    <div className="settlement">
      <h1>חישוב תשלומים</h1>
      <p className="subtitle">שולחן {code}</p>

      <div className="section">
        <h2>תוצאות</h2>
        <div className="nets-grid">
          {player_nets.map(p => (
            <div
              key={p.name}
              className={`net-card ${p.net > 0 ? 'winner' : p.net < 0 ? 'loser' : 'even'}`}
            >
              <div className="net-name">{p.name}</div>
              <div className="net-amount">
                {p.net > 0 ? '+' : ''}₪{Math.abs(p.net).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2>תשלומים</h2>
        {transactions.length === 0 ? (
          <p style={{ color: 'var(--text-dim)' }}>הכל מאוזן — אין צורך בתשלומים!</p>
        ) : (
          <div className="transactions">
            {transactions.map((t, i) => (
              <div key={i} className="transaction">
                <span className="from">{t.from}</span>
                <span className="arrow">משלם ל</span>
                <span className="to">{t.to}</span>
                <span className="amount">₪{t.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn-link" onClick={() => navigate(`/table/${code}`)}>
        חזרה לשולחן
      </button>
    </div>
  )
}
