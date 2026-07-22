// src/controllers/exportController.js
import pool from '../config/database.js'
import { genererExcel, genererPDF } from '../services/exportService.js'

async function getData(boutique_id, debut, fin) {
  const dateDebut = debut || new Date(Date.now() - 30 * 86400000).toISOString()
  const dateFin = fin || new Date().toISOString()

  const [boutiqueRes, commandesRes, produitsRes] = await Promise.all([
    pool.query('SELECT * FROM boutiques WHERE id = $1', [boutique_id]),
    pool.query(
      `SELECT * FROM commandes WHERE boutique_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date DESC`,
      [boutique_id, dateDebut, dateFin]
    ),
    pool.query(
      `SELECT * FROM produits WHERE boutique_id = $1 AND actif = true ORDER BY nom`,
      [boutique_id]
    ),
  ])

  const debut_fmt = new Date(dateDebut).toLocaleDateString('fr-FR')
  const fin_fmt = new Date(dateFin).toLocaleDateString('fr-FR')

  return {
    boutique: boutiqueRes.rows[0],
    commandes: commandesRes.rows,
    produits: produitsRes.rows,
    periode: `${debut_fmt} → ${fin_fmt}`
  }
}

// GET /api/export/excel?debut=2026-01-01&fin=2026-01-31
export const exporterExcel = async (req, res) => {
  try {
    const data = await getData(req.user.boutique_id, req.query.debut, req.query.fin)
    const wb = await genererExcel(data)

    const nom = `headsit-rapport-${Date.now()}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`)
    await wb.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erreur génération Excel' })
  }
}

// GET /api/export/pdf?debut=2026-01-01&fin=2026-01-31
export const exporterPDF = async (req, res) => {
  try {
    const data = await getData(req.user.boutique_id, req.query.debut, req.query.fin)
    const nom = `headsit-rapport-${Date.now()}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${nom}"`)
    genererPDF(data, res)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Erreur génération PDF' })
  }
}
