import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', mot_de_passe: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field) => (e) => {
    const value = e.target.value
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(form.email, form.mot_de_passe)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #f4fbf8 0%, #eef2f7 100%)', padding:24 }}>
      <div style={{ background:'rgba(255,255,255,0.94)', border:'1px solid rgba(29, 158, 117, 0.12)', borderRadius:22, padding:'34px 32px', width:'100%', maxWidth:430, boxShadow:'0 20px 60px rgba(15, 36, 56, 0.12)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:54, height:54, borderRadius:16, background:'linear-gradient(135deg, var(--accent), #13a274)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:22, marginBottom:14, boxShadow:'0 10px 24px rgba(29, 158, 117, 0.28)' }}>H</div>
          <h1 style={{ fontSize:24, fontWeight:700, marginBottom:4, color:'#10231c' }}>Connexion</h1>
          <p style={{ color:'var(--muted)', fontSize:13, margin:0 }}>Accédez à votre boutique Headsit</p>
        </div>

        {error && <div style={{ background:'var(--danger-light)', color:'var(--danger)', padding:'10px 14px', borderRadius:10, fontSize:13, marginBottom:16, border:'1px solid rgba(153, 60, 29, 0.18)' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#23312a' }}>Email</label>
            <input type="email" value={form.email} onChange={updateField('email')} placeholder="vous@exemple.com" required autoComplete="email"
              style={{ width:'100%', padding:'11px 12px', borderRadius:10, border:'1px solid var(--border)', fontSize:14, background:'#f9fbfa', color:'var(--text)', outline:'none', boxShadow:'inset 0 1px 1px rgba(0,0,0,0.02)' }}/>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6, color:'#23312a' }}>Mot de passe</label>
            <input type="password" value={form.mot_de_passe} onChange={updateField('mot_de_passe')} placeholder="••••••••" required autoComplete="current-password"
              style={{ width:'100%', padding:'11px 12px', borderRadius:10, border:'1px solid var(--border)', fontSize:14, background:'#f9fbfa', color:'var(--text)', outline:'none', boxShadow:'inset 0 1px 1px rgba(0,0,0,0.02)' }}/>
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'12px 14px', borderRadius:10, background:'linear-gradient(135deg, var(--accent), #0f8d70)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, boxShadow:'0 10px 24px rgba(29, 158, 117, 0.22)' }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'var(--muted)' }}>
          Pas encore de compte ? <Link to="/register" style={{ color:'var(--accent)', fontWeight:700 }}>Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
