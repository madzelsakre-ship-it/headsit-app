import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { Radio, Users, ShoppingBag, TrendingUp, Send, CheckCircle, HelpCircle, Zap } from 'lucide-react'
import api from '../services/api'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' F'

export default function Live() {
  const [liveActif, setLiveActif] = useState(null)
  const [plateforme, setPlateforme] = useState('facebook')
  const [commentaires, setCommentaires] = useState([])
  const [commandes, setCommandes] = useState([])
  const [stats, setStats] = useState({ spectateurs: 0, total_ventes: 0, nb_commandes: 0 })
  const [timer, setTimer] = useState(0)
  const [testCommentaire, setTestCommentaire] = useState('')
  const [historique, setHistorique] = useState([])
  const [vue, setVue] = useState('live') // 'live' | 'historique'
  const socketRef = useRef(null)
  const timerRef = useRef(null)
  const commentsEndRef = useRef(null)

  useEffect(() => {
    // Vérifier si un live est déjà actif
    api.get('/live/actif').then(r => { if (r.data) reprendre(r.data) })
    api.get('/live/historique').then(r => setHistorique(r.data))

    socketRef.current = io(window.location.origin)
    socketRef.current.on('commentaire', (c) => {
      setCommentaires(prev => [c, ...prev].slice(0, 100))
    })
    socketRef.current.on('nouvelle_commande', (c) => {
      setCommandes(prev => [c, ...prev].slice(0, 50))
      setStats(s => ({ ...s, nb_commandes: s.nb_commandes + 1, total_ventes: s.total_ventes + Number(c.total || 0) }))
    })
    return () => { socketRef.current?.disconnect(); clearInterval(timerRef.current) }
  }, [])

  useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [commentaires])

  const reprendre = (live) => {
    setLiveActif(live)
    socketRef.current?.emit('rejoindre_live', live.id)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    setStats(s => ({ ...s, spectateurs: Math.floor(Math.random() * 300 + 100) }))
  }

  const demarrer = async () => {
    try {
      const { data } = await api.post('/live/demarrer', { plateforme })
      reprendre(data)
    } catch (err) { alert(err.response?.data?.message || 'Erreur démarrage live') }
  }

  const terminer = async () => {
    if (!confirm('Terminer le live et voir le rapport ?')) return
    try {
      const { data } = await api.post(`/live/${liveActif.id}/terminer`)
      clearInterval(timerRef.current)
      setLiveActif(null); setTimer(0)
      setStats({ spectateurs: 0, total_ventes: data.stats?.total_ventes || 0, nb_commandes: data.stats?.nb_commandes || 0 })
      alert(`Live terminé ✅\n${data.stats?.nb_commandes} commandes | ${fmt(data.stats?.total_ventes)} de ventes`)
      api.get('/live/historique').then(r => setHistorique(r.data))
    } catch (err) { alert('Erreur lors de la fin du live') }
  }

  const envoyerTest = async () => {
    if (!testCommentaire.trim() || !liveActif) return
    try {
      await api.post('/webhooks/simuler', { boutique_id: liveActif.boutique_id, texte: testCommentaire, auteur: 'Client Test' })
      setTestCommentaire('')
    } catch (err) { console.error(err) }
  }

  const fmtTimer = (s) => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  return (
    <div style={{ padding:'28px 32px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:600 }}>Mode Live</h1>
          <p style={{ color:'var(--muted)', fontSize:13, marginTop:2 }}>Détection automatique des commandes dans les commentaires</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Button onClick={() => setVue('live')} variant={vue==='live' ? 'primary' : 'default'}>Live</Button>
          <Button onClick={() => setVue('historique')} variant={vue==='historique' ? 'primary' : 'default'}>Historique</Button>
        </div>
      </div>

      {vue === 'historique' ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', fontSize:14, fontWeight:600 }}>Historique des lives</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead><tr style={{ background:'var(--bg)' }}>
              {['Plateforme','Date','Durée','Commandes','Ventes'].map(h => (
                <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:11, color:'var(--muted)', fontWeight:500, borderBottom:'1px solid var(--border)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {historique.map(l => {
                const duree = l.fin ? Math.round((new Date(l.fin) - new Date(l.debut)) / 60000) : 0
                return (
                  <tr key={l.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'11px 16px' }}><Badge label={l.plateforme} color="blue"/></td>
                    <td style={{ padding:'11px 16px', color:'var(--muted)', fontSize:12 }}>{new Date(l.debut).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                    <td style={{ padding:'11px 16px' }}>{duree} min</td>
                    <td style={{ padding:'11px 16px', fontWeight:600 }}>{l.nb_commandes}</td>
                    <td style={{ padding:'11px 16px', fontWeight:600, color:'var(--accent-dark)' }}>{fmt(l.total_ventes)}</td>
                  </tr>
                )
              })}
              {historique.length === 0 && <tr><td colSpan={5} style={{ padding:24, textAlign:'center', color:'var(--muted)' }}>Aucun live terminé</td></tr>}
            </tbody>
          </table>
        </div>
      ) : !liveActif ? (
        /* Écran de démarrage */
        <div>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:48, textAlign:'center', marginBottom:20 }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--accent-light)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
              <Radio size={28} color="var(--accent)"/>
            </div>
            <h2 style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>Démarrer un live</h2>
            <p style={{ color:'var(--muted)', fontSize:14, maxWidth:440, margin:'0 auto 24px', lineHeight:1.7 }}>
              Headsit détecte automatiquement les commandes dans vos commentaires et met à jour le stock en temps réel.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', alignItems:'center' }}>
              <select value={plateforme} onChange={e => setPlateforme(e.target.value)}
                style={{ padding:'9px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13, minWidth:160 }}>
                <option value="facebook">📘 Facebook Live</option>
                <option value="instagram">📸 Instagram Live</option>
                <option value="tiktok">🎵 TikTok Live</option>
              </select>
              <Button variant="primary" onClick={demarrer}><Radio size={15}/> Lancer le live</Button>
            </div>
          </div>

          {/* Explications */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {[
              { icon: Zap, title: 'Détection auto', desc: 'Les commentaires "je prends", "+1", "je commande" créent une commande automatiquement.', color:'var(--accent)' },
              { icon: ShoppingBag, title: 'Stock en temps réel', desc: 'Le stock est décrémenté instantanément à chaque commande détectée pendant le live.', color:'var(--info)' },
              { icon: TrendingUp, title: 'Rapport post-live', desc: 'À la fin du live, recevez un rapport complet : ventes, produits vendus, clients.', color:'var(--warn)' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'18px 20px' }}>
                <Icon size={20} color={color} style={{ marginBottom:10 }}/>
                <div style={{ fontWeight:600, marginBottom:6, fontSize:14 }}>{title}</div>
                <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Live en cours */
        <div>
          {/* Barre de statut */}
          <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:'var(--radius)', padding:'10px 16px', display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#E24B4A', display:'inline-block', animation:'pulse 1s infinite' }}></span>
            <span style={{ fontSize:13, fontWeight:600, color:'#991B1B' }}>LIVE EN COURS — {plateforme.toUpperCase()}</span>
            <span style={{ fontFamily:'monospace', fontSize:13, color:'#991B1B', marginLeft:'auto' }}>{fmtTimer(timer)}</span>
            <Button variant="danger" onClick={terminer} size="sm">Terminer le live</Button>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
            {[
              { label:'Spectateurs', value: stats.spectateurs, icon: Users },
              { label:'Commandes live', value: stats.nb_commandes, icon: ShoppingBag },
              { label:'Ventes live', value: fmt(stats.total_ventes), icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:22, fontWeight:600 }}>{value}</div>
                </div>
                <Icon size={20} color="var(--muted)"/>
              </div>
            ))}
          </div>

          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'16px 18px', marginBottom:16 }}>
            <div style={{ fontWeight:600, marginBottom:10 }}>Flux automatisé de commande jusqu’à la livraison</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, fontSize:12, color:'var(--muted)' }}>
              {['Capture panier', 'Validation position', 'Clustering zone', 'Livraison active', 'Commande livrée'].map((step, index) => (
                <div key={step} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:11, color:'var(--accent-dark)', fontWeight:600, marginBottom:3 }}>{index + 1}</div>
                  <div>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
            {/* Commandes créées */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:600 }}>
                Commandes créées automatiquement
              </div>
              {commandes.length === 0 ? (
                <div style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
                  Les commandes détectées apparaîtront ici
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead><tr style={{ background:'var(--bg)' }}>
                    {['Client','Produit','Qté','Total','Statut'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, color:'var(--muted)', fontWeight:500, borderBottom:'1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {commandes.map((c, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'9px 12px', fontWeight:500 }}>{c.client || c.client_nom}</td>
                        <td style={{ padding:'9px 12px', color:'var(--muted)' }}>{c.produit || '—'}</td>
                        <td style={{ padding:'9px 12px' }}>{c.quantite || 1}</td>
                        <td style={{ padding:'9px 12px', fontWeight:600, color:'var(--accent-dark)' }}>{fmt(c.total)}</td>
                        <td style={{ padding:'9px 12px' }}><Badge label="Auto" color="green"/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Commentaires */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', display:'flex', flexDirection:'column', maxHeight:480 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:500, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                Commentaires <Badge label={`${commentaires.length}`} color="gray"/>
              </div>

              <div style={{ flex:1, overflow:'auto', padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                {commentaires.length === 0 && (
                  <p style={{ color:'var(--muted)', fontSize:12, textAlign:'center', marginTop:20 }}>
                    Les commentaires apparaîtront ici.<br/>Utilisez le simulateur ci-dessous pour tester.
                  </p>
                )}
                {[...commentaires].reverse().map((c, i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background: c.analyse?.est_commande ? 'var(--accent-light)' : 'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'var(--accent-dark)', flexShrink:0, border:'1px solid var(--border)' }}>
                      {(c.auteur || 'U')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <span style={{ fontSize:12, fontWeight:600 }}>{c.auteur}</span>
                        {c.analyse?.est_commande && <CheckCircle size={12} color="var(--accent)"/>}
                        {c.analyse?.est_question && <HelpCircle size={12} color="var(--warn)"/>}
                      </div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>{c.texte}</div>
                      {c.analyse?.est_commande && c.reponse_suggeree && (
                        <div style={{ fontSize:11, color:'var(--accent-dark)', background:'var(--accent-light)', padding:'4px 8px', borderRadius:6, marginTop:4 }}>
                          💬 {c.reponse_suggeree}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef}/>
              </div>

              {/* Simulateur de commentaire */}
              <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, color:'var(--muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>🧪 Simuler un commentaire</div>
                <div style={{ display:'flex', gap:6 }}>
                  <input value={testCommentaire} onChange={e => setTestCommentaire(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && envoyerTest()}
                    placeholder='ex: "je prends la robe"'
                    style={{ flex:1, padding:'7px 10px', borderRadius:7, border:'1px solid var(--border)', fontSize:12, background:'var(--bg)', color:'var(--text)', outline:'none' }}/>
                  <button onClick={envoyerTest} style={{ padding:'7px 10px', borderRadius:7, background:'var(--accent)', border:'none', color:'#fff', cursor:'pointer' }}>
                    <Send size={13}/>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  )
}
