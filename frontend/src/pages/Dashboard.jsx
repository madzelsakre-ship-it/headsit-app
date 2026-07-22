import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' F'
const statusColor = { en_attente:'amber', confirmee:'blue', en_cours_livraison:'blue', livree:'green', annulee:'coral' }
const statusLabel = { en_attente:'En attente', confirmee:'Confirmée', en_cours_livraison:'En cours de livraison', livree:'Livrée', annulee:'Annulée' }

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/dashboard'), api.get('/commandes?limit=5')])
      .then(([d, c]) => { setData(d.data); setCommandes(c.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding:40, color:'var(--muted)' }}>Chargement...</div>

  const heureFr = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
  const total = data?.commandes?.reduce((s,c) => s + Number(c.count), 0) || 0
  const enAttente = data?.commandes?.find(c => c.statut==='en_attente')?.count || 0
  const pct = data?.ventes_hier > 0 ? Math.round((data.ventes_jour - data.ventes_hier) / data.ventes_hier * 100) : 0

  return (
    <div style={{ padding:'28px 32px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:600 }}>Bonjour, {user?.nom?.split(' ')[0]} 👋</h1>
        <p style={{ color:'var(--muted)', fontSize:13, marginTop:2, textTransform:'capitalize' }}>{heureFr}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Ventes aujourd'hui" value={fmt(data?.ventes_jour || 0)}
          sub={pct >= 0 ? `+${pct}% vs hier` : `${pct}% vs hier`}
          subColor={pct >= 0 ? 'var(--accent)' : 'var(--danger)'} icon={TrendingUp} iconColor="var(--accent)"/>
        <StatCard label="Commandes" value={total} sub={`${enAttente} en attente`} icon={ShoppingCart}/>
        <StatCard label="Alertes stock" value={data?.alertes_stock || 0}
          sub={data?.alertes_stock > 0 ? 'Réapprovisionnement requis' : 'Tout est ok'}
          subColor={data?.alertes_stock > 0 ? 'var(--warn)' : 'var(--accent)'} icon={AlertTriangle}
          iconColor={data?.alertes_stock > 0 ? 'var(--warn)' : 'var(--muted)'}/>
        <StatCard label="Hier" value={fmt(data?.ventes_hier || 0)} sub="Ventes totales" icon={Package}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, marginBottom:24 }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'20px' }}>
          <h2 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Évolution des ventes — 7 jours</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data?.evolution_7j || []} margin={{ top:5, right:10, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="jour" tick={{ fontSize:11, fill:'#999' }} tickLine={false} axisLine={false}
                tickFormatter={v => new Date(v).toLocaleDateString('fr-FR', { weekday:'short' })}/>
              <YAxis hide/>
              <Tooltip formatter={v => [fmt(v), 'Ventes']} labelStyle={{ fontSize:12 }} contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid var(--border)' }}/>
              <Area type="monotone" dataKey="total" stroke="#1D9E75" strokeWidth={2} fill="url(#grad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'20px' }}>
          <h2 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Statut commandes</h2>
          {data?.commandes?.map(c => (
            <div key={c.statut} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <Badge label={statusLabel[c.statut] || c.statut} color={statusColor[c.statut] || 'gray'}/>
              <span style={{ fontWeight:600, fontSize:15 }}>{c.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontSize:14, fontWeight:600 }}>Dernières commandes</h2>
          <a href="/commandes" style={{ fontSize:12, color:'var(--accent)' }}>Voir tout →</a>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--bg)' }}>
              {['#','Client','Total','Source','Statut','Date'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, color:'var(--muted)', fontWeight:500, borderBottom:'1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {commandes.map(c => (
              <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'11px 16px', color:'var(--muted)', fontFamily:'monospace', fontSize:12 }}>#{c.id.slice(-4).toUpperCase()}</td>
                <td style={{ padding:'11px 16px', fontWeight:500 }}>{c.client_nom || '—'}</td>
                <td style={{ padding:'11px 16px', fontWeight:600, color:'var(--accent-dark)' }}>{fmt(c.total)}</td>
                <td style={{ padding:'11px 16px' }}><Badge label={c.live_id ? 'Live' : 'Boutique'} color={c.live_id ? 'blue' : 'gray'}/></td>
                <td style={{ padding:'11px 16px' }}><Badge label={statusLabel[c.statut]} color={statusColor[c.statut]}/></td>
                <td style={{ padding:'11px 16px', color:'var(--muted)', fontSize:12 }}>{new Date(c.date).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
            {commandes.length === 0 && <tr><td colSpan={6} style={{ padding:'24px', textAlign:'center', color:'var(--muted)' }}>Aucune commande pour l'instant</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
