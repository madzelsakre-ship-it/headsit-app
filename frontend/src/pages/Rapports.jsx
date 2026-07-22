import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import api from '../services/api'

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' F'
const COLORS = ['#1D9E75', '#185FA5', '#BA7517', '#993C1D']

export default function Rapports() {
  const [data, setData] = useState(null)
  const [debut, setDebut] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [fin, setFin] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(null)

  useEffect(() => { charger() }, [])

  const charger = () => {
    setLoading(true)
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }

  const exporter = async (format) => {
    setExporting(format)
    try {
      const token = localStorage.getItem('headsit_token')
      const url = `/api/export/${format}?debut=${debut}&fin=${fin}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `headsit-rapport-${debut}-${fin}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) { alert('Erreur export') }
    finally { setExporting(null) }
  }

  if (loading) return <div style={{ padding:40, color:'var(--muted)' }}>Chargement...</div>

  const ventes = data?.evolution_7j || []
  const totalPeriode = ventes.reduce((s, d) => s + Number(d.total), 0)
  const maxJour = Math.max(...ventes.map(v => Number(v.total)), 0)
  const cmds = data?.commandes || []
  const pieData = cmds.map(c => ({ name: c.statut, value: Number(c.count) }))

  const statusLabel = { en_attente:'En attente', confirmee:'Confirmée', livree:'Livrée', annulee:'Annulée' }

  return (
    <div style={{ padding:'28px 32px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:600 }}>Rapports & analytics</h1>
          <p style={{ color:'var(--muted)', fontSize:13, marginTop:2 }}>Analysez votre activité et exportez vos données</p>
        </div>
        {/* Filtres dates + export */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <input type="date" value={debut} onChange={e => setDebut(e.target.value)}
            style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', fontSize:12, background:'var(--surface)', color:'var(--text)' }}/>
          <span style={{ color:'var(--muted)', fontSize:12 }}>→</span>
          <input type="date" value={fin} onChange={e => setFin(e.target.value)}
            style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', fontSize:12, background:'var(--surface)', color:'var(--text)' }}/>
          <button onClick={charger} style={{ padding:'7px 14px', borderRadius:8, background:'var(--bg)', border:'1px solid var(--border)', fontSize:12, cursor:'pointer', color:'var(--text)' }}>
            Actualiser
          </button>
          <button onClick={() => exporter('excel')} disabled={exporting==='excel'}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, background:'#E1F5EE', border:'1px solid #9FE1CB', fontSize:12, cursor:'pointer', color:'var(--accent-dark)', fontWeight:500 }}>
            <FileSpreadsheet size={14}/> {exporting==='excel' ? 'Export...' : 'Excel'}
          </button>
          <button onClick={() => exporter('pdf')} disabled={exporting==='pdf'}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, background:'#FAECE7', border:'1px solid #F5C4B3', fontSize:12, cursor:'pointer', color:'var(--danger)', fontWeight:500 }}>
            <FileText size={14}/> {exporting==='pdf' ? 'Export...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Ventes (7j)', value: fmt(totalPeriode), sub: `${ventes.length} jours de données` },
          { label:'Moyenne/jour', value: fmt(ventes.length ? Math.round(totalPeriode/ventes.length) : 0) },
          { label:'Meilleur jour', value: fmt(maxJour), sub: ventes.find(v => Number(v.total) === maxJour)?.jour ? new Date(ventes.find(v => Number(v.total) === maxJour).jour).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' }) : '' },
          { label:'Alertes stock', value: data?.alertes_stock || 0, sub:'produits à réapprovisionner', subColor: data?.alertes_stock > 0 ? 'var(--warn)' : 'var(--muted)' },
        ].map(({ label, value, sub, subColor }) => (
          <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 20px' }}>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:600 }}>{value}</div>
            {sub && <div style={{ fontSize:11, color: subColor || 'var(--muted)', marginTop:2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:20 }}>
          <h2 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Ventes par jour</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ventes} margin={{ top:5, right:10, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="jour" tick={{ fontSize:11 }} tickLine={false} axisLine={false}
                tickFormatter={v => new Date(v).toLocaleDateString('fr-FR', { weekday:'short' })}/>
              <YAxis hide/>
              <Tooltip formatter={v => [fmt(v), 'Ventes']} contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid var(--border)' }}/>
              <Bar dataKey="total" fill="#1D9E75" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:20 }}>
          <h2 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Commandes par statut</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, statusLabel[n] || n]} contentStyle={{ fontSize:12, borderRadius:8 }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8, justifyContent:'center' }}>
            {pieData.map((d, i) => (
              <div key={d.name} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--muted)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: COLORS[i % COLORS.length] }}/>
                {statusLabel[d.name]} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tendance */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:20, marginBottom:16 }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Tendance des ventes</h2>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={ventes} margin={{ top:5, right:10, bottom:0, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
            <XAxis dataKey="jour" tick={{ fontSize:11 }} tickLine={false} axisLine={false}
              tickFormatter={v => new Date(v).toLocaleDateString('fr-FR', { weekday:'short' })}/>
            <YAxis hide/>
            <Tooltip formatter={v => [fmt(v), 'Ventes']} contentStyle={{ fontSize:12, borderRadius:8 }}/>
            <Line type="monotone" dataKey="total" stroke="#185FA5" strokeWidth={2} dot={{ r:3, fill:'#185FA5' }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tableau détaillé */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontSize:14, fontWeight:600 }}>Détail par jour</h2>
          <span style={{ fontSize:12, color:'var(--muted)' }}>7 derniers jours</span>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--bg)' }}>
              {['Jour', 'Ventes', 'Variation'].map(h => (
                <th key={h} style={{ padding:'9px 20px', textAlign:'left', fontSize:11, color:'var(--muted)', fontWeight:500, borderBottom:'1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ventes.map((v, i) => {
              const prev = ventes[i - 1]
              const pct = prev && Number(prev.total) > 0 ? ((Number(v.total) - Number(prev.total)) / Number(prev.total) * 100).toFixed(0) : null
              return (
                <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'11px 20px' }}>{new Date(v.jour).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</td>
                  <td style={{ padding:'11px 20px', fontWeight:600, color:'var(--accent-dark)' }}>{fmt(v.total)}</td>
                  <td style={{ padding:'11px 20px' }}>
                    {pct !== null && (
                      <span style={{ fontSize:12, fontWeight:500, color: pct >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                        {pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}%
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {ventes.length === 0 && (
              <tr><td colSpan={3} style={{ padding:24, textAlign:'center', color:'var(--muted)' }}>Aucune donnée sur cette période</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
