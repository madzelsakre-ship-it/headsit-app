import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit, Trash2, AlertTriangle, Mic, Calculator } from 'lucide-react'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' F'
const CATEGORY_ICON = {
  Vêtements: '🧥',
  Accessoires: '👜',
  Alimentaire: '🥬',
  Divers: '📦',
}
const CATEGORY_COLOR = {
  Vêtements: '#ECFDF5',
  Accessoires: '#EFF6FF',
  Alimentaire: '#FEF3C7',
  Divers: '#F5F3FF',
}

function Modal({ produit, onClose, onSave }) {
  const defaultForm = { nom: '', prix: '', stock_total: '', stock_alerte: '5', categorie: '', photo: '' }
  const [form, setForm] = useState(produit || defaultForm)
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceHint, setVoiceHint] = useState('Dites : “Poulet, 3000, 10”')
  const recognitionRef = useRef(null)
  const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg)', color: 'var(--text)', outline: 'none', display: 'block' }

  useEffect(() => {
    setForm(produit || defaultForm)
  }, [produit])

  const updateField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const applyVoiceText = (text) => {
    const cleaned = text.toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, ' ')
    const numbers = [...clean.matchAll(/\d+/g)].map(match => Number(match[0]))
    const name = cleaned.replace(/\d+/g, '').replace(/\b(avec|et|prix|stock|quantite)\b/g, '').trim()

    setForm(prev => ({
      ...prev,
      nom: name ? name[0].toUpperCase() + name.slice(1) : prev.nom,
      prix: numbers[0] ? String(numbers[0]) : prev.prix,
      stock_total: numbers[1] ? String(numbers[1]) : prev.stock_total,
    }))
  }

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('La dictée vocale n’est pas disponible dans ce navigateur.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const speech = event.results[0][0].transcript
      setVoiceHint(speech)
      applyVoiceText(speech)
    }

    recognition.onerror = () => setVoiceHint('Réessayez, nous n’avons pas bien capté.')
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  const prependNumber = (field, value) => {
    setForm(prev => ({ ...prev, [field]: `${prev[field] || ''}${value}` }))
  }

  const clearField = (field) => setForm(prev => ({ ...prev, [field]: '' }))

  const onPhotoSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm(prev => ({ ...prev, photo: reader.result }))
    reader.readAsDataURL(file)
  }

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      if (produit?.id) await api.put(`/produits/${produit.id}`, form)
      else await api.post('/produits', form)
      onSave()
    } catch (err) { alert(err.response?.data?.message || 'Erreur') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 520, maxWidth: '95vw', maxHeight: '92vh', overflow: 'auto' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{produit?.id ? 'Modifier' : 'Ajouter'} un produit</h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Saisie simple, vocale et visuelle pour un usage plus rapide.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Mic size={14} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Dictée vocale</span>
            </div>
            <button type="button" onClick={startVoice} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: isListening ? 'var(--danger)' : 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              {isListening ? 'En écoute…' : 'Micro 🎙️'}
            </button>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>{voiceHint}</div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Calculator size={14} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Pavé numérique</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {['1','2','3','4','5','6','7','8','9','00','0','⌫'].map(val => (
                <button key={val} type="button" onClick={() => val === '⌫' ? clearField('prix') : prependNumber('prix', val)} style={{ padding: '8px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 700, cursor: 'pointer' }}>
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5, color: 'var(--muted)' }}>Photo produit</label>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 110, height: 110, borderRadius: 14, border: '1px dashed var(--border)', overflow: 'hidden', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {form.photo ? <img src={form.photo} alt="Produit" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 30 }}>📸</span>}
              </div>
              <label style={{ display: 'block', cursor: 'pointer', width: '100%' }}>
                <span style={{ display: 'inline-block', width: '100%', textAlign: 'center', padding: '10px 12px', borderRadius: 10, background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>Prendre une photo</span>
                <input type="file" accept="image/*" capture="environment" onChange={onPhotoSelected} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {[['Nom du produit', 'nom', 'text', 'Robe bogolan'], ['Prix (FCFA)', 'prix', 'number', '12500'], ['Stock initial', 'stock_total', 'number', '10'], ['Seuil alerte stock', 'stock_alerte', 'number', '5'], ['Catégorie', 'categorie', 'text', 'Vêtements']].map(([label, name, type, ph]) => (
            <div key={name} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5, color: 'var(--muted)' }}>{label}</label>
              <input style={inp} type={type} placeholder={ph} value={form[name] || ''} onChange={updateField(name)} required={['nom', 'prix'].includes(name)} />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <Button onClick={onClose}>Annuler</Button>
            <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Produits() {
  const [produits, setProduits] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const load = () => api.get('/produits').then(r => { setProduits(r.data); setLoading(false) })
  useEffect(() => { load() }, [])

  const supprimer = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return
    await api.delete(`/produits/${id}`); load()
  }

  const filtered = produits.filter(p => p.nom.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Produits</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{produits.length} produits dans votre catalogue</p>
        </div>
        <Button variant="primary" onClick={() => setModal({})}><Plus size={15} /> Ajouter un produit</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {filtered.slice(0, 6).map(p => {
          const faible = Number(p.stock_total) <= Number(p.stock_alerte)
          return (
            <div key={p.id} style={{ background: faible ? '#FEE2E2' : CATEGORY_COLOR[p.categorie] || '#F5F3FF', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{CATEGORY_ICON[p.categorie] || '📦'}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.nom}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{p.categorie || 'Divers'}</div>
              <div style={{ fontWeight: 700, color: 'var(--accent-dark)' }}>{fmt(p.prix)}</div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: faible ? '#EF4444' : '#16A34A', display: 'inline-block' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: faible ? '#B91C1C' : '#166534' }}>{faible ? 'Stock bas' : 'Stock OK'}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--muted)' }}>Chargement...</p> : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Produit', 'Catégorie', 'Prix', 'Stock', 'Statut', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const faible = Number(p.stock_total) <= Number(p.stock_alerte)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 10, background: CATEGORY_COLOR[p.categorie] || '#F5F3FF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{CATEGORY_ICON[p.categorie] || '📦'}</span>
                      {p.nom}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{p.categorie || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent-dark)' }}>{fmt(p.prix)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {faible && <AlertTriangle size={13} color="var(--warn)" />}
                        <span style={{ color: faible ? 'var(--warn)' : 'inherit', fontWeight: faible ? 600 : 400 }}>{p.stock_total}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}><Badge label={faible ? 'Stock faible' : 'OK'} color={faible ? 'amber' : 'green'} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setModal(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><Edit size={15} /></button>
                        <button onClick={() => supprimer(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Aucun produit trouvé</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal !== null && <Modal produit={modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />}
    </div>
  )
}
