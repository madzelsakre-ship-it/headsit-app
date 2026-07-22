import pool from '../config/database.js'
import { devStore } from '../services/devStore.js'

export const listerProduits = async (req, res) => {
  try {
    const r = await pool.query(`SELECT p.*, COALESCE(json_agg(v.*) FILTER (WHERE v.id IS NOT NULL),'[]') AS variantes FROM produits p LEFT JOIN variantes v ON v.produit_id=p.id WHERE p.boutique_id=$1 AND p.actif=true GROUP BY p.id ORDER BY p.created_at DESC`, [req.user.boutique_id])
    res.json(r.rows)
  } catch (err) {
    return res.json(devStore.listProducts(req.user.boutique_id))
  }
}

export const creerProduit = async (req, res) => {
  const { nom, prix, stock_total, stock_alerte, categorie, variantes } = req.body
  if (!nom || !prix) return res.status(400).json({ message: 'Nom et prix requis' })

  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const prod = await client.query(`INSERT INTO produits (boutique_id,nom,prix,stock_total,stock_alerte,categorie) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [req.user.boutique_id, nom, prix, stock_total || 0, stock_alerte || 5, categorie])
      if (variantes?.length) for (const v of variantes) await client.query('INSERT INTO variantes (produit_id,nom,prix,stock) VALUES ($1,$2,$3,$4)', [prod.rows[0].id, v.nom, v.prix || prix, v.stock || 0])
      await client.query('COMMIT')
      res.status(201).json(prod.rows[0])
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    const product = devStore.createProduct(req.user.boutique_id, { nom, prix, stock_total, stock_alerte, categorie, variantes })
    return res.status(201).json(product)
  }
}

export const modifierProduit = async (req, res) => {
  const { nom, prix, stock_total, stock_alerte, categorie } = req.body
  try {
    const r = await pool.query(`UPDATE produits SET nom=$1,prix=$2,stock_total=$3,stock_alerte=$4,categorie=$5 WHERE id=$6 AND boutique_id=$7 RETURNING *`, [nom, prix, stock_total, stock_alerte, categorie, req.params.id, req.user.boutique_id])
    if (!r.rows.length) return res.status(404).json({ message: 'Produit non trouvé' })
    res.json(r.rows[0])
  } catch (err) {
    const product = devStore.updateProduct(req.user.boutique_id, req.params.id, { nom, prix, stock_total, stock_alerte, categorie })
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' })
    return res.json(product)
  }
}

export const supprimerProduit = async (req, res) => {
  try {
    await pool.query('UPDATE produits SET actif=false WHERE id=$1 AND boutique_id=$2', [req.params.id, req.user.boutique_id])
    res.json({ message: 'Produit supprimé' })
  } catch (err) {
    devStore.deleteProduct(req.user.boutique_id, req.params.id)
    return res.json({ message: 'Produit supprimé' })
  }
}

export const alertesStock = async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM produits WHERE boutique_id=$1 AND actif=true AND stock_total<=stock_alerte ORDER BY stock_total ASC`, [req.user.boutique_id])
    res.json(r.rows)
  } catch (err) {
    const list = devStore.listProducts(req.user.boutique_id).filter((item) => Number(item.stock_total) <= Number(item.stock_alerte))
    return res.json(list)
  }
}
