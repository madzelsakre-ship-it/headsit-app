import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nom:'', email:'', mot_de_passe:'', nom_boutique:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const updateField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try { await register(form); navigate('/') }
    catch (err) { setError(err.response?.data?.message || 'Erreur inscription') }
    finally { setLoading(false) }
  }

  const Field = ({ label, name, type='text', placeholder }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>{label}</label>
      <input type={type} value={form[name]} onChange={updateField(name)} placeholder={placeholder} required autoComplete={name === 'email' ? 'email' : name === 'mot_de_passe' ? 'new-password' : 'off'}
        style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid var(--border)', fontSize:14, background:'var(--bg)', color:'var(--text)', outline:'none' }}/>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #f4fbf8 0%, #eef2f7 100%)', padding:24 }}>
      <div style={{ background:'rgba(255,255,255,0.94)', border:'1px solid rgba(29, 158, 117, 0.12)', borderRadius:22, padding:'34px 32px', width:'100%', maxWidth:430, boxShadow:'0 20px 60px rgba(15, 36, 56, 0.12)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:54, height:54, borderRadius:16, background:'linear-gradient(135deg, var(--accent), #13a274)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:22, marginBottom:14, boxShadow:'0 10px 24px rgba(29, 158, 117, 0.28)' }}>H</div>
          <h1 style={{ fontSize:24, fontWeight:700, marginBottom:4, color:'#10231c' }}>Créer un compte</h1>
          <p style={{ color:'var(--muted)', fontSize:13, margin:0 }}>Lancez votre boutique Headsit aujourd'hui</p>
        </div>

        {error && <div style={{ background:'var(--danger-light)', color:'var(--danger)', padding:'10px 14px', borderRadius:10, fontSize:13, marginBottom:16, border:'1px solid rgba(153, 60, 29, 0.18)' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <Field label="Nom complet" name="nom" placeholder="Amina Koné"/>
          <Field label="Email" name="email" type="email" placeholder="vous@exemple.com"/>
          <Field label="Mot de passe" name="mot_de_passe" type="password" placeholder="Minimum 8 caractères"/>
          <Field label="Nom de votre boutique" name="nom_boutique" placeholder="Boutique Amina Mode"/>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'12px 14px', borderRadius:10, background:'linear-gradient(135deg, var(--accent), #0f8d70)', color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, marginTop:6, boxShadow:'0 10px 24px rgba(29, 158, 117, 0.22)' }}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'var(--muted)' }}>
          Déjà un compte ? <Link to="/login" style={{ color:'var(--accent)', fontWeight:700 }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
