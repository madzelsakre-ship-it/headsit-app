import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import api from '../services/api'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' F'
const statusColor = { en_attente:'amber', confirmee:'blue', en_cours_livraison:'blue', livree:'green', annulee:'coral' }
const statusLabel = { en_attente:'En attente', confirmee:'Confirmée', en_cours_livraison:'En cours de livraison', livree:'Livrée', annulee:'Annulée' }
const statusList = ['en_attente','confirmee','en_cours_livraison','livree','annulee']
const livraisonHint = {
  en_attente: 'Panier créé, attente de validation',
  confirmee: 'Commande validée, préparation en cours',
  en_cours_livraison: 'Livreur assigné, tournée active',
  livree: 'Commande livrée et clôturée',
  annulee: 'Commande annulée'
}

export default function Commandes() {
  const [commandes, setCommandes] = useState([])
  const [filtre, setFiltre] = useState('')
  const [loading, setLoading] = useState(true)

  const load = (statut='') => {
    setLoading(true)
    api.get(`/commandes${statut ? `?statut=${statut}` : ''}`).then(r => setCommandes(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const changerStatut = async (id, statut) => {
    await api.patch(`/commandes/${id}/statut`, { statut }); load(filtre)
  }

  return (
    <div style={{ padding:'28px 32px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:600 }}>Commandes</h1>
          <p style={{ color:'var(--muted)', fontSize:13, marginTop:2 }}>{commandes.length} commandes</p>
        </div>
        <Button><Download size={14}/> Exporter</Button>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:18 }}>
        <button onClick={() => { setFiltre(''); load('') }}
          style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, border:'1px solid', cursor:'pointer', background: filtre==='' ? 'var(--accent-light)' : 'transparent', borderColor: filtre==='' ? 'var(--accent)' : 'var(--border)', color: filtre==='' ? 'var(--accent-dark)' : 'var(--muted)' }}>
          Toutes
        </button>
        {statusList.map(s => (
          <button key={s} onClick={() => { setFiltre(s); load(s) }}
            style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, border:'1px solid', cursor:'pointer', background: filtre===s ? 'var(--accent-light)' : 'transparent', borderColor: filtre===s ? 'var(--accent)' : 'var(--border)', color: filtre===s ? 'var(--accent-dark)' : 'var(--muted)' }}>
            {statusLabel[s]}
          </button>
        ))}
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
        {loading ? <p style={{ padding:24, color:'var(--muted)' }}>Chargement...</p> : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--bg)' }}>
                {['#','Client','Zone','Adresse','Produits','Total','Source','Date','Statut','Action'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, color:'var(--muted)', fontWeight:500, borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commandes.map(c => (
                <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize:11, color:'var(--muted)' }}>#{c.id.slice(-4).toUpperCase()}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ fontWeight:500 }}>{c.client_nom || '—'}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{c.client_tel || ''}</div>
                  </td>
                  <td style={{ padding:'12px 16px', fontWeight:500 }}>{c.zone || 'À définir'}</td>
                  <td style={{ padding:'12px 16px', color:'var(--muted)', fontSize:12 }}>{c.adresse || 'À définir'}</td>
                  <td style={{ padding:'12px 16px', color:'var(--muted)', fontSize:12 }}>
                    {c.lignes?.filter(l => l.produit).map((l,i) => <div key={i}>{l.produit} ×{l.quantite}</div>)}
                  </td>
                  <td style={{ padding:'12px 16px', fontWeight:600, color:'var(--accent-dark)' }}>{fmt(c.total)}</td>
                  <td style={{ padding:'12px 16px' }}><Badge label={c.live_id ? 'Live' : 'Boutique'} color={c.live_id ? 'blue' : 'gray'}/></td>
                  <td style={{ padding:'12px 16px', color:'var(--muted)', fontSize:12 }}>{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ marginBottom:4 }}><Badge label={statusLabel[c.statut]} color={statusColor[c.statut]}/></div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{livraisonHint[c.statut] || 'Suivi en cours'}</div>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <select value={c.statut} onChange={e => changerStatut(c.id, e.target.value)}
                      style={{ fontSize:11, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', cursor:'pointer' }}>
                      {statusList.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {commandes.length === 0 && <tr><td colSpan={10} style={{ padding:24, textAlign:'center', color:'var(--muted)' }}>Aucune commande</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
