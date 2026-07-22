import pool from '../config/database.js'
import { devStore } from '../services/devStore.js'

export const getDashboard = async (req, res) => {
  const bid = req.user.boutique_id
  try {
    const [ventes, commandes, alertes, evolution] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total),0) as total_jour,(SELECT COALESCE(SUM(total),0) FROM commandes WHERE boutique_id=$1 AND DATE(date)=CURRENT_DATE-1) as total_hier FROM commandes WHERE boutique_id=$1 AND DATE(date)=CURRENT_DATE AND statut!='annulee'`, [bid]),
      pool.query(`SELECT statut,COUNT(*) as count FROM commandes WHERE boutique_id=$1 GROUP BY statut`, [bid]),
      pool.query(`SELECT COUNT(*) as count FROM produits WHERE boutique_id=$1 AND actif=true AND stock_total<=stock_alerte`, [bid]),
      pool.query(`SELECT DATE(date) as jour,COALESCE(SUM(total),0) as total FROM commandes WHERE boutique_id=$1 AND date>=CURRENT_DATE-INTERVAL '7 days' AND statut!='annulee' GROUP BY DATE(date) ORDER BY jour`, [bid])
    ])
    res.json({ ventes_jour: ventes.rows[0].total_jour, ventes_hier: ventes.rows[0].total_hier, commandes: commandes.rows, alertes_stock: alertes.rows[0].count, evolution_7j: evolution.rows })
  } catch (err) {
    return res.json(devStore.getDashboard(bid))
  }
}
