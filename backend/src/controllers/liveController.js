// src/controllers/liveController.js
// Gestion complète du module live : démarrage, commentaires, commandes auto

import pool from '../config/database.js'

// POST /api/live/demarrer
export const demarrerLive = async (req, res) => {
  const { plateforme, url_stream } = req.body
  if (!plateforme) return res.status(400).json({ message: 'Plateforme requise' })

  try {
    // Fermer les lives actifs de cette boutique
    await pool.query(
      `UPDATE lives SET fin = NOW() WHERE boutique_id = $1 AND fin IS NULL`,
      [req.user.boutique_id]
    )
    const live = await pool.query(
      `INSERT INTO lives (boutique_id, plateforme, url_stream)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.boutique_id, plateforme, url_stream]
    )
    // Notifier via Socket.io
    req.io?.emit(`live_demarre_${req.user.boutique_id}`, live.rows[0])
    res.status(201).json(live.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// POST /api/live/:id/terminer
export const terminerLive = async (req, res) => {
  try {
    const live = await pool.query(
      `UPDATE lives SET fin = NOW(),
        total_ventes = (
          SELECT COALESCE(SUM(total), 0) FROM commandes
          WHERE live_id = $1 AND statut != 'annulee'
        )
       WHERE id = $1 AND boutique_id = $2 RETURNING *`,
      [req.params.id, req.user.boutique_id]
    )
    if (!live.rows.length) return res.status(404).json({ message: 'Live non trouvé' })

    // Rapport de fin
    const stats = await pool.query(
      `SELECT COUNT(*) as nb_commandes, COALESCE(SUM(total),0) as total_ventes,
        COUNT(DISTINCT client_tel) as nb_clients
       FROM commandes WHERE live_id = $1 AND statut != 'annulee'`,
      [req.params.id]
    )
    const rapport = { live: live.rows[0], stats: stats.rows[0] }
    req.io?.emit(`live_termine_${req.user.boutique_id}`, rapport)
    res.json(rapport)
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /api/live/:id/stats
export const statsLive = async (req, res) => {
  try {
    const [live, commandes, top] = await Promise.all([
      pool.query('SELECT * FROM lives WHERE id = $1', [req.params.id]),
      pool.query(
        `SELECT COUNT(*) as nb, COALESCE(SUM(total),0) as total FROM commandes
         WHERE live_id = $1 AND statut != 'annulee'`, [req.params.id]
      ),
      pool.query(
        `SELECT p.nom, SUM(lc.quantite) as vendu FROM lignes_commande lc
         JOIN commandes c ON c.id = lc.commande_id
         JOIN produits p ON p.id = lc.produit_id
         WHERE c.live_id = $1 GROUP BY p.nom ORDER BY vendu DESC LIMIT 5`,
        [req.params.id]
      )
    ])
    res.json({
      live: live.rows[0],
      nb_commandes: commandes.rows[0].nb,
      total_ventes: commandes.rows[0].total,
      top_produits: top.rows
    })
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /api/live/actif
export const liveActif = async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM lives WHERE boutique_id = $1 AND fin IS NULL ORDER BY debut DESC LIMIT 1',
      [req.user.boutique_id]
    )
    res.json(r.rows[0] || null)
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /api/live/historique
export const historiqueLives = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT l.*, COUNT(c.id) as nb_commandes
       FROM lives l LEFT JOIN commandes c ON c.live_id = l.id
       WHERE l.boutique_id = $1 AND l.fin IS NOT NULL
       GROUP BY l.id ORDER BY l.debut DESC LIMIT 20`,
      [req.user.boutique_id]
    )
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}
