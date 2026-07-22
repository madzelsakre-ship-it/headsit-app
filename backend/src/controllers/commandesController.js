import pool from '../config/database.js'
import { devStore } from '../services/devStore.js'

export const listerCommandes = async (req, res) => {
  const { statut, page = 1, limit = 20 } = req.query
  try {
    const r = await pool.query(`SELECT c.*, json_agg(json_build_object('produit',p.nom,'quantite',lc.quantite,'prix',lc.prix_unitaire)) AS lignes FROM commandes c LEFT JOIN lignes_commande lc ON lc.commande_id=c.id LEFT JOIN produits p ON p.id=lc.produit_id WHERE c.boutique_id=$1 GROUP BY c.id ORDER BY c.date DESC LIMIT $2 OFFSET $3`, [req.user.boutique_id, Number(limit), (Number(page) - 1) * Number(limit)])
    res.json(r.rows)
  } catch (err) {
    const list = devStore.listCommands(req.user.boutique_id, statut || '')
    return res.json(list)
  }
}

export const creerCommande = async (req, res) => {
  const { client_nom, client_tel, lignes, mode_paiement, live_id, zone, adresse_livraison, livreur } = req.body
  if (!lignes?.length) return res.status(400).json({ message: 'Lignes requises' })

  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const total = lignes.reduce((s, l) => s + Number(l.prix_unitaire || 0) * Number(l.quantite || 0), 0)
      const cmd = await client.query(
        `INSERT INTO commandes (boutique_id,client_nom,client_tel,total,mode_paiement,live_id,statut,zone,adresse_livraison,livreur)
         VALUES ($1,$2,$3,$4,$5,$6,'en_attente',$7,$8,$9) RETURNING *`,
        [req.user.boutique_id, client_nom, client_tel, total, mode_paiement, live_id, zone || 'À définir', adresse_livraison || 'À définir', livreur || 'À assigner']
      )
      for (const l of lignes) {
        await client.query(`INSERT INTO lignes_commande (commande_id,produit_id,variante_id,quantite,prix_unitaire) VALUES ($1,$2,$3,$4,$5)`, [cmd.rows[0].id, l.produit_id, l.variante_id, l.quantite, l.prix_unitaire])
        await client.query('UPDATE produits SET stock_total=stock_total-$1 WHERE id=$2', [l.quantite, l.produit_id])
      }
      await client.query('COMMIT')
      req.io?.to(`live_${live_id}`).emit('nouvelle_commande', cmd.rows[0])
      res.status(201).json(cmd.rows[0])
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    const command = devStore.createCommand(req.user.boutique_id, {
      client_nom,
      client_tel,
      lignes,
      mode_paiement,
      live_id,
      total: lignes.reduce((s, l) => s + Number(l.prix_unitaire || 0) * Number(l.quantite || 0), 0),
      zone,
      adresse: adresse_livraison,
      livreur,
    })
    return res.status(201).json(command)
  }
}

export const changerStatut = async (req, res) => {
  const { statut } = req.body
  if (!['en_attente', 'confirmee', 'en_cours_livraison', 'livree', 'annulee'].includes(statut)) return res.status(400).json({ message: 'Statut invalide' })
  try {
    const r = await pool.query('UPDATE commandes SET statut=$1 WHERE id=$2 AND boutique_id=$3 RETURNING *', [statut, req.params.id, req.user.boutique_id])
    if (!r.rows.length) return res.status(404).json({ message: 'Commande non trouvée' })
    res.json(r.rows[0])
  } catch (err) {
    const updated = devStore.updateCommandStatus(req.user.boutique_id, req.params.id, statut)
    if (!updated) return res.status(404).json({ message: 'Commande non trouvée' })
    return res.json(updated)
  }
}

export const assignerLivraison = async (req, res) => {
  const { zone, adresse_livraison, livreur, statut } = req.body
  try {
    const r = await pool.query(
      `UPDATE commandes
       SET zone=$1, adresse_livraison=$2, livreur=$3, statut=COALESCE($4, statut)
       WHERE id=$5 AND boutique_id=$6 RETURNING *`,
      [zone || 'À définir', adresse_livraison || 'À définir', livreur || 'À assigner', statut || null, req.params.id, req.user.boutique_id]
    )
    if (!r.rows.length) return res.status(404).json({ message: 'Commande non trouvée' })
    return res.json(r.rows[0])
  } catch (err) {
    const current = devStore.state.commands.find((c) => c.id === req.params.id && c.boutique_id === req.user.boutique_id)
    if (!current) return res.status(404).json({ message: 'Commande non trouvée' })
    current.zone = zone || current.zone || 'À définir'
    current.adresse = adresse_livraison || current.adresse || 'À définir'
    current.livreur = livreur || current.livreur || 'À assigner'
    if (statut) current.statut = statut
    return res.json(current)
  }
}
