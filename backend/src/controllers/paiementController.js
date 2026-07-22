// src/controllers/paiementController.js
import pool from '../config/database.js'
import { initierPaiementCinetPay, initierPaiementWave, verifierStatutCinetPay, validerSignatureCinetPay } from '../services/paiementService.js'

// POST /api/paiements/initier
export const initierPaiement = async (req, res) => {
  const { commande_id, provider = 'cinetpay' } = req.body
  if (!commande_id) return res.status(400).json({ message: 'commande_id requis' })

  try {
    const cmdRes = await pool.query(
      'SELECT * FROM commandes WHERE id = $1 AND boutique_id = $2',
      [commande_id, req.user.boutique_id]
    )
    if (!cmdRes.rows.length) return res.status(404).json({ message: 'Commande introuvable' })
    const commande = cmdRes.rows[0]

    let resultat
    if (provider === 'wave') {
      resultat = await initierPaiementWave({
        commande_id, montant: commande.total, client_tel: commande.client_tel
      })
    } else {
      resultat = await initierPaiementCinetPay({
        commande_id, montant: commande.total,
        client_nom: commande.client_nom, client_tel: commande.client_tel,
        description: `Commande Headsit #${commande.id.slice(-6)}`
      })
    }

    // Enregistrer la transaction en attente
    await pool.query(
      `INSERT INTO transactions (boutique_id, type, montant, description)
       VALUES ($1, 'paiement_initie', $2, $3)`,
      [req.user.boutique_id, commande.total, `${provider}:${resultat.transaction_id}`]
    )

    res.json(resultat)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err.message || 'Erreur paiement' })
  }
}

// POST /api/paiements/webhook/cinetpay  (appelé par CinetPay après paiement)
export const webhookCinetPay = async (req, res) => {
  res.status(200).send('OK') // Répondre vite

  if (!validerSignatureCinetPay(req.body, req.headers['x-token'])) {
    console.warn('Webhook CinetPay : signature invalide')
    return
  }

  const { transaction_id, payment_method, status } = req.body
  if (status !== 'ACCEPTED') return

  try {
    // Retrouver la commande depuis la transaction_id
    // Format: HEADSIT_{commande_id}_{timestamp}
    const parts = transaction_id.split('_')
    const commande_id = parts.slice(1, -1).join('_')

    // Marquer la commande comme payée
    await pool.query(
      `UPDATE commandes SET statut = 'confirmee', mode_paiement = $1 WHERE id = $2`,
      [payment_method, commande_id]
    )

    // Enregistrer la transaction
    const cmdRes = await pool.query('SELECT * FROM commandes WHERE id = $1', [commande_id])
    if (cmdRes.rows.length) {
      const cmd = cmdRes.rows[0]
      await pool.query(
        `INSERT INTO transactions (boutique_id, type, montant, description)
         VALUES ($1, 'entree', $2, $3)`,
        [cmd.boutique_id, cmd.total, `Paiement ${payment_method} — Commande #${commande_id.slice(-6)}`]
      )
    }

    console.log(`✅ Paiement confirmé — commande ${commande_id} via ${payment_method}`)
  } catch (err) {
    console.error('Erreur webhook CinetPay:', err)
  }
}

// POST /api/paiements/webhook/wave
export const webhookWave = async (req, res) => {
  res.status(200).send('OK')
  const { type, data } = req.body
  if (type !== 'checkout.session.completed') return

  try {
    const commande_id = data.client_reference
    await pool.query(
      `UPDATE commandes SET statut = 'confirmee', mode_paiement = 'wave' WHERE id = $1`,
      [commande_id]
    )
    const cmdRes = await pool.query('SELECT * FROM commandes WHERE id = $1', [commande_id])
    if (cmdRes.rows.length) {
      const cmd = cmdRes.rows[0]
      await pool.query(
        `INSERT INTO transactions (boutique_id, type, montant, description) VALUES ($1,'entree',$2,$3)`,
        [cmd.boutique_id, cmd.total, `Paiement Wave — Commande #${commande_id.slice(-6)}`]
      )
    }
  } catch (err) {
    console.error('Erreur webhook Wave:', err)
  }
}

// GET /api/paiements/verifier/:transaction_id
export const verifierPaiement = async (req, res) => {
  try {
    const data = await verifierStatutCinetPay(req.params.transaction_id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: 'Erreur vérification' })
  }
}
