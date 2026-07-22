// src/controllers/webhookController.js
// Reçoit les commentaires Facebook / Instagram en temps réel via Webhooks

import pool from '../config/database.js'
import { analyserCommentaire, genererReponse } from '../services/commentParser.js'

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'headsit_verify_2026'

// GET /api/webhooks/facebook — Vérification du webhook par Facebook
export const verifierWebhookFacebook = (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook Facebook vérifié')
    return res.status(200).send(challenge)
  }
  res.status(403).json({ message: 'Token invalide' })
}

// POST /api/webhooks/facebook — Réception des commentaires Facebook Live
export const recevoirCommentaireFacebook = async (req, res) => {
  const body = req.body
  res.status(200).send('EVENT_RECEIVED') // Répondre vite à Facebook

  if (body.object !== 'page') return

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'live_videos' && change.field !== 'feed') continue

      const val = change.value
      if (val.item !== 'comment') continue

      const commentaire = {
        auteur: val.from?.name || 'Inconnu',
        auteur_id: val.from?.id,
        texte: val.message || '',
        plateforme: 'facebook',
        timestamp: new Date(val.created_time * 1000)
      }

      await traiterCommentaire(commentaire, req.io)
    }
  }
}

// POST /api/webhooks/instagram — Réception des commentaires Instagram Live
export const recevoirCommentaireInstagram = async (req, res) => {
  const body = req.body
  res.status(200).send('EVENT_RECEIVED')

  if (body.object !== 'instagram') return

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'comments') continue

      const val = change.value
      const commentaire = {
        auteur: val.from?.username || 'Inconnu',
        auteur_id: val.from?.id,
        texte: val.text || '',
        plateforme: 'instagram',
        timestamp: new Date()
      }

      await traiterCommentaire(commentaire, req.io)
    }
  }
}

// POST /api/webhooks/simuler — Simuler un commentaire (pour les tests)
export const simulerCommentaire = async (req, res) => {
  const { boutique_id, texte, auteur } = req.body
  if (!boutique_id || !texte) return res.status(400).json({ message: 'boutique_id et texte requis' })

  const commentaire = {
    auteur: auteur || 'Client Test',
    auteur_id: 'test_' + Date.now(),
    texte,
    plateforme: 'simulation',
    timestamp: new Date(),
    boutique_id
  }

  const resultat = await traiterCommentaire(commentaire, req.io)
  res.json(resultat)
}

// Fonction principale : analyse + création commande auto si détectée
async function traiterCommentaire(commentaire, io) {
  try {
    // Trouver le live actif
    const liveResult = await pool.query(
      `SELECT l.*, b.id as boutique_id FROM lives l
       JOIN boutiques b ON b.id = l.boutique_id
       WHERE l.fin IS NULL
       ${commentaire.boutique_id ? 'AND l.boutique_id = $1' : ''}
       ORDER BY l.debut DESC LIMIT 1`,
      commentaire.boutique_id ? [commentaire.boutique_id] : []
    )

    if (!liveResult.rows.length) return { ignoré: true, raison: 'Aucun live actif' }

    const live = liveResult.rows[0]

    // Récupérer les produits de la boutique
    const produits = await pool.query(
      'SELECT * FROM produits WHERE boutique_id = $1 AND actif = true AND stock_total > 0',
      [live.boutique_id]
    )

    // Analyser le commentaire
    const analyse = analyserCommentaire(commentaire.texte, produits.rows)

    // Émettre le commentaire à tous les clients du live
    const payload = {
      ...commentaire,
      analyse,
      reponse_suggeree: genererReponse(analyse, analyse.produit_detecte)
    }
    io?.to(`live_${live.id}`).emit('commentaire', payload)

    // Si c'est une commande détectée avec haute confiance → créer automatiquement
    if (analyse.est_commande && analyse.produit_detecte && analyse.confiance === 'haute') {
      const produit = analyse.produit_detecte

      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const zone = commentaire.zone || 'À définir'
        const adresse = commentaire.adresse || 'À définir'
        const livreur = commentaire.livreur || 'À assigner'

        const cmd = await client.query(
          `INSERT INTO commandes (boutique_id, live_id, client_nom, statut, total, mode_paiement, client_tel, date)
           VALUES ($1, $2, $3, 'en_attente', $4, 'a_definir', $5, NOW()) RETURNING *`,
          [live.boutique_id, live.id, commentaire.auteur, produit.prix * analyse.quantite, commentaire.auteur_id || '']
        )

        await client.query(
          `INSERT INTO lignes_commande (commande_id, produit_id, quantite, prix_unitaire)
           VALUES ($1, $2, $3, $4)`,
          [cmd.rows[0].id, produit.id, analyse.quantite, produit.prix]
        )

        await client.query(
          'UPDATE produits SET stock_total = stock_total - $1 WHERE id = $2',
          [analyse.quantite, produit.id]
        )

        await client.query('COMMIT')

        // Notifier la nouvelle commande
        io?.to(`live_${live.id}`).emit('nouvelle_commande', {
          ...cmd.rows[0],
          produit: produit.nom,
          quantite: analyse.quantite,
          client: commentaire.auteur,
          zone,
          adresse,
          livreur
        })

        return { commande_cree: true, commande: cmd.rows[0] }
      } catch (err) {
        await client.query('ROLLBACK')
        console.error('Erreur création commande:', err)
      } finally {
        client.release()
      }
    }

    return { commentaire_traite: true, est_commande: analyse.est_commande }
  } catch (err) {
    console.error('Erreur traitement commentaire:', err)
    return { erreur: err.message }
  }
}
