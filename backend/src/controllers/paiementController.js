// src/controllers/paiementController.js

import pool from "../config/database.js";
import {
  initierPaiementCinetPay,
  initierPaiementWave,
  validerWebhookCinetPay,
  validerWebhookWave,
  verifierStatutCinetPay,
} from "../services/paiementService.js";

/**
 * Met à jour le statut d'une commande et de son paiement.
 * @private
 */
async function confirmerPaiementCommande(
  commande_id,
  provider,
  transaction_id,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Mettre à jour le statut de la commande
    const { rows } = await client.query(
      `UPDATE commandes SET statut = 'confirmee', mode_paiement = $1, transaction_id = $2 WHERE id = $3 RETURNING *`,
      [provider, transaction_id, commande_id],
    );

    if (rows.length === 0) {
      throw new Error(`Commande ${commande_id} non trouvée.`);
    }

    // On pourrait aussi créer une entrée dans une table 'paiements'
    // await client.query('INSERT INTO paiements (...)');

    await client.query("COMMIT");
    console.log(`✅ Paiement confirmé pour la commande ${commande_id}`);

    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(
      `Erreur lors de la confirmation de la commande ${commande_id}:`,
      err,
    );
    throw err;
  } finally {
    client.release();
  }
}

/**
 * POST /api/paiements/initier
 * Initialise une session de paiement pour une commande.
 */
export const initierPaiement = async (req, res) => {
  const { commande_id, provider } = req.body;
  if (!commande_id || !provider) {
    return res
      .status(400)
      .json({ message: "commande_id et provider sont requis." });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM commandes WHERE id = $1", [
      commande_id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Commande non trouvée." });
    }
    const commande = rows[0];

    let resultatPaiement;
    if (provider === "wave") {
      resultatPaiement = await initierPaiementWave({
        commande_id: commande.id,
        montant: commande.total,
      });
    } else {
      // CinetPay par défaut
      resultatPaiement = await initierPaiementCinetPay({
        commande_id: commande.id,
        montant: commande.total,
        client_nom: commande.client_nom,
        client_tel: commande.client_tel,
      });
    }

    res.json(resultatPaiement);
  } catch (err) {
    console.error("Erreur d'initialisation du paiement:", err);
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
};

/**
 * POST /api/paiements/webhook/cinetpay
 * Reçoit la notification de paiement de CinetPay.
 */
export const webhookCinetPay = async (req, res) => {
  const { cpm_trans_id, cpm_custom } = req.body;

  try {
    const estValide = await validerWebhookCinetPay(req.body);
    if (estValide) {
      const metadata = JSON.parse(cpm_custom || "{}");
      await confirmerPaiementCommande(
        metadata.commande_id,
        "cinetpay",
        cpm_trans_id,
      );
    } else {
      console.warn("Webhook CinetPay non valide reçu:", req.body);
    }
  } catch (err) {
    console.error("Erreur traitement webhook CinetPay:", err);
    // On répond 200 pour éviter que CinetPay ne réessaie indéfiniment
  }

  res.status(200).send("OK");
};

// Note : Le webhook Wave n'est pas implémenté ici car Wave recommande
// de se baser sur la redirection `success_url` qui est plus fiable.
// Si vous avez besoin d'un webhook Wave, il faudrait l'ajouter ici.

/**
 * POST /api/paiements/webhook/wave
 * Reçoit la notification de paiement de Wave (si configuré).
 */
export const webhookWave = async (req, res) => {
  try {
    const signature =
      req.headers["x-wave-signature"] ||
      req.headers["x-wave-signature".toLowerCase()];
    const rawBody =
      typeof req.rawBody === "string"
        ? req.rawBody
        : JSON.stringify(req.body || {});

    const estValide = validerWebhookWave(rawBody, signature || "");
    if (estValide) {
      const commande_id =
        req.body?.client_reference ||
        req.body?.client_reference_id ||
        req.body?.metadata?.client_reference ||
        null;
      const transaction_id = req.body?.id || req.body?.transaction_id || null;
      if (commande_id) {
        await confirmerPaiementCommande(
          commande_id,
          "wave",
          transaction_id || "",
        );
        console.log(
          `✅ Paiement Wave confirmé pour la commande ${commande_id}`,
        );
      } else {
        console.warn(
          "Webhook Wave valide mais commande non trouvée dans le payload:",
          req.body,
        );
      }
    } else {
      console.warn("Webhook Wave non valide reçu:", req.body);
    }
  } catch (err) {
    console.error("Erreur traitement webhook Wave:", err);
  }

  // Toujours répondre 200 pour éviter des retries excessifs
  res.status(200).send("OK");
};

/**
 * GET /api/paiements/verifier/:transaction_id
 * Vérifie le statut d'une transaction (CinetPay) et confirme la commande si payée.
 */
export const verifierPaiement = async (req, res) => {
  const { transaction_id } = req.params;
  if (!transaction_id)
    return res.status(400).json({ message: "transaction_id requis" });

  try {
    const statut = await verifierStatutCinetPay(transaction_id);
    const statusCode = statut?.data?.status;
    if (statusCode === "ACCEPTED") {
      // tenter de récupérer la commande depuis les metadata
      let metadata = {};
      try {
        metadata = JSON.parse(statut.data?.metadata || "{}");
      } catch (e) {
        metadata = {};
      }
      const commande_id =
        metadata.commande_id || metadata.client_reference || null;
      if (commande_id) {
        await confirmerPaiementCommande(
          commande_id,
          "cinetpay",
          transaction_id,
        );
        return res.json({ ok: true, status: statusCode });
      }
      return res.json({
        ok: false,
        status: statusCode,
        message: "Transaction acceptée mais metadata commande introuvable",
      });
    }

    return res.json({ ok: false, status: statusCode || "UNKNOWN" });
  } catch (err) {
    console.error("Erreur vérification paiement:", err);
    return res.status(500).json({ message: err.message || "Erreur serveur" });
  }
};
