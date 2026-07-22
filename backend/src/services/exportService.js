// src/services/exportService.js
// Génération PDF et Excel des rapports Headsit

import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

const VERT = '#1D9E75'
const GRIS = '#6b6b65'
const NOIR = '#1a1a18'

// ─────────────────────────────────────────
// EXCEL
// ─────────────────────────────────────────
export async function genererExcel({ boutique, commandes, produits, periode }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Headsit'
  wb.created = new Date()

  // ── Feuille 1 : Résumé ──
  const resume = wb.addWorksheet('Résumé', { properties: { tabColor: { argb: 'FF1D9E75' } } })
  resume.columns = [{ width: 30 }, { width: 20 }, { width: 20 }, { width: 20 }]

  // En-tête boutique
  resume.mergeCells('A1:D1')
  const titre = resume.getCell('A1')
  titre.value = `Rapport commercial — ${boutique.nom}`
  titre.font = { bold: true, size: 16, color: { argb: 'FF1D9E75' } }
  titre.alignment = { horizontal: 'center' }

  resume.mergeCells('A2:D2')
  const sousTitre = resume.getCell('A2')
  sousTitre.value = `Période : ${periode} | Généré le ${new Date().toLocaleDateString('fr-FR')}`
  sousTitre.font = { size: 11, color: { argb: 'FF6b6b65' } }
  sousTitre.alignment = { horizontal: 'center' }

  resume.addRow([])

  // Stats clés
  const totalVentes = commandes.filter(c => c.statut !== 'annulee').reduce((s, c) => s + Number(c.total), 0)
  const nbCommandes = commandes.filter(c => c.statut !== 'annulee').length
  const nbAnnulees = commandes.filter(c => c.statut === 'annulee').length
  const panier = nbCommandes > 0 ? totalVentes / nbCommandes : 0

  const statsHeader = resume.addRow(['Indicateur', 'Valeur'])
  statsHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D9E75' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.border = { bottom: { style: 'thin' } }
  })

  const stats = [
    ['Total des ventes', `${totalVentes.toLocaleString('fr-FR')} FCFA`],
    ['Nombre de commandes', nbCommandes],
    ['Commandes annulées', nbAnnulees],
    ['Panier moyen', `${Math.round(panier).toLocaleString('fr-FR')} FCFA`],
    ['Produits en catalogue', produits.length],
    ['Produits en rupture', produits.filter(p => p.stock_total <= p.stock_alerte).length],
  ]
  stats.forEach(([label, val]) => {
    const row = resume.addRow([label, val])
    row.getCell(1).font = { color: { argb: 'FF1a1a18' } }
    row.getCell(2).font = { bold: true }
    row.eachCell(cell => { cell.border = { bottom: { style: 'hair', color: { argb: 'FFe8e8e2' } } } })
  })

  // ── Feuille 2 : Commandes ──
  const shCmd = wb.addWorksheet('Commandes')
  shCmd.columns = [
    { header: '#', key: 'ref', width: 10 },
    { header: 'Client', key: 'client', width: 22 },
    { header: 'Téléphone', key: 'tel', width: 16 },
    { header: 'Total (FCFA)', key: 'total', width: 16 },
    { header: 'Statut', key: 'statut', width: 14 },
    { header: 'Source', key: 'source', width: 12 },
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Mode paiement', key: 'paiement', width: 18 },
  ]

  // Style en-tête
  shCmd.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D9E75' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center' }
  })

  commandes.forEach((c, i) => {
    const row = shCmd.addRow({
      ref: c.id.slice(-6).toUpperCase(),
      client: c.client_nom || '—',
      tel: c.client_tel || '—',
      total: Number(c.total),
      statut: c.statut,
      source: c.live_id ? 'Live' : 'Boutique',
      date: new Date(c.date).toLocaleDateString('fr-FR'),
      paiement: c.mode_paiement || '—',
    })
    // Couleur alternée
    if (i % 2 === 0) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F0' } } })
    // Couleur statut
    const statusColors = { livree: 'FF1D9E75', en_attente: 'FFBA7517', annulee: 'FF993C1D', confirmee: 'FF185FA5' }
    const statusCell = row.getCell('statut')
    if (statusColors[c.statut]) statusCell.font = { bold: true, color: { argb: statusColors[c.statut] } }
    row.getCell('total').numFmt = '#,##0'
  })

  shCmd.autoFilter = { from: 'A1', to: 'H1' }

  // ── Feuille 3 : Stock produits ──
  const shProd = wb.addWorksheet('Produits & Stock')
  shProd.columns = [
    { header: 'Produit', key: 'nom', width: 28 },
    { header: 'Catégorie', key: 'cat', width: 16 },
    { header: 'Prix (FCFA)', key: 'prix', width: 14 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Seuil alerte', key: 'alerte', width: 14 },
    { header: 'Statut', key: 'statut', width: 14 },
  ]
  shProd.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D9E75' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  })
  produits.forEach((p, i) => {
    const faible = p.stock_total <= p.stock_alerte
    const row = shProd.addRow({
      nom: p.nom,
      cat: p.categorie || '—',
      prix: Number(p.prix),
      stock: p.stock_total,
      alerte: p.stock_alerte,
      statut: faible ? '⚠ Stock faible' : '✅ OK',
    })
    if (i % 2 === 0) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F0' } } })
    if (faible) {
      row.getCell('statut').font = { bold: true, color: { argb: 'FFBA7517' } }
      row.getCell('stock').font = { bold: true, color: { argb: 'FFBA7517' } }
    }
    row.getCell('prix').numFmt = '#,##0'
  })

  return wb
}

// ─────────────────────────────────────────
// PDF
// ─────────────────────────────────────────
export function genererPDF({ boutique, commandes, produits, periode }, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  doc.pipe(res)

  const totalVentes = commandes.filter(c => c.statut !== 'annulee').reduce((s, c) => s + Number(c.total), 0)
  const nbCommandes = commandes.filter(c => c.statut !== 'annulee').length

  // ── En-tête ──
  doc.rect(0, 0, doc.page.width, 90).fill('#1D9E75')
  doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('Headsit', 50, 25)
  doc.fontSize(11).font('Helvetica').text(`Rapport commercial — ${boutique.nom}`, 50, 55)
  doc.fontSize(9).text(`Période : ${periode} | ${new Date().toLocaleDateString('fr-FR')}`, 50, 72)
  doc.moveDown(3)

  // ── Stats clés ──
  doc.fillColor('#1a1a18').fontSize(13).font('Helvetica-Bold').text('Résumé', 50, 110)
  doc.moveTo(50, 128).lineTo(545, 128).strokeColor('#e8e8e2').lineWidth(1).stroke()

  const stats = [
    ['Total des ventes', `${totalVentes.toLocaleString('fr-FR')} FCFA`],
    ['Commandes validées', `${nbCommandes}`],
    ['Panier moyen', `${nbCommandes > 0 ? Math.round(totalVentes / nbCommandes).toLocaleString('fr-FR') : 0} FCFA`],
    ['Produits en catalogue', `${produits.length}`],
  ]

  let y = 140
  stats.forEach(([label, val], i) => {
    if (i % 2 === 0) doc.rect(50, y - 4, 495, 22).fill('#f5f5f0')
    doc.fillColor('#6b6b65').fontSize(10).font('Helvetica').text(label, 60, y)
    doc.fillColor('#1D9E75').font('Helvetica-Bold').text(val, 350, y, { align: 'right', width: 185 })
    y += 22
  })

  // ── Tableau commandes ──
  y += 20
  doc.fillColor('#1a1a18').fontSize(13).font('Helvetica-Bold').text('Dernières commandes', 50, y)
  y += 18
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e8e8e2').stroke()
  y += 8

  // En-tête tableau
  doc.rect(50, y, 495, 18).fill('#1D9E75')
  const cols = [60, 170, 310, 390, 470]
  const headers = ['Client', 'Produits', 'Total', 'Statut', 'Date']
  headers.forEach((h, i) => {
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text(h, cols[i], y + 4)
  })
  y += 18

  commandes.slice(0, 20).forEach((c, i) => {
    if (y > 720) { doc.addPage(); y = 50 }
    if (i % 2 === 0) doc.rect(50, y, 495, 16).fill('#f9f9f6')
    const statusColor = { livree: '#1D9E75', en_attente: '#BA7517', annulee: '#993C1D', confirmee: '#185FA5' }
    doc.fillColor('#1a1a18').fontSize(8).font('Helvetica').text(c.client_nom || '—', cols[0], y + 3, { width: 100, ellipsis: true })
    doc.text(`${Number(c.total).toLocaleString('fr-FR')} F`, cols[2], y + 3, { width: 75 })
    doc.fillColor(statusColor[c.statut] || '#666').text(c.statut, cols[3], y + 3, { width: 75 })
    doc.fillColor('#6b6b65').text(new Date(c.date).toLocaleDateString('fr-FR'), cols[4], y + 3)
    y += 16
  })

  // ── Footer ──
  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill('#f5f5f0')
  doc.fillColor('#6b6b65').fontSize(8).font('Helvetica')
    .text(`Généré par Headsit · ${new Date().toLocaleString('fr-FR')}`, 50, doc.page.height - 26)

  doc.end()
}
